# Safe Modeの内部契約

Safe Modeの利用者向け状態、選択肢、出力結果は、[product specification](../product/safe-mode.md)を正本とする。この文書は、state persistence、conflict resolution、backup、commit、cleanup、Undo integrationだけを記録する。

## State ownership

- stateは`ExtensionContext.globalState`へ保存する。
- stateはVS Code profile全体で共通とする。

## Conflict resolution boundary

1回の変換batchについて、commit前のconflict resolutionは1回だけ行う。resolution resultは全conflicting artifactへ適用するcommit coordinatorの入力とし、fileごとの個別promptは作らない。

## Backup and commit

- overwriteを行うcommitでは、既存fileをworkspace内のoperation artifactへbackupする。
- backup作成とwriteの前にworkspace boundaryを検証する。
- commit途中で失敗した場合は、今回作成したartifactを除去し、overwrite済みのfileをbackupから復元する。
- Safe Modeのstateにかかわらず、Undoとfailure rollbackが必要な既存fileはbackup対象とする。

## Staging and backup lifetime

- conversion failureまたはcancel時は、今回のstagingを削除する。
- success時は、Undo recordが必要とするbackupだけを保持し、生成結果や入力copyなどのstagingは削除する。
- 新しいUndo recordを記録したとき、古いrecordだけが参照するartifactを削除する。新しいrecordの作成に失敗した場合は古いrecordを保持する。
- Undo成功後は、そのrecordのbackupを含むartifactを削除する。cleanup failureはconversionやUndoの成功を取り消さない。
- extension activationでは`.latex-graphics-helper/`全体を削除せず、別windowのactive staging、Undo backup、未知directory、harness logを保護する。
- Windows外部toolの診断用ASCII scratchは通常のoperation artifactと別管理する。

## Undo integration

commit coordinatorが作成したartifactとoverwrite backupは、[Undo internal contract](undo-last-conversion.md)のrecordへ渡す。Safe ModeはUndo recordの保存形式や取消前検証を重複して定義しない。
