import test from "node:test";
import assert from "node:assert/strict";
import { getPreset } from "../src/presets.js";

test("getPreset defaults to the complete preset", () => {
  assert.equal(getPreset(undefined).name, "complete");
});

test("complete preset does not include unsupported standalone reasoning item", () => {
  const preset = getPreset("complete");
  const items = [...preset.items] as string[];

  assert.ok(items.includes("model-with-reasoning"));
  assert.ok(!items.includes("reasoning"));
});
