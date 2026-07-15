---
description: コメント、言語、外部調査の方針
applyTo: >-
  docs/**/*,README.md,README.ja.md,PROJECT_STATE.md,package.nls.json,package.nls.ja.json
---

## コメント方針

- コメントアウトしたコードを残さない。
- コメントは「何をしているか」ではなく「なぜ必要か」を書く。
- TODO には、対応する条件を書く。

良い例:

```ts
// TODO: 基本の変換フローが安定したら、batch cancellation に対応する。
```

悪い例:

```ts
// TODO: あとで綺麗にする。
```

## README / 言語方針

- メンテナは日本語で仕様・判断を書く。
- `README.ja.md` を意味の正本として扱ってよい。
- `README.md` は `README.ja.md` を元に自然な英語へ翻訳する。
- 英語READMEでは、実装以上に機能を盛らない。
- 作業用ドキュメントは日本語でよい。
- 成果物ごとの詳細な言語方針は `docs/adr/0011-define-language-policy-for-project-artifacts.md` に従う。
- PR title、commit message、branch name、CHANGELOG、CI名、コード識別子、設定キーは英語にする。
- 仕様、ADR、タスク、調査メモ、PROJECT_STATE、AGENTS、test suite / test nameは日本語にする。

## 外部調査の記録方針

- 外部仕様、dependency、CLI、規格をWebで調査し、実装判断に影響する結果は`docs/research/`へ記録する。
- 調査日、対象version、公式情報源、確認できた事実、未確認事項、再確認条件を含める。
- 可能な限り公式documentation、公式repository、公式release情報を使用する。
- Webページ全体を転記せず、判断を再現するために必要な事実だけを書く。
- 推測と確認済みの事実を区別する。
- 採用判断はADR、正式仕様はspecへ移し、research noteを正式仕様の代用にしない。
- 最新情報が変わる可能性がある場合は、research noteだけを信用せず実装時に公式情報を再確認する。
