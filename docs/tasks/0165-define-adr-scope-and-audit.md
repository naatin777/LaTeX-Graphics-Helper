# タスク: ADRの役割を定義し既存ADRを監査する

## Status

Done

## 目的

このprojectにおけるADRの役割と、ADRへ含める情報・含めない情報を定義する。

定義した基準で既存ADRを監査し、肥大化したADR-0014は永続する設計判断だけへ縮小する。他のADRはこのタスクで一括改稿せず、問題があるものを具体化して必要なら別タスクに分ける。

## 決めること

- ADRが記録する設計判断の単位
- ADRへ含める見出し
- task、spec、research、RuleSync、skill、運用guideとの境界
- ADRを追記・改訂・置換・廃止する条件
- 実装手順、チェックリスト、ロードマップをADRへ置かない基準
- 既存ADR-0001〜0014の状態分類

## 完了条件

- `docs/adr/README.md`に、このprojectのADR方針が記録されている
- `docs/adr/0000-template.md`がADR方針に沿った短いtemplateになっている
- ADR-0014がAI開発ハーネスの責務境界という1つの永続判断に絞られている
- ADR-0014から外した情報の参照先が失われていない
- ADR-0001〜0014を同じ基準で確認し、維持・要整理・置換候補を理由付きで分類している
- 他ADRの一括書き換えを行っていない
- 必要な後続タスクが1タスク1目的で作られている

## 変更可能なファイル

- `docs/adr/README.md`
- `docs/adr/0000-template.md`
- `docs/adr/0014-define-ai-development-harness.md`
- `docs/tasks/0165-define-adr-scope-and-audit.md`
- `docs/tasks/README.md`
- 監査で必要と判断した新規`docs/tasks/*.md`

## 対象外

- ADR-0001〜0013の本文変更
- application、test、CI、RuleSync、hook、skillの変更
- ADR番号・file名の一括変更
- dependency追加

## 関連

- [ADR template](../adr/0000-template.md)
- [ADR-0014: AI開発ハーネスの責務を分離する](../adr/0014-define-ai-development-harness.md)
- [ADR-0004: タスクをdocs/tasksで管理する](../adr/0004-manage-tasks-with-markdown.md)

## 確認方法

- 全ADRを新しい基準へ当てはめて分類する
- ADR-0014から外した情報がtaskまたは関連文書から確認できることを確認する
- `git diff --check`

## 監査結果

| ADR  | 分類             | 理由と扱い                                                                                        |
| ---- | ---------------- | ------------------------------------------------------------------------------------------------- |
| 0001 | 分離タスク       | RuleSync正本の判断にStop hookのcommand、log、stdout制約が混在している。0166で判断を変えず分離する |
| 0002 | 維持             | 日本語正本とREADME翻訳方針という1つの判断に閉じている                                             |
| 0003 | 維持             | リファクタリング案を即時実施せずbacklog管理する判断に閉じている                                   |
| 0004 | 軽微整理候補     | task必須項目と完了手順はtask template・READMEの責務だが、現時点で判断を妨げていない               |
| 0005 | 軽微整理候補     | 事前確認・報告手順はRuleSyncの責務だが、小差分を優先する判断は明確である                          |
| 0006 | 軽微整理候補     | symlink、template、rollbackの詳細はspecの責務だが、workspace stagingの判断は明確である            |
| 0007 | 軽微整理候補     | SHA-256などの安全条件はspecの責務だが、専用Undo commandの判断は明確である                         |
| 0008 | 軽微整理候補     | 競合時の詳細flowはspecの責務だが、Safe Modeをglobal管理する判断は明確である                       |
| 0009 | 軽微整理候補     | 旧alias履歴と段階導入順はspec・taskの責務だが、出力形式基準commandの判断は明確である              |
| 0010 | 軽微整理候補     | tool別の検証手順はCIの責務だが、settings経由で検証する判断は明確である                            |
| 0011 | 分離タスク       | 言語方針にPR・commit templateが混在している。0167で正本へ分離する                                 |
| 0012 | 軽微整理候補     | scratchの実行詳細はspecの責務だが、Windows外部toolの限定例外という判断は明確である                |
| 0013 | 分離タスク       | Electron採用判断にversion、theme、fixture、golden、task順が混在している。0168で分離する           |
| 0014 | このタスクで整理 | AI開発ハーネスの責務境界と共有・個人設定の境界だけへ縮小した                                      |

軽微整理候補は行数だけを理由に改稿しない。関連する判断または正本を次に変更するとき、同じ差分で混在を解消できる場合だけ整理する。

## 実施結果

- `docs/adr/README.md`でADRの目的、対象、対象外、状態、更新方法、分割条件を定義した
- ADR templateを93行から37行へ縮小した
- ADR-0014を197行から91行へ縮小し、一時的なbranch・model・CI・導入順を関連taskへ移した
- ADR-0001〜0014を同じ基準で監査した
- 優先して分離するADR-0001、0011、0013を独立した後続タスクへ分けた
