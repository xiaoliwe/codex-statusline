import { execFileSync } from "node:child_process";
import { clearState, ensureBackup, readState, removeBackup, restoreBackup, writeState } from "./backup.js";
import { installClaudeBridge, uninstallClaudeBridge } from "./claude.js";
import { assertPresetCompatible } from "./compat.js";
import { resolveConfigPath } from "./constants.js";
import { extractStatusLineItems, readConfig, removeManagedStatusLine, upsertStatusLine, writeConfig } from "./config.js";
import { detectPreset, getPreset, PRESETS } from "./presets.js";
import { renderRichStatuslineFromStdin, samplePayload } from "./render.js";

type CommandOptions = {
  configPath: string;
  presetName?: string;
};

function parseArgs(argv: string[]): { command: string; options: CommandOptions } {
  const [command = "help", ...rest] = argv;
  const options: CommandOptions = { configPath: resolveConfigPath() };

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (value === "--preset") {
      options.presetName = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--config") {
      options.configPath = rest[index + 1] ?? resolveConfigPath();
      index += 1;
    }
  }

  return { command, options };
}

function printHelp(): void {
  console.log(`codex-statusline

Usage:
  codex-statusline install
  codex-statusline install --preset complete
  codex-statusline current
  codex-statusline uninstall
  codex-statusline presets
  codex-statusline render-rich < payload.json
  codex-statusline sample
  codex-statusline install-claude
  codex-statusline uninstall-claude`);
}

function getCodexVersion(): string | null {
  try {
    return execFileSync("codex", ["--version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function installCodexPreset(options: CommandOptions): void {
  const preset = getPreset(options.presetName);
  assertPresetCompatible(preset);

  const existing = readConfig(options.configPath);
  const backupPath = ensureBackup(options.configPath, existing);
  const next = upsertStatusLine(existing, preset.items);

  writeConfig(next, options.configPath);
  writeState({
    backupPath,
    configPath: options.configPath,
    installedAt: new Date().toISOString(),
    presetName: preset.name,
  });
}

function showCurrentConfig(options: CommandOptions): void {
  const current = readConfig(options.configPath);
  const items = extractStatusLineItems(current);
  const version = getCodexVersion();

  if (!items) {
    console.log(`No [tui].status_line found in ${options.configPath}.`);
    if (version) {
      console.log(`Codex version: ${version}`);
    }
    return;
  }

  console.log(`Config: ${options.configPath}`);
  if (version) {
    console.log(`Codex version: ${version}`);
  }
  console.log(`Preset: ${detectPreset(items)}`);
  console.log(`Items: ${items.join(", ")}`);

  const state = readState();
  if (state) {
    console.log(`Backup: ${state.backupPath}`);
    console.log(`Installed at: ${state.installedAt}`);
  }
}

function uninstallCodexPreset(options: CommandOptions): void {
  const state = readState();
  const restored = restoreBackup(options.configPath);

  if (restored) {
    removeBackup();
    clearState();
    return;
  }

  const existing = readConfig(options.configPath);
  if (!existing) {
    return;
  }

  const next = removeManagedStatusLine(existing);
  writeConfig(next, options.configPath);
  if (state) {
    clearState();
  }
}

function listPresets(): void {
  for (const preset of Object.values(PRESETS)) {
    console.log(`${preset.name}: ${preset.description}`);
    console.log(`  ${preset.items.join(", ")}`);
  }
}

async function main(): Promise<void> {
  const { command, options } = parseArgs(process.argv.slice(2));

  switch (command) {
    case "install":
      installCodexPreset(options);
      {
        const preset = getPreset(options.presetName);
        const claudeResult = installClaudeBridge();
        console.log(`Installed preset "${preset.name}" to ${options.configPath}.`);
        console.log(`Items: ${preset.items.join(", ")}`);
        console.log(`Installed rich statusline bridge to ${claudeResult.statuslinePath}.`);
        console.log(`Updated ${claudeResult.settingsPath}.`);
      }
      return;
    case "current":
      showCurrentConfig(options);
      return;
    case "uninstall":
      uninstallCodexPreset(options);
      {
        const result = uninstallClaudeBridge();
        console.log(`Removed managed Codex status_line from ${options.configPath}.`);
        console.log(`Removed Claude bridge from ${result.supportDir}.`);
        console.log(`Updated ${result.settingsPath}.`);
      }
      return;
    case "presets":
      listPresets();
      return;
    case "sample":
      console.log(samplePayload());
      return;
    case "render-rich":
      await renderRichStatuslineFromStdin();
      return;
    case "install-claude": {
      const result = installClaudeBridge();
      console.log(`Installed Claude bridge to ${result.statuslinePath}.`);
      console.log(`Updated ${result.settingsPath}.`);
      return;
    }
    case "uninstall-claude": {
      const result = uninstallClaudeBridge();
      console.log(`Removed Claude bridge from ${result.supportDir}.`);
      console.log(`Updated ${result.settingsPath}.`);
      return;
    }
    case "help":
    default:
      printHelp();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
