# ADR-0011: プロジェクト成果物ごとの言語を決める

## ステータス

採用

## 日付

2026-07-01

## 背景

ADR-0002で、仕様・ADR・タスク・作業メモは日本語を正本にし、READMEは`README.ja.md`を正本として`README.md`を英訳することを決めた。

一方で、PRタイトル、commit message、CHANGELOG、コード識別子、テスト名、VS Code表示文言などは、どちらの言語で書くべきかが明確ではなかった。

言語の判断が都度揺れると、AIに毎回説明する必要があり、公開向けの履歴や作業ドキュメントの品質も揺れやすい。

## 決定

プロジェクト成果物ごとの言語を以下のように決める。

| 対象                                   | 言語           | 理由                                                |
| -------------------------------------- | -------------- | --------------------------------------------------- |
| `docs/specs/`                          | 日本語         | 仕様の正確さを優先する                              |
| `docs/adr/`                            | 日本語         | 設計判断の正確さを優先する                          |
| `docs/tasks/`                          | 日本語         | 作業管理を止めない                                  |
| `docs/research/`                       | 日本語         | 調査結果を素早く再利用する                          |
| `PROJECT_STATE.md`                     | 日本語         | メンテナ向けの現在地メモとして扱う                  |
| `AGENTS.md`                            | 日本語         | AIが参照する作業ルールとして扱う                    |
| `README.ja.md`                         | 日本語         | READMEの意味の正本として扱う                        |
| `README.md`                            | 英語           | 公開向け入口として扱う                              |
| `CHANGELOG.md`                         | 英語           | リリース履歴は公開向けに読める形にする              |
| GitHub PR title                        | 英語           | 公開履歴・通知・一覧で読みやすくする                |
| GitHub PR body                         | 英語を基本     | 公開レビュー文脈で読みやすくする                    |
| commit message                         | 英語           | Git履歴・リリースノート生成・外部ツールと相性がよい |
| branch name                            | 英語           | Git操作・CI・URLで扱いやすい                        |
| issue title                            | 英語を基本     | 外部から見える一覧で読みやすくする                  |
| issue body/comment                     | 日本語でもよい | 詳細な相談や判断は正確さを優先する                  |
| TypeScriptの識別子                     | 英語           | コード慣習と外部APIに合わせる                       |
| command ID / config key                | 英語           | VS Code extension APIと設定名に合わせる             |
| ファイル名                             | 英語           | Git・CI・URL・importで扱いやすい                    |
| `package.nls.json`                     | 英語           | VS Code既定localeの表示文言として扱う               |
| `package.nls.ja.json`                  | 日本語         | 日本語localeの表示文言として扱う                    |
| ユーザー向け英語UI文言                 | 英語           | 既定localeの利用者向けにする                        |
| ユーザー向け日本語UI文言               | 日本語         | 日本語localeの利用者向けにする                      |
| test suite / test name                 | 日本語         | VS Code test出力をメンテナが読みやすくする          |
| test helper / variable / function name | 英語           | コードとして扱いやすくする                          |
| CI workflow名 / job名 / step名         | 英語           | GitHub Actions画面と外部向け履歴で読みやすくする    |
| shell / PowerShell script内のログ      | 英語           | CIログとして外部から読みやすくする                  |

PR bodyは英語を基本とするが、複雑な判断やメンテナ向けの補足には日本語を併記してよい。

ADR-0002は、作業ドキュメントを日本語で管理する基本判断として維持する。このADRは、ADR-0002で未定義だった成果物の言語を補完する。READMEの正本と翻訳方針はADR-0002に従う。

## 理由

- 正確さが必要な判断・仕様・作業管理は日本語の方が止まりにくい
- 公開履歴やGitHub一覧で目に入るものは英語の方が外部の人にも読める
- コード識別子や設定キーは英語の方がTypeScript、VS Code API、CLIと相性がよい
- テスト名は、メンテナがCIログを読む場面を優先して日本語にする

## 代替案

### すべて日本語にする

メンテナが最も速く書けるが、GitHubの公開履歴、PR一覧、CHANGELOGを外部から読みにくくし、コード識別子や設定名との一貫性も崩れるため採用しない。

### すべて英語にする

外部コントリビューターや公開履歴からは読みやすいが、仕様や判断の記録が遅くなり、ADR-0002で避けた問題に戻るため採用しない。

### README以外はすべて日本語にする

ADR-0002の運用は単純になるが、PR title、commit message、CHANGELOG、CIログなどの公開履歴まで日本語になり、外部ツールやGitHub上で扱いにくいため採用しない。

## 結果・影響

- AIや人が成果物の言語を選ぶときに迷いにくくなる
- 作業ドキュメントは引き続き日本語で素早く書ける
- 英語にする対象が増えるが、公開履歴・コード・UI文言などに限定する
- 既存の日本語テスト名は維持する
- PRとcommitの具体的な形式は、ADRではなくプロジェクトルールとテンプレートで管理する

## 見直す条件

- 日本語を読めないコントリビューターが継続的に参加するようになったとき
- MarketplaceやGitHub Releasesで英語CHANGELOGだけでは不足すると分かったとき
- テスト名の日本語が外部レビューの障害になったとき
- 公開成果物と作業ドキュメントの境界を変更するとき

## 関連

- [ADRの運用方針](README.md)
- [ADR-0001: AI向けruleの正本をRuleSyncで管理する](0001-use-agents-md-for-codex-rules.md)
- [ADR-0002: 日本語を作業ドキュメントの正本にする](0002-use-japanese-as-source-for-docs.md)
- [PR body template](../../.github/PULL_REQUEST_TEMPLATE.md)
- [AI向け作業ルール](../../AGENTS.md)
- [0068: commit messageとPR bodyの定型を決める](../tasks/0068-standardize-commit-and-pr-format.md)
- [0167: ADR-0011からPR・commit templateを分離する](../tasks/0167-separate-templates-from-language-adr.md)
- [`PROJECT_STATE.md`](../../PROJECT_STATE.md)
- [`README.ja.md`](../../README.ja.md)
- [`README.md`](../../README.md)
