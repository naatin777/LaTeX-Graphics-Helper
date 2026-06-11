# AGENTS.md

## Cursor Cloud specific instructions

This repo is a single **VS Code extension** (`LaTeX Graphics Helper`, TypeScript). There is no server; the extension runs in-process inside VS Code and shells out to optional external CLIs for some features. Standard commands live in `package.json` `scripts` and `.github/workflows/test.yml`; only the non-obvious caveats are noted here.

- **Dependencies**: `npm ci` (run automatically by the startup update script). Node 22 is expected (`engines`/CI).
- **Build / lint**: `npm run compile` (`tsc` → `out/`) and `npm run lint` (`eslint src`). Output goes to `out/` (gitignored); `main` is `out/extension.js`.
- **Tests need a display**: `npm test` (`vscode-test`) launches a real VS Code/Electron and fails on this headless VM without an X server. Always run it as `xvfb-run -a npm run test`. A display (`:1`) is also available if launching the GUI. The dbus/gpu `ERROR:` lines printed during the run are harmless headless warnings, not test failures.
- **Running the extension manually**: there is no `code` binary on `PATH`. `@vscode/test-electron` downloads a full VS Code under `.vscode-test/vscode-linux-x64-<version>/` (created after running the tests once). Launch the Extension Development Host with that binary, e.g. `DISPLAY=:1 .vscode-test/vscode-linux-x64-<version>/code --no-sandbox --user-data-dir=/tmp/vscode-dev-user --extensionDevelopmentPath="$PWD" <folder-to-open>`. The version subdir changes over time, so glob it rather than hardcoding.
- **Optional external tools (not installed)**: `pdfcrop` (crop), `pdftocairo` (PDF→image), Draw.io desktop (drawio→PDF), and Chrome/Puppeteer (SVG→PDF). The PNG/JPEG→PDF, merge, and split features use bundled npm libs (`sharp`, `pdf-lib`) and need no external binaries — use one of these for a quick end-to-end smoke test (e.g. right-click a `.png` → "Convert to PDF").
- **Git hooks**: `lefthook.yml` runs `eslint` + `tsc --noEmit` on pre-commit. Lefthook is a devDependency; hooks only fire if installed locally (`npx lefthook install`).
