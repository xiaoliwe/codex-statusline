import test from "node:test";
import assert from "node:assert/strict";
import { extractStatusLine, repairManagedStatusLine } from "../src/config.js";

test("repairManagedStatusLine removes unsupported items from managed status lines", () => {
  const input = `
[tui]
# codex-statusline managed
status_line = ["model-name", "reasoning", "context-used"]
`;

  const result = repairManagedStatusLine(input, (item) => item !== "reasoning");

  assert.equal(result.changed, true);
  assert.deepEqual(result.removedItems, ["reasoning"]);
  assert.deepEqual(result.remainingItems, ["model-name", "context-used"]);
  assert.deepEqual(extractStatusLine(result.content), {
    items: ["model-name", "context-used"],
    managed: true,
  });
});

test("repairManagedStatusLine leaves unmanaged status lines untouched", () => {
  const input = `
[tui]
status_line = ["model-name", "reasoning"]
`;

  const result = repairManagedStatusLine(input, (item) => item !== "reasoning");

  assert.equal(result.changed, false);
  assert.deepEqual(result.removedItems, []);
  assert.equal(result.content, input);
});
