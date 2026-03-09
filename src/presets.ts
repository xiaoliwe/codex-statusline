import { SUPPORTED_STATUSLINE_ITEMS } from "./constants.js";
import type { StatusLineItem } from "./constants.js";

export type PresetName = "compact" | "balanced" | "dense" | "complete";

export type StatusLinePreset = {
  description: string;
  items: StatusLineItem[];
  name: PresetName;
};

export const PRESETS: Record<PresetName, StatusLinePreset> = {
  compact: {
    name: "compact",
    description: "Short footer for narrow terminals.",
    items: [
      "model-with-reasoning",
      "context-remaining",
      "five-hour-limit",
      "git-branch",
      "project-root",
    ],
  },
  balanced: {
    name: "balanced",
    description: "Recommended default with model, context, limits, and repo state.",
    items: [
      "model-with-reasoning",
      "context-used",
      "context-remaining",
      "five-hour-limit",
      "weekly-limit",
      "git-branch",
      "project-root",
      "used-tokens",
    ],
  },
  dense: {
    name: "dense",
    description: "High-information footer for wide terminals and heavy sessions.",
    items: [
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
      "codex-version",
    ],
  },
  complete: {
    name: "complete",
    description: "Full native Codex footer coverage, including tokens, session, and version fields.",
    items: [...SUPPORTED_STATUSLINE_ITEMS],
  },
};

export function getPreset(name: string | undefined): StatusLinePreset {
  const preset = PRESETS[(name ?? "complete") as PresetName];
  if (!preset) {
    throw new Error(`Unknown preset "${name}". Expected one of: ${Object.keys(PRESETS).join(", ")}.`);
  }
  return preset;
}

export function detectPreset(items: string[]): PresetName | "custom" {
  for (const preset of Object.values(PRESETS)) {
    if (preset.items.length !== items.length) {
      continue;
    }

    if (preset.items.every((item, index) => item === items[index])) {
      return preset.name;
    }
  }

  return "custom";
}
