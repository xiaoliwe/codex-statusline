# Repository Guidelines

## Project Structure & Module Organization

The package is a small TypeScript CLI. Runtime code lives in `src/`: `cli.ts` is the command entrypoint, `config.ts` edits `~/.codex/config.toml`, `presets.ts` defines Codex footer presets, `render.ts` builds the Claude-style ANSI statusline, and `claude.ts` installs the renderer into `~/.claude/statusline.sh`. Executable shims live in `bin/`. Tests live in `test/`. Design notes and roadmap material stay in `docs/`.

## Build, Test, and Development Commands

- `npm install`: install local dependencies.
- `npm run build`: compile TypeScript into `dist/`.
- `npm run check`: run TypeScript type-checking without emitting files.
- `npm test`: build and run the Node test suite.
- `npm run pack:dry-run`: inspect what would be published to npm.
- `node bin/codex-statusline.js install --preset balanced`: write the recommended Codex preset into `~/.codex/config.toml`.

## Coding Style & Naming Conventions

Use strict TypeScript with ES modules and 2-space indentation. Keep modules focused; new CLI subcommands belong in `src/cli.ts`, while file-system and config logic should stay in dedicated helpers. Prefer descriptive camelCase for variables and functions, PascalCase only for types, and kebab-case for published command names like `render-rich`.

## Testing Guidelines

Add tests under `test/*.test.ts` using Node’s built-in `node:test` runner and `assert/strict`. Cover config rewrite behavior, idempotent install/uninstall paths, and renderer output for representative payloads. When touching packaging or publish behavior, run `npm run pack:dry-run` before opening a PR.

## Commit & Pull Request Guidelines

The current history starts with a simple `Initial commit`, so keep new commits imperative and scoped, for example `Add Claude bridge smoke tests`. PRs should explain the user-visible change, note any config files touched (`~/.codex/config.toml`, `~/.claude/settings.json`), and include terminal output or screenshots when changing rendered statusline output.

## Security & Configuration Tips

Do not commit real tokens, local config snapshots, or captured credential files. Use `CODEX_STATUSLINE_CONFIG_PATH`, `CODEX_STATUSLINE_HOME`, `CODEX_STATUSLINE_CLAUDE_HOME`, and `CODEX_STATUSLINE_USAGE_CACHE` when testing against temporary directories instead of your real home-directory config.
