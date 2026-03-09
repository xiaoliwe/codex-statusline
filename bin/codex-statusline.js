#!/usr/bin/env node
import("../dist/src/cli.js").catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to load compiled CLI from dist/src/cli.js.\nRun "npm run build" first.\n${message}`);
  process.exit(1);
});
