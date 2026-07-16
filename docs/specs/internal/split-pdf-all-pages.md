# PDF全ページ分割の内部契約

`splitPdf.allPages`の利用者向け挙動は、[product specification](../product/split-pdf-all-pages.md)を正本とする。この文書は、入力境界、pdf processing、staging、batch commit、取消記録の内部契約だけを記録する。

## Command and processing boundary

command adapterは`uri`と`uris`を受け取り、`uris`に1件以上ある場合はそれを、ない場合は`uri`を処理coreへ渡す。workspace境界の検証はprocessing開始前に行う。PDFの読み込みと1ページPDFの生成は`pdf-lib`へ委譲する。

## Staging and artifact boundary

元PDFとpage artifactは、operationごとの次のstaging rootで管理する。

```text
<workspace>/.latex-graphics-helper/split-pdf/<一意ID>/<入力ごとのディレクトリ>/
```

pageごとの完成artifactをstagingで作成し、final pathへのcommitと分離する。成功後のstaging寿命は共通のcleanup方針に従う。

## Batch transaction

全入力・全pageのprocessingが完了するまでcommitを開始しない。commit coordinatorはbatch内のpath collisionを解決した後にfinal pathを扱い、commit途中の失敗ではそのoperationで反映済みのartifactをrollbackする。

## Cancellation and progress boundary

通知領域のprogressとcancel signalは共通の[conversion progress and cancellation internal contract](conversion-progress-and-cancellation.md)へ接続する。未開始のpage processingを開始しない判断とstaging cleanupはoperation ownerが行う。

## Undo integration

生成したpage artifactの集合は、batch単位のUndo recordとして[Undo internal contract](undo-last-conversion.md)へ渡す。
