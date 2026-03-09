import fs from "node:fs";
import path from "node:path";
import { resolveBackupFile, resolveStateDir, resolveStateFile } from "./constants.js";

export type InstallState = {
  backupPath: string;
  configPath: string;
  installedAt: string;
  presetName: string;
};

export function ensureStateDir(): void {
  fs.mkdirSync(resolveStateDir(), { recursive: true });
}

export function readState(): InstallState | null {
  const stateFile = resolveStateFile();
  if (!fs.existsSync(stateFile)) {
    return null;
  }

  const raw = fs.readFileSync(stateFile, "utf8");
  return JSON.parse(raw) as InstallState;
}

export function writeState(state: InstallState): void {
  ensureStateDir();
  fs.writeFileSync(resolveStateFile(), `${JSON.stringify(state, null, 2)}\n`);
}

export function clearState(): void {
  const stateFile = resolveStateFile();
  if (fs.existsSync(stateFile)) {
    fs.unlinkSync(stateFile);
  }
}

export function ensureBackup(configPath: string, content: string): string {
  const backupFile = resolveBackupFile();
  ensureStateDir();
  if (!fs.existsSync(backupFile)) {
    fs.writeFileSync(backupFile, content);
  }
  return backupFile;
}

export function restoreBackup(destination: string): boolean {
  const backupFile = resolveBackupFile();
  if (!fs.existsSync(backupFile)) {
    return false;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(backupFile, destination);
  return true;
}

export function removeBackup(): void {
  const backupFile = resolveBackupFile();
  if (fs.existsSync(backupFile)) {
    fs.unlinkSync(backupFile);
  }
}
