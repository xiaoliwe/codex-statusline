import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

type ClaudeInstallResult = {
  settingsPath: string;
  statuslinePath: string;
  supportDir: string;
};

function quoteShellPath(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function resolveClaudeDir(): string {
  return process.env.CODEX_STATUSLINE_CLAUDE_HOME || path.join(os.homedir(), ".claude");
}

function resolveClaudePaths() {
  const claudeDir = resolveClaudeDir();
  const statuslinePath = path.join(claudeDir, "statusline.sh");

  return {
    claudeDir,
    settingsPath: path.join(claudeDir, "settings.json"),
    statuslineBackupPath: `${statuslinePath}.bak`,
    statuslinePath,
    supportDir: path.join(claudeDir, "codex-statusline"),
  };
}

function buildWrapperScript(cliPath: string): string {
  return `#!/usr/bin/env bash
set -euo pipefail

node "${cliPath}" render-rich "$@"
`;
}

function buildStatusLineCommand(statuslinePath: string): string {
  return `bash ${quoteShellPath(statuslinePath)}`;
}

export function installClaudeBridge(): ClaudeInstallResult {
  const { claudeDir, settingsPath, statuslineBackupPath, statuslinePath, supportDir } = resolveClaudePaths();
  const repoCliPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "cli.js");
  if (!fs.existsSync(repoCliPath)) {
    throw new Error(`Build output not found at ${repoCliPath}. Run "npm run build" first.`);
  }

  fs.mkdirSync(claudeDir, { recursive: true });
  fs.mkdirSync(supportDir, { recursive: true });
  fs.cpSync(path.dirname(repoCliPath), supportDir, { recursive: true });

  if (fs.existsSync(statuslinePath) && !fs.existsSync(statuslineBackupPath)) {
    fs.copyFileSync(statuslinePath, statuslineBackupPath);
  }

  const installedCliPath = path.join(supportDir, "cli.js");
  fs.writeFileSync(statuslinePath, buildWrapperScript(installedCliPath));
  fs.chmodSync(statuslinePath, 0o755);

  const settings = fs.existsSync(settingsPath)
    ? JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<string, unknown>
    : {};

  settings.statusLine = {
    command: buildStatusLineCommand(statuslinePath),
    type: "command",
  };

  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);

  return {
    settingsPath: settingsPath,
    statuslinePath: statuslinePath,
    supportDir: supportDir,
  };
}

export function uninstallClaudeBridge(): ClaudeInstallResult {
  const { settingsPath, statuslineBackupPath, statuslinePath, supportDir } = resolveClaudePaths();
  const installedCommand = buildStatusLineCommand(statuslinePath);
  const result = {
    settingsPath,
    statuslinePath,
    supportDir,
  };

  if (fs.existsSync(statuslineBackupPath)) {
    fs.copyFileSync(statuslineBackupPath, statuslinePath);
    fs.unlinkSync(statuslineBackupPath);
  } else if (fs.existsSync(statuslinePath)) {
    fs.unlinkSync(statuslinePath);
  }

  if (fs.existsSync(supportDir)) {
    fs.rmSync(supportDir, { force: true, recursive: true });
  }

  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
    const statusLine = settings.statusLine as Record<string, unknown> | undefined;
    if (statusLine?.type === "command" && statusLine.command === installedCommand) {
      delete settings.statusLine;
      fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
    }
  }

  return result;
}
