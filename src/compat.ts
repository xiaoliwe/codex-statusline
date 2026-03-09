import { SUPPORTED_STATUSLINE_ITEMS } from "./constants.js";
import type { StatusLinePreset } from "./presets.js";

const SUPPORTED_SET = new Set(SUPPORTED_STATUSLINE_ITEMS);

export function getUnsupportedItems(items: string[]): string[] {
  return items.filter((item) => !SUPPORTED_SET.has(item as (typeof SUPPORTED_STATUSLINE_ITEMS)[number]));
}

export function assertPresetCompatible(preset: StatusLinePreset): void {
  const unsupported = getUnsupportedItems(preset.items);
  if (unsupported.length > 0) {
    throw new Error(
      `Preset "${preset.name}" contains unsupported Codex items: ${unsupported.join(", ")}.`,
    );
  }
}
