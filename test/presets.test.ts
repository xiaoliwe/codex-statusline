import test from "node:test";
import assert from "node:assert/strict";
import { getPreset } from "../src/presets.js";

test("getPreset defaults to the complete preset", () => {
  assert.equal(getPreset(undefined).name, "complete");
});
