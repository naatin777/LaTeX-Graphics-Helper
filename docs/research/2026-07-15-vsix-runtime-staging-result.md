# VSIX runtime stagingの実装確認メモ

## 調査日

2026-07-15

## 対象

タスク0179で追加した`scripts/package-vsix.mjs`によるmacOS arm64向けVSIX生成。

## 実行結果

次のcommandで、build済みのruntimeをstagingしてVSIXを生成できた。

```text
pnpm run package:vsix -- --target darwin-arm64 --out /tmp/lgh-darwin-arm64-script.vsix
```

生成物の確認結果:

- VSIXのtargetは`darwin-arm64`
- `extension/node_modules`を含む
- `@img/sharp-darwin-arm64/lib/sharp-darwin-arm64.node`を含む
- `@img/sharp-libvips-darwin-arm64`のnative libraryを含む
- `pdf-lib`、`pdfjs-dist`、Mermaid CLI、Puppeteer Coreなどのruntime dependencyを含む
- TypeScript、Mocha、Vitest、Oxlint、Oxfmt、Playwright、VSCEなどのdev dependencyを含まない
- `docs`、`test`、`src`、`.codex`、`.agents`、`.github`を含まない

生成物は95.5 MB、21630 filesだった。サイズとnetworkなしの実行可否は、タスク0180で確認する。

追加確認:

- macOS arm64 runner上で`linux-x64` targetを指定すると、native binaryとの不一致としてpackagingを開始せず失敗する
- stagingへ`.vscodeignore`をコピーすることで、compiled outputとWebview assetsのsource map、開発用`assets/icon.drawio`をVSIXから除外できる

## 判断

pnpmのrepository node_modulesを直接vsceへ渡すのではなく、OS一時directoryでruntime allowlistとnpm production installを行う方式で、少なくともmacOS arm64向けの実行可能なVSIXを生成できることを確認した。

LinuxとWindowsのnative package、およびnetwork遮断下でのVS Code起動・機能実行は未確認である。

## 関連

- [ADR-0015: runtime stagingからOS別VSIXを生成する](../adr/0015-build-platform-specific-vsix-from-runtime-staging.md)
- [0162: パッケージ済みVSIXのオフライン・3 OS動作を調査する](../tasks/0162-audit-offline-vsix-cross-platform.md)
- [0179: VSIXのproduction dependency同梱とplatform packageを成立させる](../tasks/0179-fix-vsix-production-dependency-packaging.md)
