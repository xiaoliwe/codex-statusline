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
npm install -g @xiaoliwe/codex-statusline
codex-statusline install
```

Restart the client after install so it reloads config and renderer state.
If an older build left invalid managed items behind, run `codex-statusline repair`.
If you previously installed the old unscoped package, remove it first with `npm uninstall -g codex-statusline`.

## Update

```bash
npm install -g @xiaoliwe/codex-statusline@latest
codex-statusline install
```

This reapplies the latest native preset and refreshes the rich statusline script.

## License

Released under the [MIT License](./LICENSE).
