---
description: lint/format自動修正の方針
applyTo: "**/*"
---

## 自動修正方針

- lintまたはformatエラーを手作業で修正する前に、既存の自動修正commandを確認する。
- 通常は`pnpm run check:fix`を優先する。
- lintだけを修正する場合は`pnpm run lint:fix`を使用する。
- formatだけを修正する場合は`pnpm run format:fix`を使用する。
- AIがlintまたはformatの細かい修正で詰まった場合は、個別に悩み続けず`pnpm run lint:fix`または`pnpm run format:fix`を使う。
- lintとformatの両方に関係する場合は、`pnpm run check:fix`を使う。
- 自動修正の前に`git status --short`で作業ツリーを確認する。
- 自動修正後に差分を確認し、現在のタスクと無関係な変更を含めない。
- ユーザーまたは別作業の未コミット差分へ自動修正が及ぶ可能性がある場合は、勝手に実行しない。
- 自動修正で解消しない問題だけを個別に調査する。
- 自動修正commandの設定変更は、単なる警告解消を理由に行わない。
