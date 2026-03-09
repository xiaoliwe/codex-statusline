import fs from "node:fs";
import path from "node:path";
import { MANAGED_COMMENT, resolveConfigPath } from "./constants.js";

type StatusLineSpan = {
  end: number;
  start: number;
};

function normalizeText(input: string): string {
  return input.replace(/\r\n/g, "\n");
}

function splitLines(input: string): string[] {
  return normalizeText(input).split("\n");
}

function isSectionHeader(line: string): boolean {
  return /^\s*\[[^\]]+\]\s*$/.test(line);
}

function sectionName(line: string): string | null {
  const match = line.match(/^\s*\[([^\]]+)\]\s*$/);
  return match?.[1] ?? null;
}

function findTuiSection(lines: string[]): { end: number; start: number } | null {
  let start = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const name = sectionName(lines[index]);
    if (name === "tui") {
      start = index;
      break;
    }
  }

  if (start === -1) {
    return null;
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (isSectionHeader(lines[index])) {
      end = index;
      break;
    }
  }

  return { start, end };
}

function findStatusLineSpan(lines: string[], start: number, end: number): StatusLineSpan | null {
  for (let index = start + 1; index < end; index += 1) {
    if (!/^\s*status_line\s*=/.test(lines[index])) {
      continue;
    }

    let depth = 0;
    let foundArray = false;
    let spanEnd = index;

    for (let cursor = index; cursor < end; cursor += 1) {
      for (const char of lines[cursor]) {
        if (char === "[") {
          depth += 1;
          foundArray = true;
        } else if (char === "]") {
          depth -= 1;
        }
      }
      spanEnd = cursor;
      if (foundArray && depth <= 0) {
        const spanStart = lines[index - 1]?.trim() === MANAGED_COMMENT ? index - 1 : index;
        return { start: spanStart, end: spanEnd };
      }
    }

    const spanStart = lines[index - 1]?.trim() === MANAGED_COMMENT ? index - 1 : index;
    return { start: spanStart, end: spanEnd };
  }

  return null;
}

function formatStatusLine(items: string[]): string {
  const rendered = items.map((item) => JSON.stringify(item)).join(", ");
  return `${MANAGED_COMMENT}\nstatus_line = [${rendered}]`;
}

function cleanupTrailingBlankLines(lines: string[]): string[] {
  const result = [...lines];
  while (result.length > 0 && result[result.length - 1] === "") {
    result.pop();
  }
  return result;
}

export function readConfig(configPath = resolveConfigPath()): string {
  if (!fs.existsSync(configPath)) {
    return "";
  }
  return normalizeText(fs.readFileSync(configPath, "utf8"));
}

export function writeConfig(content: string, configPath = resolveConfigPath()): void {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${cleanupTrailingBlankLines(splitLines(content)).join("\n")}\n`);
}

export function upsertStatusLine(content: string, items: string[]): string {
  const lines = splitLines(content);
  const formatted = formatStatusLine(items).split("\n");
  const tuiSection = findTuiSection(lines);

  if (!tuiSection) {
    const next = cleanupTrailingBlankLines(lines);
    if (next.length > 0) {
      next.push("");
    }
    next.push("[tui]");
    next.push(...formatted);
    return `${next.join("\n")}\n`;
  }

  const existing = findStatusLineSpan(lines, tuiSection.start, tuiSection.end);
  const next = [...lines];

  if (existing) {
    next.splice(existing.start, existing.end - existing.start + 1, ...formatted);
    return `${cleanupTrailingBlankLines(next).join("\n")}\n`;
  }

  next.splice(tuiSection.end, 0, ...formatted);
  return `${cleanupTrailingBlankLines(next).join("\n")}\n`;
}

export function removeManagedStatusLine(content: string): string {
  const lines = splitLines(content);
  const tuiSection = findTuiSection(lines);
  if (!tuiSection) {
    return `${cleanupTrailingBlankLines(lines).join("\n")}\n`;
  }

  const existing = findStatusLineSpan(lines, tuiSection.start, tuiSection.end);
  if (!existing || lines[existing.start]?.trim() !== MANAGED_COMMENT) {
    return `${cleanupTrailingBlankLines(lines).join("\n")}\n`;
  }

  const next = [...lines];
  next.splice(existing.start, existing.end - existing.start + 1);
  if (next[existing.start] === "" && next[existing.start - 1] === "") {
    next.splice(existing.start, 1);
  }

  return `${cleanupTrailingBlankLines(next).join("\n")}\n`;
}

export function extractStatusLineItems(content: string): string[] | null {
  const statusLine = extractStatusLine(content);
  return statusLine?.items ?? null;
}

export function extractStatusLine(content: string): { items: string[]; managed: boolean } | null {
  const lines = splitLines(content);
  const tuiSection = findTuiSection(lines);
  if (!tuiSection) {
    return null;
  }

  const span = findStatusLineSpan(lines, tuiSection.start, tuiSection.end);
  if (!span) {
    return null;
  }

  const raw = lines.slice(span.start, span.end + 1).join("\n");
  const match = raw.match(/status_line\s*=\s*(\[[\s\S]*\])/);
  if (!match) {
    return null;
  }

  try {
    return {
      items: JSON.parse(match[1]) as string[],
      managed: lines[span.start]?.trim() === MANAGED_COMMENT,
    };
  } catch {
    return null;
  }
}

export function repairManagedStatusLine(content: string, isSupportedItem: (item: string) => boolean): {
  changed: boolean;
  content: string;
  remainingItems: string[];
  removedItems: string[];
} {
  const statusLine = extractStatusLine(content);
  if (!statusLine?.managed) {
    return {
      changed: false,
      content,
      remainingItems: statusLine?.items ?? [],
      removedItems: [],
    };
  }

  const removedItems = statusLine.items.filter((item) => !isSupportedItem(item));
  if (removedItems.length === 0) {
    return {
      changed: false,
      content,
      remainingItems: statusLine.items,
      removedItems,
    };
  }

  const remainingItems = statusLine.items.filter((item) => isSupportedItem(item));
  const nextContent =
    remainingItems.length > 0 ? upsertStatusLine(content, remainingItems) : removeManagedStatusLine(content);

  return {
    changed: true,
    content: nextContent,
    remainingItems,
    removedItems,
  };
}
