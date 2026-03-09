import test from "node:test";
import assert from "node:assert/strict";
import { renderRichStatusline, samplePayload } from "../src/render.js";

test("renderRichStatusline renders primary and usage sections from sample payload", async () => {
  process.env.CODEX_STATUSLINE_SKIP_CLAUDE_USAGE = "1";

  const output = await renderRichStatusline(samplePayload());

  assert.match(output, /Claude Opus 4\.1/);
  assert.match(output, /ctx/);
  assert.match(output, /input/);
  assert.match(output, /prompt/);
  assert.match(output, /session/);
  assert.match(output, /codex/);
  assert.match(output, /reasoning/);
  assert.match(output, /current/);
  assert.match(output, /weekly/);
  assert.match(output, /extra/);
  assert.match(output, /thinking/);
});

test("renderRichStatusline falls back to Claude label when stdin is empty", async () => {
  const output = await renderRichStatusline("");
  assert.equal(output, "Claude");
});
