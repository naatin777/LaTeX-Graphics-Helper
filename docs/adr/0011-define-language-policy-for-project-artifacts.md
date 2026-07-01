# ADR-0011: プロジェクト成果物ごとの言語を決める

## ステータス

採用

## 日付

2026-07-01

## 背景

ADR-0002で、仕様・ADR・タスク・作業メモは日本語を正本にし、READMEは `README.ja.md` を正本として `README.md` を英訳することを決めた。

一方で、PRタイトル、commit message、CHANGELOG、コード識別子、テスト名、VS Code表示文言などは、どちらの言語で書くべきかがまだ明確ではなかった。

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
| `AGENTS.md`                            | 日本語         | AI向け作業ルールの正本として扱う                    |
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

## 理由

- 正確さが必要な判断・仕様・作業管理は日本語の方が止まりにくい
- 公開履歴やGitHub一覧で目に入るものは英語の方が外部の人にも読める
- コード識別子や設定キーは英語の方がTypeScript、VS Code API、CLIと相性がよい
- テスト名は、メンテナがCIログを読む場面を優先して日本語にする

## 代替案

### すべて日本語にする

メリット:

- メンテナが最も速く書ける

デメリット:

- GitHubの公開履歴、PR一覧、CHANGELOGが外部から読みにくい
- コード識別子や設定名との一貫性が崩れる

### すべて英語にする

メリット:

- 外部コントリビューターや公開履歴から読みやすい

デメリット:

- 仕様や判断の記録が遅くなる
- ADR-0002で避けた問題に戻る

### README以外はすべて日本語にする

メリット:

- ADR-0002の運用が単純になる

デメリット:

- PR title、commit message、CHANGELOG、CIログなどの公開履歴まで日本語になり、外部ツールやGitHub上で扱いにくい

## 結果・影響

- AIや人がPR titleやcommit messageを書くときに迷いにくくなる
- 作業ドキュメントは引き続き日本語で素早く書ける
- 英語にする対象が増えるが、短い公開履歴・UI文言に限定する
- 既存の日本語テスト名は維持する

## 運用ルール

- ADR-0002は維持する。このADRは、ADR-0002で未定義だった成果物を補完する
- 迷った場合は「作業判断の正確さが重要なら日本語」「公開履歴・コード・外部APIなら英語」を基準にする
- PR titleとcommit messageは英語にする
- PR bodyは英語を基本にする。ただし、複雑な判断やメンテナ向け補足は日本語を併記してよい
- issue bodyやreview commentは、正確な意思疎通を優先して日本語でもよい
- READMEの意味が変わる場合は、先に `README.ja.md` を更新してから `README.md` へ反映する
- `package.nls.json` と `package.nls.ja.json` は同じ意味になるように更新する
- テスト名を英語へ戻さない。CIログ上の仕様把握を優先して日本語を使う

## 見直す条件

- 日本語を読めないコントリビューターが継続的に参加するようになったとき
- MarketplaceやGitHub Releasesで英語CHANGELOGだけでは不足すると分かったとき
- テスト名の日本語が外部レビューの障害になったとき

## 関連

- `docs/adr/0002-use-japanese-as-source-for-docs.md`
- `AGENTS.md`
- `PROJECT_STATE.md`
- `README.ja.md`
- `README.md`
