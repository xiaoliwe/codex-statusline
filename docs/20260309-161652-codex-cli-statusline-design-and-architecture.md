# Codex CLI Statusline 设计稿与实现技术架构

## 1. 文档信息

- 时间: 2026-03-09 16:16:52
- 业务领域: Codex CLI / Terminal UX
- 功能说明: Statusline 设计稿与实现技术架构
- 目标仓库: `codex-statusline`
- 评估基线:
  - Claude 现有脚本版状态栏实现
  - Codex CLI `0.112.0`

## 2. 目标定义

本项目目标不是简单“把 Claude 的 shell 脚本搬过来”，而是在 Codex CLI 的能力边界内，做出一套尽可能接近 Claude 版信息密度与视觉层级的状态栏方案，并给出后续增强路径。

目标分两级:

1. `V1 原生版`
   - 不修改 Codex 源码
   - 基于 Codex 原生 `tui.status_line` 能力实现
   - 追求信息等价和合理布局，而不是 1:1 复刻

2. `V2 增强版`
   - 允许 fork / patch Codex CLI
   - 支持更接近 Claude 风格的 UI/UX、显示逻辑和多行布局

## 3. Claude 版现状摘要

Claude 版状态栏实现依赖 Claude 的“命令型 statusline”扩展点:

- 安装器将脚本复制到 `~/.claude/statusline.sh`
- 设置 `settings.json` 中的 `statusLine.type = "command"`
- Claude 在渲染时向脚本 stdin 注入 JSON
- 脚本动态拼装 ANSI 文本并输出

Claude 版的核心显示逻辑分为两层:

### 3.1 第一行: 会话即时态

- 模型名
- 当前上下文占用百分比
- 当前目录
- Git branch + dirty 标记
- Session 已运行时长
- Thinking 开关状态

### 3.2 第二层: 配额与周期性信息

- 5 小时额度使用率
- 7 天额度使用率
- Extra usage 美元额度
- Reset 时间
- 使用圆点进度条和颜色阈值表达压力等级

### 3.3 Claude 版的重要技术特征

- 外部命令驱动
- 支持多行输出
- 完全自定义 ANSI 样式
- 允许脚本自己取数、缓存、容错
- 显示字段不受 CLI 内建 item 集限制

## 4. Codex 当前能力边界

根据 OpenAI 官方文档与本机配置，Codex 当前公开能力是:

- 通过 `/statusline` 交互式选择 footer items
- 通过 `~/.codex/config.toml` 的 `tui.status_line` 配置显示项顺序
- 支持的 item 包括 model、reasoning、context stats、rate limits、git branch、tokens、session id、directory、version 等

但当前公开接口没有证据表明支持以下能力:

- 外部 command 生成 statusline
- 自定义 item provider
- 多行 footer
- 自定义 ANSI 渲染逻辑
- 自定义进度条图形
- 任意附加字段的脚本取数注入

结论:

- `信息型复现`: 可行
- `布局型 1:1 复现`: 当前原生接口不可行
- `源码级增强复现`: 可行，但维护成本较高

## 5. 设计原则

### 5.1 产品原则

- 优先信息密度，而不是强行模拟 Claude 的视觉细节
- 优先原生可维护性，而不是短期 hack
- 明确“原生可实现”和“需要 fork”的边界
- 状态栏只承载高频、短读、即时决策信息

### 5.2 UX 原则

- 单行优先，降低 footer 抢占终端垂直空间
- 左到右遵循“当前会话态 -> 资源压力 -> 环境态”
- 压力型指标靠前展示
- 低价值重复字段收敛，避免把 footer 做成调试面板

## 6. Codex 版状态栏设计稿

## 6.1 V1 原生版设计稿

### 推荐展示顺序

```toml
[tui]
status_line = [
  "model-with-reasoning",
  "context-used",
  "context-window-size",
  "context-remaining",
  "five-hour-limit",
  "weekly-limit",
  "git-branch",
  "project-root",
  "used-tokens",
  "total-input-tokens"
]
```

### 设计说明

- `model-with-reasoning`
  - 保留“当前模型 + reasoning 状态”这一核心识别点
  - 对应 Claude 第一段 `model + thinking` 的一部分价值

- `context-used + context-window-size + context-remaining`
  - 替代 Claude 的 `✍ pct_used`
  - 原生 Codex 无法完全复现百分比视觉，但能更精确表达剩余额度

- `five-hour-limit + weekly-limit`
  - 这是 Claude 第二层里最有价值的能力
  - Codex 原生已有，优先保留

- `git-branch + project-root`
  - 替代 Claude 的目录 + branch 组合
  - 原生一般只有 branch，没有 dirty 星标

- `used-tokens + total-input-tokens`
  - 用于细粒度调试和重负载任务判断
  - 与 context 项略有重叠，但对重度用户仍然有价值

### 原生版目标 UX

单行状态栏从左到右表达:

`我当前在用什么模型` -> `上下文还剩多少` -> `短周期和周周期额度压力如何` -> `我在哪个仓库哪个分支` -> `当前 token 消耗有多大`

### 原生版放弃项

V1 不追求以下 Claude 特性:

- 多行配额区
- 圆点进度条
- session elapsed
- thinking 开关图标
- git dirty `*`
- extra usage 美元额度
- 自定义颜色阈值

## 6.2 V1 可选预设

为了满足不同用户偏好，建议内置三个预设:

### `preset-compact`

适合小终端宽度:

```toml
[tui]
status_line = [
  "model-with-reasoning",
  "context-remaining",
  "five-hour-limit",
  "git-branch",
  "project-root"
]
```

### `preset-balanced`

默认推荐:

```toml
[tui]
status_line = [
  "model-with-reasoning",
  "context-used",
  "context-remaining",
  "five-hour-limit",
  "weekly-limit",
  "git-branch",
  "project-root",
  "used-tokens"
]
```

### `preset-dense`

适合大屏和高频重度用户:

```toml
[tui]
status_line = [
  "model-with-reasoning",
  "context-used",
  "context-window-size",
  "context-remaining",
  "five-hour-limit",
  "weekly-limit",
  "git-branch",
  "project-root",
  "used-tokens",
  "total-input-tokens",
  "codex-version"
]
```

## 7. Claude -> Codex 能力映射

| Claude 字段 | Codex 原生替代 | 可实现性 | 说明 |
| --- | --- | --- | --- |
| 模型名 | `model-name` / `model-with-reasoning` | 高 | 原生支持 |
| thinking 状态 | `model-with-reasoning` 近似替代 | 中 | 不是独立 thinking toggle |
| context 百分比 | `context-used` + `context-remaining` | 中 | 能表达容量，不能 1:1 表达百分比样式 |
| 当前目录 | `project-root` | 高 | 原生支持 |
| git branch | `git-branch` | 高 | 原生支持 |
| git dirty 星标 | 无 | 低 | 原生不支持 |
| session 时长 | `session-id` 仅弱替代 | 低 | 原生不支持 elapsed |
| 5h limit | `five-hour-limit` | 高 | 原生支持 |
| weekly limit | `weekly-limit` | 高 | 原生支持 |
| extra usage | 无 | 低 | 原生不支持 |
| 自定义进度条 | 无 | 低 | 原生不支持 |
| 多行布局 | 无 | 低 | 原生不支持 |

## 8. 实现技术架构

## 8.1 V1 原生版技术架构

V1 不改 Codex 源码，做一个“配置生成器 + 安装器 + 预设管理器”。

### 架构分层

#### A. Preset Layer

职责:

- 定义预设状态栏组合
- 提供 compact / balanced / dense 三组 presets
- 维护 item 标识列表和兼容性说明

建议文件:

- `src/presets.ts`

#### B. Config Layer

职责:

- 读取 `~/.codex/config.toml`
- 解析、合并、写回 `[tui].status_line`
- 保留用户现有配置不被破坏
- 在写入前做备份

建议文件:

- `src/config.ts`

关键要求:

- 幂等写入
- 不覆盖无关配置
- 支持备份恢复

#### C. Installer Layer

职责:

- 提供 CLI 命令
- 安装指定 preset
- 卸载并恢复备份
- 显示当前生效配置

建议文件:

- `src/cli.ts`
- `bin/install.js` 或 `bin/codex-statusline.js`

CLI 示例:

```bash
npx codex-statusline install --preset balanced
npx codex-statusline install --preset dense
npx codex-statusline current
npx codex-statusline uninstall
```

#### D. Compatibility Layer

职责:

- 检测 Codex 版本
- 校验可用 item 标识
- 提示当前版本是否支持指定 preset

建议文件:

- `src/compat.ts`

### V1 数据流

```text
用户执行安装命令
-> 读取 Codex 本地 config.toml
-> 选择 preset
-> 合并生成 [tui].status_line
-> 写入 config.toml
-> 提示用户通过 /statusline 微调
```

### V1 优势

- 实现成本低
- 无需 fork Codex
- 与官方能力保持一致
- 升级风险低

### V1 局限

- 无法做多行 UI
- 无法做脚本取数
- 无法复刻 Claude 的视觉样式
- 无法扩展 extra usage / git dirty / elapsed session

## 8.2 V2 增强版技术架构

V2 的前提是 fork Codex CLI 或向上游贡献能力。

### 目标能力

- 自定义 statusline provider 接口
- command / plugin / internal provider 三类数据源
- 多行 footer renderer
- 自定义 item registry
- ANSI / style token renderer
- 用户自定义脚本输入上下文

### 建议架构

#### A. Statusline Provider API

抽象接口:

```ts
type StatusLineContext = {
  session: {
    id: string;
    startedAt?: string;
  };
  model: {
    name: string;
    reasoning?: string;
  };
  workspace: {
    cwd: string;
    gitBranch?: string;
    gitDirty?: boolean;
  };
  usage: {
    contextUsed?: number;
    contextWindow?: number;
    fiveHourLimit?: number;
    weeklyLimit?: number;
  };
};

type StatusLineProviderResult = {
  lines: string[];
};
```

Provider 类型:

- `builtin`
- `command`
- `plugin`

#### B. Renderer Layer

职责:

- 支持单行和多行 footer
- 支持对齐、裁切、宽度适配
- 支持色彩 token，而不是把 ANSI 逻辑散落在业务代码里

关键点:

- 终端宽度变化时自动裁切
- 宽度不足时自动降级到 compact 模式
- renderer 层负责布局，provider 层只负责数据

#### C. Fetcher Layer

职责:

- 拉取 rate limit / usage 数据
- 做缓存与超时控制
- 管理认证读取逻辑

注意:

- 这一层不应耦合到 renderer
- 若未来 OpenAI 暴露更多 usage endpoint，可单独替换

#### D. Command Provider Layer

职责:

- 允许用户声明:

```toml
[tui.status_line_command]
command = "bash ~/.codex/statusline.sh"
timeout_ms = 500
```

- 将上下文 JSON 传给脚本 stdin
- 接收脚本 stdout 作为渲染内容

这才是 Claude 风格 statusline 的真正对应能力。

### V2 数据流

```text
Codex TUI Tick / Session State Change
-> 聚合当前会话上下文
-> 调用 builtin provider 或 command provider
-> provider 返回 lines[]
-> renderer 做宽度适配与绘制
-> footer 输出到终端
```

### V2 风险

- 需要维护 Codex fork
- 上游 TUI 结构变化时容易冲突
- 认证与 usage 数据接口可能变化
- 多行 footer 可能影响现有 TUI 布局和滚动体验

## 9. 推荐实施路线

### 阶段 1: 先做 V1

交付内容:

- 预设定义
- 配置安装器
- 文档
- 快速切换命令

交付目标:

- 让 Codex 用户马上获得一套高质量、可维护的 statusline preset

### 阶段 2: 观察上游能力变化

关注点:

- OpenAI 是否开放 command-based statusline
- 是否支持自定义 footer items
- 是否支持 session elapsed / git dirty 等新增项

### 阶段 3: 决定是否进入 V2

触发条件:

- 团队明确需要 1:1 Claude 风格
- 愿意接受维护 fork 的成本
- 已经验证原生版不能满足核心需求

## 10. 推荐仓库结构

建议 `codex-statusline` 采用以下结构:

```text
codex-statusline/
  docs/
  src/
    cli.ts
    presets.ts
    config.ts
    compat.ts
    backup.ts
  templates/
    preset-compact.toml
    preset-balanced.toml
    preset-dense.toml
  bin/
    codex-statusline.js
  package.json
  README.md
```

如果未来做 V2:

```text
codex-statusline/
  experimental/
    forked-codex-patch/
    command-provider/
    renderer/
```

## 11. 验收标准

### V1 验收标准

- 可以无损修改 `~/.codex/config.toml`
- 可以切换 3 个预设
- 安装与卸载幂等
- 不破坏用户其他配置项
- 文档清楚说明原生能力边界

### V2 验收标准

- 支持 command-based statusline
- 支持多行输出
- 支持缓存与超时控制
- 窄终端下可自动降级
- 不影响 Codex 主体交互稳定性

## 12. 最终建议

建议明确采用以下策略:

- 产品上: `先做 V1 原生版，不直接承诺 Claude 1:1 复刻`
- 技术上: `把 statusline 项目定义为 Codex preset manager，而不是 Claude shell script 移植项目`
- 架构上: `提前把 V2 的 provider / renderer / fetcher 思路设计好，但不在第一阶段实现`

原因很直接:

- Codex 当前已经原生支持高价值状态项，足够先做一个可靠版本
- 真正难的是“外部脚本驱动 + 多行 ANSI footer”，这不该在没有上游扩展点时硬做
- 先交付可维护的原生版，后续再决定是否投入 fork 成本，路径最稳

## 13. 参考资料

- OpenAI Codex CLI Slash Commands
  - https://developers.openai.com/codex/cli/slash-commands/#configure-footer-items-with-statusline
- OpenAI Codex Config Reference
  - https://developers.openai.com/codex/config-reference/#configtoml
- Claude 现有实现参考
  - `/Users/xiaoli/agentops/xiaolidev/claude-statusline/bin/statusline.sh`
  - `/Users/xiaoli/agentops/xiaolidev/claude-statusline/bin/install.js`
