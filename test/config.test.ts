import test from "node:test";
import assert from "node:assert/strict";
import { extractStatusLineItems, removeManagedStatusLine, upsertStatusLine } from "../src/config.js";

test("upsertStatusLine appends a new tui section when missing", () => {
  const result = upsertStatusLine('model = "gpt-5.4"\n', ["model-with-reasoning", "git-branch"]);
  assert.match(result, /\[tui\]/);
  assert.deepEqual(extractStatusLineItems(result), ["model-with-reasoning", "git-branch"]);
});

test("upsertStatusLine replaces an existing status_line without dropping siblings", () => {
  const input = [
    'model = "gpt-5.4"',
    "",
    "[features]",
    "plan_tool = true",
    "",
    "[tui]",
    'status_line = ["model-name"]',
    'theme = "dark"',
    "",
  ].join("\n");

  const result = upsertStatusLine(input, ["model-with-reasoning", "project-root"]);
  assert.match(result, /theme = "dark"/);
  assert.deepEqual(extractStatusLineItems(result), ["model-with-reasoning", "project-root"]);
});

test("removeManagedStatusLine removes the managed entry and leaves the section", () => {
  const input = [
    "[tui]",
    "# codex-statusline managed",
    'status_line = ["model-with-reasoning", "project-root"]',
    'theme = "dark"',
    "",
  ].join("\n");

  const result = removeManagedStatusLine(input);
  assert.equal(extractStatusLineItems(result), null);
  assert.match(result, /\[tui\]/);
  assert.match(result, /theme = "dark"/);
});

test("removeManagedStatusLine leaves an unmanaged status_line untouched", () => {
  const input = [
    "[tui]",
    'status_line = ["model-name"]',
    'theme = "dark"',
    "",
  ].join("\n");

  const result = removeManagedStatusLine(input);
  assert.equal(result, '[tui]\nstatus_line = ["model-name"]\ntheme = "dark"\n');
  assert.deepEqual(extractStatusLineItems(result), ["model-name"]);
});
