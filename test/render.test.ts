import test from "node:test";
import assert from "node:assert/strict";
import { renderRichStatusline, samplePayload } from "../src/render.js";

test("renderRichStatusline renders primary and usage sections from sample payload", async () => {
  process.env.CODEX_STATUSLINE_SKIP_CLAUDE_USAGE = "1";

  const output = await renderRichStatusline(samplePayload());
  const [primary, metrics, usage] = output.split("\n");

  assert.match(primary, /Opus 4\.1/);
  assert.match(primary, /codex-statusline/);
  assert.match(primary, /thinking/);
  assert.match(metrics, /used-tokens/);
  assert.match(metrics, /total-input-tokens/);
  assert.match(metrics, /context-remaining/);
  assert.match(usage, /five-hour-limit/);
  assert.match(usage, /weekly-limit/);
  assert.match(usage, /extra/);
  assert.doesNotMatch(output, /model-name/);
  assert.doesNotMatch(output, /model-with-reasoning/);
  assert.doesNotMatch(output, /context-window-size/);
  assert.doesNotMatch(output, /session-id/);
  assert.doesNotMatch(output, /codex-version/);
  assert.doesNotMatch(output, /prompt/);
  assert.doesNotMatch(output, /cache\+/);
  assert.doesNotMatch(output, /cache↺/);
});

test("renderRichStatusline falls back to Claude label when stdin is empty", async () => {
  const output = await renderRichStatusline("");
  assert.equal(output, "Claude");
});
