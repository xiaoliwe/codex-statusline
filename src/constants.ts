import os from "node:os";
import path from "node:path";

export const SUPPORTED_STATUSLINE_ITEMS = [
  "model-name",
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
  "session-id",
  "codex-version",
  "reasoning",
] as const;

export type StatusLineItem = (typeof SUPPORTED_STATUSLINE_ITEMS)[number];

export const MANAGED_COMMENT = "# codex-statusline managed";

export function resolveConfigPath(): string {
  return process.env.CODEX_STATUSLINE_CONFIG_PATH || path.join(os.homedir(), ".codex", "config.toml");
}

export function resolveStateDir(): string {
  return process.env.CODEX_STATUSLINE_HOME || path.join(os.homedir(), ".codex", "codex-statusline");
}

export function resolveStateFile(): string {
  return path.join(resolveStateDir(), "state.json");
}

export function resolveBackupFile(): string {
  return path.join(resolveStateDir(), "config.toml.bak");
}

export function resolveUsageCachePath(): string {
  return process.env.CODEX_STATUSLINE_USAGE_CACHE || path.join(os.tmpdir(), "codex-statusline", "claude-usage-cache.json");
}
