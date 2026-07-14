# Codex skill と agent routing の確認メモ

## 確認日

2026-07-14

## 目的

`task実行とLuna委譲を行うskill` を設計するため、現行Codex仕様でのskill配置、呼び出し方法、AGENTS.md、hooks、rules、subagentの責務境界を確認する。

## 確認した公式情報源

- Codex Manual: Build skills
  - Source: <https://learn.chatgpt.com/docs/build-skills.md>
  - local manual lines: `7975-8129`
- Codex Manual: Custom instructions with AGENTS.md
  - Source: <https://learn.chatgpt.com/docs/agent-configuration/agents-md.md>
  - local manual lines: `8375-8506`
- Codex Manual: Subagents
  - Source: <https://learn.chatgpt.com/docs/agent-configuration/subagents.md>
  - local manual lines: `216-540`
- Codex Manual: Hooks
  - Source: <https://learn.chatgpt.com/docs/hooks.md>
  - local manual lines: `8718-9154`
- Codex Manual: Rules
  - Source: <https://learn.chatgpt.com/docs/agent-configuration/rules.md>
  - local manual lines: `9568-9703`
- Codex Manual: Advanced Configuration
  - Source: <https://learn.chatgpt.com/docs/config-file/config-advanced.md>
  - local manual lines: `2663-3071`

Manual helper result:

- Manual path: `/var/folders/6w/_991xjnj7490zfhl9n2pvr0c0000gn/T/openai-docs-cache/codex-manual.md`
- Outline path: `/var/folders/6w/_991xjnj7490zfhl9n2pvr0c0000gn/T/openai-docs-cache/codex-manual.outline.md`
- Status: `local manual was already current`

## 確認できたこと

### skillの配置

Codexはrepository、user、admin、systemのskill場所を読む。

このprojectでtask実行workflowを共有するなら、repository rootの `.agents/skills` が適切。理由は、このworkflowがこのrepositoryのtask、ADR、RuleSync rule、branch運用に依存するため。

個人のmodel preferenceや承認頻度はskillへ固定しない。個人設定は `~/.codex/config.toml` や個人のagent設定で扱う。

### skillの呼び出し

skillは明示呼び出しと暗黙呼び出しの両方で使われる。暗黙呼び出しはfrontmatterの `description` に依存するため、trigger条件と非対象を短く明確に書く必要がある。

このprojectのtask workflow skillは、暗黙呼び出しを許可してよい。ただし「全タスクへ長い手順を強制するskill」ではなく、「docs/tasksのCurrent Taskまたは指定taskを進めるときに使うskill」としてtriggerを限定する。

### AGENTS.mdとの境界

AGENTS.mdはCodexが作業前に読む恒久的なproject guidanceである。よって、変更範囲、1タスク1目的、PR運用、確認方針など、常に守る短い制約を置く。

skillには、毎回読むには長い反復手順、task種別ごとの確認選択、Luna委譲prompt、handoff summaryの型を置く。AGENTS.mdとskillに同じ長い手順を重複させない。

### hooks / rulesとの境界

hooksはturnやtool使用のlife cycleで動く機械的処理に向く。仕様判断、設計判断、PR判断をhooksへ入れない。

rulesはsandbox外実行の許可制御に向く。開発workflowや委譲判断をrulesへ入れない。

### subagent / Luna委譲

公式manualでは、subagentは独立した探索、test/log調査、triage、summarizationなどに向く。書き込みを並列化する場合はownershipを明確にし、同じfileを編集しない必要がある。

このprojectでは当面、Codex本体を統合責任者とし、Luna `xhigh` への委譲は読み取り中心または独立した小さいpatchに限定する。

## 設計への反映

- 共有skillとして `.agents/skills/lgh-task-runner` を候補にする
- skill実装は別タスクで行う
- skillはinstruction-onlyから開始し、scriptは追加しない
- skillに含めるのは以下に限定する
  - task開始時の読み取り順
  - task種別ごとの最小確認command選択
  - Lunaへ委譲する条件、しない条件
  - Luna promptに含める目的、ownership、禁止事項、期待出力
  - boundary-heavy変更時の確認項目
  - handoff / PR本文の最小構造
- skillに含めないもの
  - 個人のmodel既定値、承認設定、使用量節約方針
  - hookの実装詳細
  - rulesのallow list
  - CI workflowの具体実装
  - task固有の仕様判断

## 未確認・見直し条件

- Codexのskill配置やfrontmatter仕様が変わった場合は再確認する
- project-local skillを実装後、実際に暗黙呼び出しされるかは別タスクで確認する
- Luna model名、reasoning level、利用可能性は個人またはworkspaceの環境に依存するため、skillでは「指定できる場合」の手順に留める
- custom agent fileを作るかどうかは、skill実装後に必要性を見て別タスク化する
