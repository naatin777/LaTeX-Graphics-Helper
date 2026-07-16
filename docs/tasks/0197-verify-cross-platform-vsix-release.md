# cross-platform VSIX release verification

## Status

Todo

## 目的

提供対象の各OS runnerで、lockfileベースのVSIX packageとpackaged smokeを実測する。

## 変更内容

- Linux、Windows、macOSの実runnerでpackage結果を確認する。
- 対象target、Sharp native binary、packaged VSIX smokeの結果を記録する。

## 対象外

- release matrixの追加拡張
- cross-compile
- marketplace publish
- package依存関係の変更

## 確認方法

- 各対象runnerの`pnpm install --frozen-lockfile`
- `pnpm run package:vsix -- --target <target> --out <file>`
- packaged VSIXのoffline smoke

## 結果

未着手。
