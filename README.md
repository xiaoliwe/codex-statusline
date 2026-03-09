# codex-statusline

Codex native preset manager plus a Claude-style rich statusline renderer.

It does two things:

- manages `tui.status_line` presets in `~/.codex/config.toml`
- installs a Claude-compatible command statusline into `~/.claude/statusline.sh`

## Install

```bash
npm install
npm run build
npx codex-statusline install
```

For local repo development, use `node bin/codex-statusline.js ...`.
`install` now defaults to the full `complete` Codex preset and also installs the Claude-style rich multi-line statusline bridge.

## Commands

```bash
npx codex-statusline install
npx codex-statusline install --preset complete
npx codex-statusline current
npx codex-statusline uninstall
npx codex-statusline presets
npx codex-statusline sample | npx codex-statusline render-rich
npx codex-statusline install-claude
```

## Presets

- `compact`: narrow terminals
- `balanced`: lighter default if you want less noise
- `dense`: wide terminals and heavy sessions
- `complete`: default install preset; all native Codex footer fields, including token counters, session id, reasoning, and version

## Claude-Style Renderer

`render-rich` reads JSON from stdin and renders a multi-line ANSI statusline with model, context usage, explicit token counters, git state, session metadata, reasoning effort, Codex version, and usage bars. If no `usage` block is provided, it can reuse cached Claude usage data or fetch it from Anthropic using local Claude credentials.

## Release Checklist

```bash
npm run check
npm test
npm run pack:dry-run
```

The published package ships `bin/`, compiled `dist/`, `README.md`, `LICENSE`, and `AGENTS.md`.

## Safe Local Testing

Use temp directories instead of your real config:

```bash
CODEX_STATUSLINE_HOME=/tmp/codex-statusline-state \
CODEX_STATUSLINE_CONFIG_PATH=/tmp/config.toml \
codex-statusline install --preset balanced

CODEX_STATUSLINE_CLAUDE_HOME=/tmp/fake-claude \
codex-statusline install-claude
```
