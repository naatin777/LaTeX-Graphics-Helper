# タスク: 外部ツールの一回限りpath probeを削除する

## Status

Done

## 目的

一度実測して結論を記録した外部ツールのpath互換性probeを、通常のCIから削除する。
通常の変換テストに必要な外部ツールのinstall・verifyは維持し、未使用のqpdf導入と重複する調査専用workflowをなくす。

## 完了条件

- 外部ツールpath probe workflowを削除する
- probe専用のinstall・実行スクリプトを削除する
- 通常の変換テストで使わないqpdfのCI install・verifyを削除する
- Ghostscript、pdftocairo、rsvg-convert、Draw.io CLI、pdfcrop、qpdfの一回限りの調査結果はdocsに残す
- 通常の変換テスト用外部ツールinstall・verifyを壊さない
- `pnpm run check:all`が成功する

## 変更可能なファイル

- `.github/workflows/external-tool-path-probe.yml`
- `.github/scripts/install-drawio-path-probe-*`
- `.github/scripts/run-external-tool-path-probe-*`
- `.github/scripts/probe-external-tool-paths.mjs`
- `.github/scripts/install-test-tools-linux.sh`
- `.github/scripts/install-image-tools-macos.sh`
- `.github/scripts/install-image-tools-windows.ps1`
- `.github/scripts/verify-image-tools-unix.sh`
- `.github/scripts/verify-image-tools-windows.ps1`
- `docs/tasks/0181-remove-external-tool-path-probe.md`
- `docs/tasks/README.md`

## 対象外

- 通常の変換テスト用install・verifyスクリプトの削除
- `scripts/package-vsix.mjs`の削除
- 外部ツールの実装方式やsettings.jsonの変更
- 既存のpath互換性調査結果の書き換え

## 関連

- [0141: 外部コマンドのOS別path互換性を実測する](0141-audit-external-tool-path-compatibility.md)
- [外部コマンドのOS別path互換性調査](../research/2026-07-11-external-tool-path-compatibility.md)
- [qpdfのCI導入調査](../research/2026-07-11-qpdf-ci-installation.md)

## 確認方法

- 削除対象への参照を検索する
- `pnpm run check:all`
- `git diff --check`

## 実施した確認

- 外部ツールpath probe workflow、probe専用script、Draw.io probe用install scriptを削除した
- 通常の変換テスト用install・verifyからqpdfだけを削除した
- `bash -n .github/scripts/install-test-tools-linux.sh .github/scripts/install-image-tools-macos.sh .github/scripts/verify-image-tools-unix.sh`
- 削除対象のworkflow・scriptへの実行時参照がないことを確認した
- `pnpm run check:all`
- `git diff --check`
