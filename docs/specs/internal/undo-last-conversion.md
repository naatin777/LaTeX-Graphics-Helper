# 直前の変換取消の内部契約

直前の変換取消に関する利用者向け操作と結果は、[product specification](../product/undo-last-conversion.md)を正本とする。この文書は、record state、取消前validation、artifact executor、cleanupのtransactionだけを記録する。

## Record state

成功した変換について、session memoryへstack形式で記録する。recordは次を保持する。

- output artifactのpath
- 対象workspaceのpath
- 生成直後のcontent SHA-256
- overwrite時のbackup pathとbackup SHA-256

SHA-256はNode.jsのstreaming readで計算する。次の変換が成功しても既存recordは置き換えず、各recordが参照するstagingとbackupを保持する。新しいrecordの作成に失敗した場合は既存historyを変更しない。extension restart後はhistoryを復元しない。

## Session history flow

```mermaid
flowchart TD
    subgraph CONVERSION[変換成功後]
        A[commit済みoutput] --> B[createConversionUndoRecord]
        B --> C[outputPathのworkspace境界を検証]
        C --> D[outputのSHA-256をstreaming hashで計算]
        D --> E{previousFilePathあり?}
        E -->|Yes| F[backupの存在・workspace境界を検証]
        F --> G[backupのSHA-256を計算]
        E -->|No| H[previousSha256なし]
        G --> I[ConversionUndoRecordを生成]
        H --> I
        I --> J[conversionHistoryへpush]
        J --> K[対象recordのstagingからbackup以外をcleanup]
    end

    K --> L{undoLastConversionCommand}
    L -->|history empty| M[通知して終了]
    L -->|historyあり| N[history.at(-1)を対象にする]
    N --> O{expectedIdとrecord.idが一致?}
    O -->|No| P[新しい変換があるため変更せず終了]
    O -->|Yes| Q[全outputをvalidateUnchangedOutput]
    Q --> R[現在のoutputの存在・workspace境界を検証]
    R --> S[現在のoutputのSHA-256を再計算]
    S --> T{現在SHA === 記録SHA?}
    T -->|No| U[編集済みとして全件変更せず失敗]
    T -->|Yes| V{previousFilePathあり?}
    V -->|Yes| W[backupの存在・境界・SHA-256を検証]
    V -->|No| X[復元不要]
    W --> Y[rollback用に現在outputを別backupへcopy]
    X --> Y
    Y --> Z{対象outputを再検証}
    Z -->|失敗| U
    Z --> AA{previousFilePathあり?}
    AA -->|Yes| AB[backupをoutputPathへcopy]
    AA -->|No| AC[outputPathを削除]
    AB --> AD{全output成功?}
    AC --> AD
    AD -->|No| AE[rollback backupからoutputを復旧]
    AE --> AF[historyを変更せず失敗]
    AD -->|Yes| AG[対象recordのstagingとbackupをcleanup]
    AG --> AH[conversionHistory.pop]
    AH --> AI[Undo成功通知]
```

## Validation ownership

Undo executorはartifactへ変更を加える前に、recordの全entryについて次を検証する。

1. fileが存在する
2. logical pathと実体pathが記録されたworkspace内にある
3. 現在のSHA-256が生成直後のSHA-256と一致する

全entryの検証が成功するまで、削除またはbackupからの復元を開始しない。1件でも失敗した場合はexecutorをabortする。

## Artifact transaction

recordのartifact種別に応じて削除またはbackupからの復元を行う。処理完了後は対象recordが保持していたstagingとbackupをcleanupし、cleanup failureがあってもartifact operationの結果を巻き戻さない。cleanup failureはOutputへ記録する。古いrecordのartifactは、そのrecordがhistoryに残っている間は削除しない。

artifact operationの途中で削除または復元が失敗した場合は、executorはfailureを呼び出し側へ返す。削除済みartifactの自動復元はこのcontractの責務外とする。
