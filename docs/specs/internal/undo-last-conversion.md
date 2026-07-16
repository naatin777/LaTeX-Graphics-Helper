# 直前の変換取消の内部契約

直前の変換取消に関する利用者向け操作と結果は、[product specification](../product/undo-last-conversion.md)を正本とする。この文書は、record state、取消前validation、artifact executor、cleanupのtransactionだけを記録する。

## Record state

成功した変換について、直前の1回分だけをmemoryへ記録する。recordは次を保持する。

- output artifactのpath
- 対象workspaceのpath
- 生成直後のcontent SHA-256
- overwrite時のbackup pathとbackup SHA-256

SHA-256はNode.jsのstreaming readで計算する。次の変換が成功した場合はrecordを置き換え、以前のrecordだけが参照していたstagingとbackupを削除する。新しいrecordの作成に失敗した場合は以前のrecordを保持する。extension restart後はrecordを復元しない。

## Validation ownership

Undo executorはartifactへ変更を加える前に、recordの全entryについて次を検証する。

1. fileが存在する
2. logical pathと実体pathが記録されたworkspace内にある
3. 現在のSHA-256が生成直後のSHA-256と一致する

全entryの検証が成功するまで、削除またはbackupからの復元を開始しない。1件でも失敗した場合はexecutorをabortする。

## Artifact transaction

recordのartifact種別に応じて削除またはbackupからの復元を行う。処理完了後はrecordが保持していたstagingとbackupをcleanupし、cleanup failureがあってもartifact operationの結果を巻き戻さない。cleanup failureはOutputへ記録する。

artifact operationの途中で削除または復元が失敗した場合は、executorはfailureを呼び出し側へ返す。削除済みartifactの自動復元はこのcontractの責務外とする。
