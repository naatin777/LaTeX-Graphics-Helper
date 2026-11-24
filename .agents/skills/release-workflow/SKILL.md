---
name: Release Workflow
description: PR のマージ、バージョンバンプ、タグ、公開の依頼時にロードする手順。
---

- `main` に直接 push しない。変更は feature ブランチから PR へ。
- マージは `gh pr merge --squash` のみ。
- マージは明示的な指示まで行わない。
- コミットと PR タイトルは Conventional Commits 形式。
- コミット前に PII スキャン。
- リリース: バンプ PR → merge → `git tag vX.Y.Z origin/main` → push → workflow。
- Marketplace / Open VSX ともに OIDC。
- 公開後: Release タイトルと Open VSX `version` を確認。
