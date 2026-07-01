# タスク: GitHub Actionsで外部変換ツールを実体確認する

## Status

Done

## 目的

GitHub ActionsのLinux / macOS / Windowsで、変換機能に必要な外部ツールがインストールされ、実行できることを明示的に確認する。

## 完了条件

- Linux CIで`ghostscript` / `pdftocairo` / `rsvg-convert` / Chrome系ブラウザの設定パスを確認する
- macOS CIで`ghostscript` / `pdftocairo` / `rsvg-convert` / Chrome系ブラウザの設定パスを確認する
- Windows CIで`ghostscript` / `pdftocairo` / `rsvg-convert` / Chrome系ブラウザの設定パスを確認する
- 各ツールの実行パスは環境変数やPATH探索に依存せず、CIで生成する`test/fixtures/workspace/.vscode/settings.json`から読む
- `rsvg-convert`と`pdftocairo`は実際に小さなSVG/PDF/PNG変換を行って確認する
- 既存のVS Codeテストは引き続き全OSで実行する

## 変更可能なファイル

- `.github/workflows/test-linux.yml`
- `.github/workflows/test-macos.yml`
- `.github/workflows/test-windows.yml`
- `.github/scripts/**`
- `docs/tasks/0066-verify-ci-external-tools.md`
- `docs/tasks/README.md`

## 対象外

- Draw.io Desktop実体をGitHub Actionsへ導入すること
- CI上でGUIアプリとしてDraw.io Desktopを起動すること
- 変換機能の実装変更

## 関連

- `docs/specs/output-format-conversion.md`
- `docs/adr/0010-verify-external-tools-through-vscode-settings.md`

## 確認方法

- `pnpm run check`
- GitHub ActionsのLinux / macOS / Windows `vscode-test`

## 実施内容

- Linux / macOS / Windowsの`vscode-test` workflowに外部ツールsmoke checkを追加した
- CIのインストールスクリプトで、外部ツールの実行パスを`test/fixtures/workspace/.vscode/settings.json`へ書き込むようにした
- 検証スクリプトはPATHや環境変数ではなく、`settings.json`の値だけを読んで実体確認するようにした
- `rsvg-convert`と`pdftocairo`は小さなSVG→PDF→PNG変換で確認するようにした
- 方針を`docs/adr/0010-verify-external-tools-through-vscode-settings.md`へ記録した

## 確認結果

- `bash .github/scripts/install-image-tools-macos.sh`
- `bash .github/scripts/verify-image-tools-unix.sh`
- `CI=true pnpm run check`
- PR #277 GitHub Actions
  - `check`: pass
  - Linux `vscode-test`: pass
  - macOS `vscode-test`: pass
  - Windows `vscode-test`: pass
