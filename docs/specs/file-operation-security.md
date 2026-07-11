# ファイル操作のworkspace境界仕様

## 原則

`execPath` を除き、拡張機能が読み書きするファイルとディレクトリは、対象workspaceの実体内に存在しなければならない。

workspace外を対象とする操作は、読み取り・書き込みともエラーにする。

例外として、[外部コマンド用ASCII scratch仕様](external-tool-ascii-scratch.md)で定義したWindowsのtool scratchだけは、検証済みOS一時directory内の読み書きを許可する。この例外をユーザー入力path、論理出力、Safe Mode backup、Undoへ広げない。

## パス判定

文字列のprefix比較だけでは判定しない。

以下の両方を確認する。

1. `path.resolve` した論理パスがworkspaceの論理パス内にある
2. `realpath` で解決した既存部分の実体がworkspaceの実体内にある

workspace直下そのものはworkspace内として扱う。

兄弟ディレクトリ、共通prefixを持つ別ディレクトリ、`..` でworkspace外へ出るパスは拒否する。

## 読み取り

読み取り対象は存在している必要がある。

対象とworkspaceを `realpath` で解決し、対象の実体がworkspaceの実体内にある場合だけ許可する。

workspace内に置かれたsymlinkがworkspace外を指す場合は拒否する。

## 書き込み

書き込み対象が存在する場合は、その実体を `realpath` で検証する。

書き込み対象が未作成の場合は、最も近い既存の親ディレクトリを探し、その実体がworkspaceの実体内にあることを検証する。

workspace内に置かれたsymlinkディレクトリを経由してworkspace外へ書き込む場合は拒否する。

## workspaceがsymlinkの場合

workspace自体がsymlinkでもよい。

workspaceの `realpath` を境界として使用し、その実体内の読み書きを許可する。

## execPath

Ghostscriptなどの `execPath` はworkspace外を許可する。

`execPath` はファイル入出力パスの境界検証へ渡さない。

## OS一時scratch

OS一時scratchはworkspace境界とは別の専用境界として扱う。

- scratch baseをユーザー設定から受け取らない
- `mkdtemp`で作成した専用rootだけを使用する
- scratch root内の論理pathと実体pathを検証する
- scratch root外とsymlink経由の操作を拒否する
- workspaceとのfile移動はNode.js `copyFile`で行う
- 外部コマンドへworkspace pathを直接渡さない
- scratchからユーザー指定outputPathへ直接書き込まない

## 競合

パス検証から実際のファイル操作までの間にsymlinkが差し替えられる競合を、Node.jsの通常のパスAPIだけで完全に防ぐことはこのタスクの範囲外とする。

重要な書き込み直前に再検証し、検証と操作の間隔を短くする。
