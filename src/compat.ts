import { SUPPORTED_STATUSLINE_ITEMS, SUPPORTED_STATUSLINE_ITEM_SET } from "./constants.js";
import type { StatusLinePreset } from "./presets.js";

export function getUnsupportedItems(items: string[]): string[] {
  return items.filter((item) => !SUPPORTED_STATUSLINE_ITEM_SET.has(item));
}

export function assertPresetCompatible(preset: StatusLinePreset): void {
  const unsupported = getUnsupportedItems(preset.items);
  if (unsupported.length > 0) {
    throw new Error(
      `Preset "${preset.name}" contains unsupported Codex items: ${unsupported.join(", ")}.`,
    );
  }
}
