# 出力形式基準の変換の内部契約

出力形式基準commandの利用者向け挙動は、[product specification](../product/output-format-conversion.md)を正本とする。この文書は、commandとformat-specific processing、batch transaction、依存関係の境界だけを記録する。

## Command and processing boundary

command層は選択された入力をbatchとして受け取り、入力ごとのformat-specific processingへ渡す。入力判定、outputPathの解決、Safe Mode、Undo、progress、cancellationは、それぞれの共通boundaryへ接続し、format-specific coreへVS Code APIを渡さない。

## Batch transaction

1回のcommand実行に対応するoperation rootを作り、入力ごとの中間artifactと完成artifactをfinal pathから分離して保持する。

- format-specific processingはstaging内で完了させる。
- commit coordinatorはbatchの全processing結果を受け取ってからfinal pathを扱う。
- 競合解決とUndo recordはbatch単位のtransactionへ接続する。
- cancelまたはprocessing/commit failure時は、operation ownerがstagingとrollbackを処理する。

stagingの寿命とactivation時のcleanupは、[Safe Mode internal contract](safe-mode.md)と[file operation security contract](file-operation-security.md)を正本とする。

## Format dependency boundary

- 形式ごとの変換処理はformat-specific moduleに閉じ込める。
- Draw.ioから画像への変換は、数式を保持するためPDF中間artifactを経由する既存経路を使用する。
- Mermaid入力の変換は`@mermaid-js/mermaid-cli`をdependency boundaryとし、SVG・PNG・PDFの直接出力と、既存画像変換経路へ渡す処理を分ける。
- Mermaid CLIが使用するbrowserの解決はMermaid processing moduleが担当し、ユーザーへ別CLIのinstallを要求しない。

## Shared operation contracts

progressとcancellationは[conversion progress and cancellation internal contract](conversion-progress-and-cancellation.md)、出力反映とbackupは[Safe Mode internal contract](safe-mode.md)、取消記録は[Undo internal contract](undo-last-conversion.md)へ委譲する。
