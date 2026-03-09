import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { resolveUsageCachePath } from "./constants.js";

type JsonValue = Record<string, unknown>;

type UsageBlock = {
  resetsAt?: string;
  utilization?: number;
};

type ExtraUsageBlock = UsageBlock & {
  isEnabled?: boolean;
  monthlyLimit?: number;
  usedCredits?: number;
};

type RenderState = {
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  contextWindowSize: number;
  cwd: string;
  contextRemainingTokens: number;
  contextUsedPercent: number;
  extraUsage?: ExtraUsageBlock;
  fiveHour?: UsageBlock;
  gitBranch: string;
  gitDirty: boolean;
  modelName: string;
  projectRoot: string;
  reasoningEffort?: string;
  sevenDay?: UsageBlock;
  thinking: boolean;
  totalInputTokens: number;
  usedTokens: number;
};

const colors = {
  aqua: "\u001b[38;2;104;214;255m",
  blue: "\u001b[38;2;24;154;255m",
  dim: "\u001b[2m",
  gray: "\u001b[38;2;132;137;168m",
  green: "\u001b[38;2;18;214;111m",
  mint: "\u001b[38;2;130;224;170m",
  magenta: "\u001b[38;2;176;148;255m",
  orange: "\u001b[38;2;255;176;85m",
  red: "\u001b[38;2;255;85;85m",
  reset: "\u001b[0m",
  white: "\u001b[38;2;236;239;244m",
  yellow: "\u001b[38;2;230;200;0m",
};

const separator = ` ${colors.dim}│${colors.reset} `;

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let result = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => {
      result += chunk;
    });
    process.stdin.on("end", () => resolve(result));
    process.stdin.on("error", reject);
  });
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}m`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  return String(value);
}

function formatMetricTokens(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}m`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  }
  return String(value);
}

function resolveClaudeHome(): string {
  return process.env.CODEX_STATUSLINE_CLAUDE_HOME || path.join(os.homedir(), ".claude");
}

function colorForPercent(percent: number): string {
  if (percent >= 90) {
    return colors.red;
  }
  if (percent >= 70) {
    return colors.yellow;
  }
  if (percent >= 50) {
    return colors.orange;
  }
  return colors.green;
}

function clampPercent(percent: number): number {
  return Math.max(0, Math.min(100, percent));
}

function asRecord(value: unknown): JsonValue {
  return value && typeof value === "object" ? (value as JsonValue) : {};
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function maybeIsoDate(value: unknown): string | undefined {
  const result = asString(value);
  return result || undefined;
}

function formatResetTime(
  value: string | undefined,
  style: "time" | "datetime" | "date" = "time",
): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  if (style === "datetime") {
    const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date).toLowerCase();
    const day = String(date.getDate()).toLowerCase();
    return `${month} ${day}, ${formatClock(date)}`;
  }

  if (style === "date") {
    const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date).toLowerCase();
    const day = String(date.getDate()).toLowerCase();
    return `${month} ${day}`;
  }

  return formatClock(date);
}

function formatClock(date: Date): string {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const meridiem = hours >= 12 ? "pm" : "am";
  hours %= 12;
  if (hours === 0) {
    hours = 12;
  }
  return `${hours}:${minutes}${meridiem}`;
}

function formatSessionDuration(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const start = new Date(value).getTime();
  if (Number.isNaN(start)) {
    return undefined;
  }

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
  if (elapsedSeconds >= 3600) {
    return `${Math.floor(elapsedSeconds / 3600)}h${Math.floor((elapsedSeconds % 3600) / 60)}m`;
  }
  if (elapsedSeconds >= 60) {
    return `${Math.floor(elapsedSeconds / 60)}m`;
  }
  return `${elapsedSeconds}s`;
}

function compactModelName(value: string): string {
  return value.replace(/^Claude\s+/i, "").trim() || value;
}

function resolveGitState(cwd: string): { branch: string; dirty: boolean } {
  try {
    const branch = execFileSync("git", ["-C", cwd, "symbolic-ref", "--short", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    const porcelain = execFileSync("git", ["-C", cwd, "status", "--porcelain"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    return { branch, dirty: porcelain.length > 0 };
  } catch {
    return { branch: "", dirty: false };
  }
}

function cacheUsagePayload(payload: unknown): void {
  const cachePath = resolveUsageCachePath();
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(payload));
}

function readCachedUsage(maxAgeSeconds = 60): JsonValue | null {
  const cachePath = resolveUsageCachePath();
  if (!fs.existsSync(cachePath)) {
    return null;
  }

  const stats = fs.statSync(cachePath);
  const ageSeconds = Math.floor((Date.now() - stats.mtimeMs) / 1000);
  if (ageSeconds > maxAgeSeconds) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(cachePath, "utf8")) as JsonValue;
  } catch {
    return null;
  }
}

function readClaudeTokenFromKeychain(): string {
  try {
    const blob = execFileSync("security", ["find-generic-password", "-s", "Claude Code-credentials", "-w"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    if (!blob) {
      return "";
    }

    const parsed = JSON.parse(blob) as JsonValue;
    return asString(asRecord(parsed.claudeAiOauth).accessToken);
  } catch {
    return "";
  }
}

function readClaudeTokenFromFile(): string {
  const credentialsFile = path.join(resolveClaudeHome(), ".credentials.json");
  if (!fs.existsSync(credentialsFile)) {
    return "";
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(credentialsFile, "utf8")) as JsonValue;
    return asString(asRecord(parsed.claudeAiOauth).accessToken);
  } catch {
    return "";
  }
}

async function fetchClaudeUsage(): Promise<JsonValue | null> {
  const cached = readCachedUsage();
  if (cached) {
    return cached;
  }

  const token =
    process.env.CLAUDE_CODE_OAUTH_TOKEN || readClaudeTokenFromKeychain() || readClaudeTokenFromFile();

  if (!token) {
    return null;
  }

  try {
    const response = await fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "codex-statusline/0.1.0",
        "anthropic-beta": "oauth-2025-04-20",
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as JsonValue;
    if (!("five_hour" in payload) && !("seven_day" in payload)) {
      return null;
    }

    cacheUsagePayload(payload);
    return payload;
  } catch {
    return readCachedUsage(3600);
  }
}

async function normalizeState(payload: JsonValue): Promise<RenderState> {
  const model = asRecord(payload.model);
  const contextWindow = asRecord(payload.context_window);
  const currentUsage = asRecord(contextWindow.current_usage);
  const usagePayload = asRecord(payload.usage);
  const session = asRecord(payload.session);
  const settings = asRecord(payload.settings);
  const fetchedUsage =
    Object.keys(usagePayload).length > 0 || process.env.CODEX_STATUSLINE_SKIP_CLAUDE_USAGE === "1"
      ? usagePayload
      : ((await fetchClaudeUsage()) ?? {});

  const cwd = asString(payload.cwd, process.cwd());
  const git = resolveGitState(cwd);

  const inputTokens = asNumber(currentUsage.input_tokens);
  const cacheCreationInputTokens = asNumber(currentUsage.cache_creation_input_tokens);
  const cacheReadInputTokens = asNumber(currentUsage.cache_read_input_tokens);
  const contextWindowSize = asNumber(contextWindow.context_window_size, 200_000);
  const usedTokens = inputTokens + cacheCreationInputTokens + cacheReadInputTokens;
  const totalInputTokens = inputTokens + cacheCreationInputTokens;

  return {
    cacheCreationInputTokens,
    cacheReadInputTokens,
    contextRemainingTokens: Math.max(0, contextWindowSize - usedTokens),
    contextUsedPercent: contextWindowSize > 0 ? Math.floor((usedTokens * 100) / contextWindowSize) : 0,
    contextWindowSize,
    cwd,
    extraUsage: normalizeExtraUsage(asRecord(fetchedUsage.extra_usage)),
    fiveHour: normalizeUsageBlock(asRecord(fetchedUsage.five_hour)),
    gitBranch: git.branch,
    gitDirty: git.dirty,
    modelName: compactModelName(
      asString(model.display_name) ||
        asString(model.name) ||
        asString(payload.model_name) ||
        "Claude",
    ),
    projectRoot: path.basename(cwd),
    reasoningEffort:
      asString(asRecord(payload.reasoning).effort) ||
      asString(settings.reasoningEffort) ||
      asString(model.reasoning_effort) ||
      asString(model.reasoningEffort) ||
      undefined,
    sevenDay: normalizeUsageBlock(asRecord(fetchedUsage.seven_day)),
    thinking:
      asBoolean(payload.thinking) ||
      asBoolean(settings.alwaysThinkingEnabled) ||
      readThinkingFlag(),
    totalInputTokens,
    usedTokens,
  };
}

function formatGitBranch(state: RenderState): string {
  return state.gitBranch ? `${state.gitBranch}${state.gitDirty ? "*" : ""}` : "";
}

function normalizeUsageBlock(block: JsonValue): UsageBlock | undefined {
  if (Object.keys(block).length === 0) {
    return undefined;
  }

  return {
    resetsAt: maybeIsoDate(block.resets_at),
    utilization: asNumber(block.utilization),
  };
}

function normalizeExtraUsage(block: JsonValue): ExtraUsageBlock | undefined {
  if (Object.keys(block).length === 0) {
    return undefined;
  }

  return {
    isEnabled: asBoolean(block.is_enabled),
    monthlyLimit: asNumber(block.monthly_limit),
    resetsAt: maybeIsoDate(block.resets_at),
    usedCredits: asNumber(block.used_credits),
    utilization: asNumber(block.utilization),
  };
}

function readThinkingFlag(): boolean {
  const settingsPath = path.join(resolveClaudeHome(), "settings.json");
  if (!fs.existsSync(settingsPath)) {
    return false;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as JsonValue;
    return asBoolean(parsed.alwaysThinkingEnabled);
  } catch {
    return false;
  }
}

function buildPrimaryLine(state: RenderState): string {
  const branch = formatGitBranch(state);
  const project = branch
    ? `${colors.aqua}${state.projectRoot}${colors.reset} ${colors.mint}(${branch})${colors.reset}`
    : `${colors.aqua}${state.projectRoot}${colors.reset}`;
  const parts = [
    `${colors.blue}${state.modelName}${colors.reset}`,
    `✍️ ${colorForPercent(state.contextUsedPercent)}${state.contextUsedPercent}%${colors.reset}`,
    project,
    state.thinking
      ? `${colors.magenta}◐ thinking${colors.reset}`
      : `${colors.gray}◑ thinking${colors.reset}`,
  ];

  return parts.join(separator);
}

function buildMetricLine(state: RenderState): string {
  return [
    `${colors.white}used-tokens${colors.reset} ${colors.aqua}${formatMetricTokens(state.usedTokens)}${colors.reset}`,
    `${colors.white}total-input-tokens${colors.reset} ${colors.aqua}${formatMetricTokens(state.totalInputTokens)}${colors.reset}`,
    `${colors.white}context-remaining${colors.reset} ${colors.aqua}${formatMetricTokens(state.contextRemainingTokens)}${colors.reset}`,
  ].join(separator);
}

function buildProgressBar(percent: number, width = 8): string {
  const normalized = clampPercent(percent);
  const filled = Math.round((normalized / 100) * width);
  const empty = Math.max(0, width - filled);
  return `${colorForPercent(normalized)}${"▰".repeat(filled)}${colors.gray}${"▱".repeat(empty)}${colors.reset}`;
}

function buildUsageMeter(
  label: string,
  percent: number,
  detail: string | undefined,
  reset: string | undefined,
): string {
  const normalized = Math.round(clampPercent(percent));
  const bar = buildProgressBar(normalized);
  const percentText = `${colorForPercent(normalized)}${normalized}%${colors.reset}`;
  const parts = [`${colors.white}${label}${colors.reset}`, bar, percentText];

  if (detail) {
    parts.push(detail);
  }

  if (reset) {
    parts.push(`${colors.gray}⟳ ${reset}${colors.reset}`);
  }

  return parts.join(" ");
}

function buildUsageFragment(label: string, usage: UsageBlock | undefined, resetStyle: "time" | "datetime"): string | null {
  if (!usage) {
    return null;
  }

  const percent = Math.round(usage.utilization ?? 0);
  const reset = formatResetTime(usage.resetsAt, resetStyle);
  return buildUsageMeter(label, percent, undefined, reset);
}

function buildUsageLine(state: RenderState): string | null {
  const parts = [
    buildUsageFragment("five-hour-limit", state.fiveHour, "time"),
    buildUsageFragment("weekly-limit", state.sevenDay, "datetime"),
    buildExtraUsageFragment(state.extraUsage),
  ].filter((value): value is string => Boolean(value));

  if (parts.length === 0) {
    return null;
  }

  return parts.join(separator);
}

function buildExtraUsageFragment(extraUsage: ExtraUsageBlock | undefined): string | null {
  if (!extraUsage?.isEnabled) {
    return null;
  }

  const used = ((extraUsage.usedCredits ?? 0) / 100).toFixed(2);
  const limit = ((extraUsage.monthlyLimit ?? 0) / 100).toFixed(2);
  const percent = Math.round(extraUsage.utilization ?? 0);
  const detail = `${colorForPercent(percent)}$${used}${colors.reset}${colors.gray}/${colors.reset}${colors.white}$${limit}${colors.reset}`;
  return buildUsageMeter("extra", percent, detail, undefined);
}

export async function renderRichStatusline(input: string): Promise<string> {
  if (!input.trim()) {
    return "Claude";
  }

  const payload = JSON.parse(input) as JsonValue;
  const state = await normalizeState(payload);
  const lines = [buildPrimaryLine(state), buildMetricLine(state)];
  const usageLine = buildUsageLine(state);

  if (usageLine) {
    lines.push(usageLine);
  }

  return lines.join("\n");
}

export async function renderRichStatuslineFromStdin(): Promise<void> {
  const input = await readStdin();
  const rendered = await renderRichStatusline(input);
  process.stdout.write(rendered);
}

export function samplePayload(): string {
  return JSON.stringify(
    {
      cwd: process.cwd(),
      model: { display_name: "Claude Opus 4.1" },
      codex: {
        version: "0.112.0",
      },
      settings: {
        alwaysThinkingEnabled: true,
        reasoningEffort: "high",
      },
      session: {
        id: "sess_demo_1234",
        start_time: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      },
      context_window: {
        context_window_size: 200000,
        current_usage: {
          input_tokens: 82300,
          cache_creation_input_tokens: 2400,
          cache_read_input_tokens: 9100,
        },
      },
      usage: {
        five_hour: {
          utilization: 62,
          resets_at: new Date(Date.now() + 92 * 60 * 1000).toISOString(),
        },
        seven_day: {
          utilization: 34,
          resets_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        },
        extra_usage: {
          is_enabled: true,
          monthly_limit: 5000,
          resets_at: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
          used_credits: 1234,
          utilization: 25,
        },
      },
    },
    null,
    2,
  );
}
