---
description: Git、PR、作業報告の方針
applyTo: "**/*"
---

## commit / PR 方針

- 作業開始時は、リモートから最新の`next/v1`を取得し、その先端からtask branchを作成する。
- `next/v1`へ直接commitまたはpushしない。
- task branchから作成するPRのbaseは`next/v1`とする。
- `next/v1`から`main`へのPRは、ユーザーから明示的に依頼されるまで作成しない。
- commit messageはConventional Commitsを基本にする。
- commit messageは `<type>(<scope>): <description>` または `<type>: <description>` の形にする。
- descriptionは英語の小文字始まりにし、末尾にピリオドを付けない。
- 例: `docs: document project language policy`, `fix(pdfcrop): normalize Windows paths`, `test(convert): add PNG output coverage`
- 1つのcommitには1つの目的だけを含める。
- PR titleは英語で、PR全体の目的が分かる短い文にする。
- PR bodyは `.github/PULL_REQUEST_TEMPLATE.md` に沿って書く。
- PR bodyの `Verification` には実行した確認コマンドを書く。
- 確認できていないことを、確認済みのように書かない。

## PR review comment対応

- PR作成後またはPR更新後は、CI結果だけでなくGitHub上のreview commentsも確認する。
- 導入されていない自動レビューの投稿を待ったり、存在しないレビューを再確認したりしない。
- 未解決のactionableなコメントは、内容を読んで妥当性を判断する。
- 妥当な指摘は修正し、関連テストまたは`pnpm run check`で確認してからpushする。
- 判断が分かれる指摘、仕様変更を含む指摘、既存方針と衝突する指摘は、勝手に修正せずユーザーに確認する。
- 自動レビューの提案コードをそのまま貼らず、既存コードの方針・エラー処理・テスト方針に合わせて実装する。
- コメント対応後は、同じPRのreview commentsをもう一度確認し、新しい未解決指摘がないか見る。
- ユーザーの明示指示なしに、GitHub上でコメント返信・review thread resolve・review submitは行わない。

## 作業後の報告

変更後は以下を説明する。

- 何を変更したか
- なぜ変更したか
- どう確認するか
- 仕様変更があるか
- 次にやるべきこと
