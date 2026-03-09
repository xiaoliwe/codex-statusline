# codex-statusline

[![Version](https://img.shields.io/github/package-json/v/xiaoliwe/codex-statusline)](https://github.com/xiaoliwe/codex-statusline)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/xiaoliwe/codex-statusline)](https://github.com/xiaoliwe/codex-statusline/commits/main)
[![Issues](https://img.shields.io/github/issues/xiaoliwe/codex-statusline)](https://github.com/xiaoliwe/codex-statusline/issues)

Manage Codex footer presets and install a Claude-style multi-line rich statusline.

It updates `~/.codex/config.toml` and installs the rich renderer at `~/.claude/statusline.sh`.

## Installation

```bash
npm install
npm run build
node bin/codex-statusline.js install
```

After publish:

```bash
npx codex-statusline install
```

Restart the client after install so it reloads config and renderer state.

## Update

```bash
npm install
npm run build
node bin/codex-statusline.js install
```

This reapplies the latest native preset and refreshes the rich statusline script.

If you only want to refresh the rich statusline bridge:

```bash
node bin/codex-statusline.js install-claude
```

If you are using the published package:

```bash
npx codex-statusline install
```

## Commands

Install:

```bash
codex-statusline install
```

Check current config:

```bash
codex-statusline current
```

Preview the rich renderer:

```bash
codex-statusline sample | codex-statusline render-rich
```

Refresh only the Claude bridge:

```bash
codex-statusline install-claude
```

Remove managed changes:

```bash
codex-statusline uninstall
```

## Development

```bash
npm run check
npm test
npm run pack:dry-run
```

Use temporary paths when testing locally:

```bash
CODEX_STATUSLINE_HOME=/tmp/codex-statusline-state \
CODEX_STATUSLINE_CONFIG_PATH=/tmp/config.toml \
codex-statusline install

CODEX_STATUSLINE_CLAUDE_HOME=/tmp/fake-claude \
codex-statusline install-claude
```

## License

Released under the [MIT License](./LICENSE).
