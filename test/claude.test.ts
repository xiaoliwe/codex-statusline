import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { installClaudeBridge, uninstallClaudeBridge } from "../src/claude.js";

function withTempClaudeHome(callback: (claudeHome: string) => void): void {
  const previous = process.env.CODEX_STATUSLINE_CLAUDE_HOME;
  const claudeHome = fs.mkdtempSync(path.join(os.tmpdir(), "codex-statusline-claude-"));

  process.env.CODEX_STATUSLINE_CLAUDE_HOME = claudeHome;

  try {
    callback(claudeHome);
  } finally {
    if (previous === undefined) {
      delete process.env.CODEX_STATUSLINE_CLAUDE_HOME;
    } else {
      process.env.CODEX_STATUSLINE_CLAUDE_HOME = previous;
    }
    fs.rmSync(claudeHome, { force: true, recursive: true });
  }
}

test("installClaudeBridge points settings to the configured Claude home", () => {
  withTempClaudeHome((claudeHome) => {
    const result = installClaudeBridge();
    const settings = JSON.parse(
      fs.readFileSync(path.join(claudeHome, "settings.json"), "utf8"),
    ) as {
      statusLine?: { command?: string; type?: string };
    };

    assert.equal(result.settingsPath, path.join(claudeHome, "settings.json"));
    assert.equal(result.statuslinePath, path.join(claudeHome, "statusline.sh"));
    assert.deepEqual(settings.statusLine, {
      command: `bash '${path.join(claudeHome, "statusline.sh")}'`,
      type: "command",
    });
  });
});

test("uninstallClaudeBridge removes only the managed statusLine command", () => {
  withTempClaudeHome((claudeHome) => {
    installClaudeBridge();
    uninstallClaudeBridge();

    const settings = JSON.parse(
      fs.readFileSync(path.join(claudeHome, "settings.json"), "utf8"),
    ) as Record<string, unknown>;

    assert.equal("statusLine" in settings, false);
  });
});
