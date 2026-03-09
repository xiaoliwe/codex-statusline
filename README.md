# codex-statusline

[![Version](https://img.shields.io/github/package-json/v/xiaoliwe/codex-statusline)](https://github.com/xiaoliwe/codex-statusline)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/xiaoliwe/codex-statusline)](https://github.com/xiaoliwe/codex-statusline/commits/main)
[![Issues](https://img.shields.io/github/issues/xiaoliwe/codex-statusline)](https://github.com/xiaoliwe/codex-statusline/issues)

Manage Codex footer presets and install a Claude-style multi-line rich statusline.

The CLI updates `~/.codex/config.toml`, installs a rich renderer into `~/.claude/statusline.sh`, and defaults to the full `complete` preset on install.

## Features

- Install a full native Codex footer preset with one command.
- Render a multi-line rich statusline with model, context, token, git, session, and usage details.
- Safely back up and restore managed `status_line` config changes.

## Installation

```bash
npm install
npm run build
node bin/codex-statusline.js install
```

For package usage after publish:

```bash
npx codex-statusline install
```

## Quick Start

Install the default setup:

```bash
codex-statusline install
```

Check the active Codex footer config:

```bash
codex-statusline current
```

Remove the managed footer and Claude bridge:

```bash
codex-statusline uninstall
```

Preview the rich renderer locally:

```bash
codex-statusline sample | codex-statusline render-rich
```

After install, fully restart the client that should display the statusline so it reloads config and renderer state.

## Presets

- `compact`: minimal footer for narrow terminals.
- `balanced`: lighter signal density.
- `dense`: wider native footer with more runtime detail.
- `complete`: default install preset with the full native Codex item set.

## Command Reference

```bash
codex-statusline install
codex-statusline install --preset complete
codex-statusline current
codex-statusline presets
codex-statusline render-rich
codex-statusline sample
codex-statusline install-claude
codex-statusline uninstall
codex-statusline uninstall-claude
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
