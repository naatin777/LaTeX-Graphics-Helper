# タスク: Stop hookのdirty worktree方針を決める

## Status

Done

## 目的

AI停止時に`pnpm run check:fix`を実行する既存Stop hookが、ユーザーや別作業の未コミット差分を意図せず変更しないための実行条件と失敗時の扱いを決める。

## 決めること

- clean / dirty worktreeでhookを実行する条件
- task対象fileと無関係な差分へ自動修正が及ぶ場合の扱い
- 自動修正前後の差分を判定する方法
- hookをskip・失敗・警告のどれにするか
- formatterが複数fileへ変更を加えた場合の復元責任
- Stop hookに残す処理と、task skillへ移す処理

## 決定

Stop hook単体では、dirtyなfileが現在taskの変更か、ユーザーや別作業の変更かを確実に判定できない。そのため、task対象fileだけがdirtyな場合も含め、worktreeがdirtyなら`pnpm run check:fix`を実行しない。

dirty判定には、staged、unstaged、未追跡fileを含む`git status --porcelain=v1 --untracked-files=all`を使う。Git管理外の`.latex-graphics-helper/`にあるhook logは判定対象に含めない。

| worktreeの状態                           | Stop hookの動作                      | 終了時の扱い                                            |
| ---------------------------------------- | ------------------------------------ | ------------------------------------------------------- |
| clean                                    | 既存の`pnpm run check:fix`を実行する | 成功時はexit 0。修正が発生した場合は保持する            |
| task対象fileだけdirty                    | 自動修正をskipする                   | stderrまたはlogへ警告し、stdoutへ`{}`だけを出してexit 0 |
| 無関係なfileを含めてdirty                | 自動修正をskipする                   | stderrまたはlogへ警告し、stdoutへ`{}`だけを出してexit 0 |
| Git rootまたはworktree状態を確認できない | 自動修正をskipする                   | stderrへ警告し、stdoutへ`{}`だけを出してexit 0          |
| clean状態で開始した`check:fix`が失敗     | 自動復元しない                       | stdoutのJSONを維持し、stderrとlogで失敗を知らせてexit 1 |

dirtyによるskipは安全のための正常動作であり、hookの失敗にはしない。実際に開始した`check:fix`の失敗だけをhook失敗として扱う。

### 自動修正前後の差分

- Stop hookは、自動修正前にworktreeがcleanであることだけを確認する。
- clean状態から`check:fix`が変更したfileはhookによる変更として保持し、実行後のworktree状態として確認する。
- commandが途中まで変更して失敗した場合も、`git restore`、`git reset`、`git clean`、stash、逆patchによる自動復元を行わない。
- formatterが複数fileを変更しても、Stop hookは一括復元しない。自動復元は同時編集された差分を失う可能性があるためである。
- 失敗または想定外の変更は保持して報告し、どの変更を戻すかは差分を確認してから決める。

### Stop hookとtask skillの責務

Stop hookには、Git rootとdirty状態の確認、危険な場合のskip、JSON出力、log、単純なexit code制御だけを残す。現在taskの読み込み、変更可能fileの判定、baseline管理、command選択、変更scopeの判定、handoffは持たせない。

自動修正の利便性は、taskのbaselineと所有fileを把握できる将来のtask skillで扱う。task skillが自動修正を実行できるのは、少なくとも次を満たす場合に限定する。

- task開始時のworktree状態を記録している
- 現在taskの変更可能fileと、実際の変更fileを照合できる
- ユーザーや別作業の既存差分がない、または対象外差分へ触れないfile単位のcommandを使える
- 自動修正後にstaged、unstaged、未追跡fileを再確認し、変更pathがtask scope内であることを確認できる
- pathを比較するときは空白、Unicode、改行を含む名前を行単位で解析せず、GitのNUL区切り出力を使う

共有worktreeに既存差分がある状態で、repository全体を対象とする`check:fix`は実行しない。専用worktreeの利用条件とtask skillの具体的なbaseline形式は、0159と0160で決める。

scope外のfileが変更された場合や自動修正が失敗した場合、task skillはhandoffを失敗扱いにして変更fileを報告する。ただし、共有worktreeでは自動復元しない。

### 後続タスク

- 0169で、clean、task対象だけdirty、無関係なfileを含むdirty、途中失敗、stdout JSONの安全テストを追加する。
- 0170で、追加済みテストを通す最小のdirty worktree guardを`.rulesync/hooks/stop-fix.sh`へ実装する。
- 0159で、baselineとtask scopeを把握したhandoff時の自動修正をtask skillへ含めるか設計する。

この方針はADR-0014の「Hooksは仕様判断を含まない、安価で決定的な自動処理」という責務を具体化する運用詳細である。永続する設計判断を増やさないため、新しいADRは作成しない。

## 完了条件

- ユーザーの既存差分を暗黙に書き換えない方針がある
- Stop hookのstdout JSON制約を維持している
- hookが失敗しても作業結果を失わない設計になっている
- 自動修正の利便性を残す条件を明記している
- 実装が必要な場合はtestと実装を別タスクへ分けている
- hook、script、RuleSync生成物をこのタスクで変更していない

## 変更可能なファイル

- `docs/tasks/0164-design-safe-stop-fix-hook.md`
- `docs/tasks/0169-add-safe-stop-hook-worktree-tests.md`
- `docs/tasks/0170-implement-safe-stop-hook-worktree-guard.md`
- `docs/tasks/README.md`
- 必要な`docs/adr/`

## 対象外

- `.rulesync/hooks/stop-fix.sh`の変更
- RuleSync生成物の変更
- lint / format commandの変更
- application、test、CI、dependencyの変更

## 関連

- [ADR-0001: AI向け作業ルールをRuleSyncで管理しAGENTS.mdへ生成する](../adr/0001-use-agents-md-for-codex-rules.md)
- [ADR-0014: AI開発ハーネスの責務と導入順を定義する](../adr/0014-define-ai-development-harness.md)
- [0037: RuleSyncのStop hookでlint/format自動修正を実行する](0037-add-rulesync-stop-fix-hook.md)

## 確認方法

- clean、task対象だけdirty、無関係なfileがdirtyの3例で方針を確認する
- `git diff --check`

## 確認結果

- clean時だけ既存の`check:fix`を実行し、dirty時はtask対象だけでもskipする方針を決めた
- dirty skipは警告付きexit 0、実行した`check:fix`の失敗はJSON出力を維持したexit 1とした
- Stop hookとtask skillの責務、自動修正前後のscope確認、自動復元しない方針を分離した
- safety testを0169、最小実装を0170として分けた
- hook、script、RuleSync生成物、application、test、CI、dependencyは変更していない
- `git diff --check` 成功
