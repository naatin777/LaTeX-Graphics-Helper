# ADR-0010: CIの外部ツール検証はVS Code設定経由で行う

## ステータス

採用

## 日付

2026-07-01

## 背景

LaTeX Graphics Helperは、PDF・SVG・Mermaid・Draw.io関連の変換で外部ツールを使用する。

代表的な外部ツールは以下である。

- Ghostscript
- Poppler / `pdftocairo`
- `rsvg-convert`
- Google Chrome / Chromium
- Draw.io Desktop

拡張機能本体は、これらの実行ファイルパスを `settings.json` から読む設計になっている。

一方で、GitHub Actions上の検証が `PATH` や環境変数に依存すると、実際の拡張機能の設定経路とは違う経路で成功してしまう。これでは、ユーザーが `settings.json` で指定した実行パスを使えるかどうかの確認にならない。

## 決定

GitHub Actionsで外部ツールを検証するときは、インストール後に `test/fixtures/workspace/.vscode/settings.json` へ実行ファイルパスを書き込む。

検証スクリプトは、`PATH` や環境変数から実行ファイルを探さない。必ず `settings.json` に書かれた値を読み、そのパスを実行する。

## 理由

- 拡張機能本体と同じ設定経路をCIで確認できる
- `PATH` に偶然存在するツールでテストが通る状態を避けられる
- Windowsのように実行ファイルがPATHへ入りにくい環境でも、設定値ベースで安定して確認できる
- ユーザーが `settings.json` で実行ファイルを明示する運用とCIの前提を揃えられる

## 結果・影響

- CIのインストールスクリプトは、実行ファイルを見つけた後に `settings.json` へ書き込む責務を持つ
- CIの検証スクリプトは、`settings.json` の値を読み、その値だけを使って実行確認する
- Chrome / Chromiumも、Puppeteerの `executablePath` 設定として `settings.json` に明示する
- `PATH` 上にツールが存在していても、`settings.json` の値が誤っていれば検証は失敗する
- WindowsではChromeを直接実行するとGUIアプリとして起動して戻らない可能性があるため、検証スクリプトでは存在確認とファイルバージョン確認に留める。Puppeteer経由の実利用は既存のMermaid/SVG変換テストで確認する。

## 運用ルール

- 外部ツールのCI検証では `command -v` やOS標準の探索を検証スクリプト側で行わない
- 探索が必要な場合はインストールスクリプト側だけで行い、その結果を `settings.json` に保存する
- 実行確認は `settings.json` に保存されたパスを使う
- `rsvg-convert` と `pdftocairo` はバージョン表示だけでなく、小さなSVG/PDF/PNG変換で実体を確認する
- Chrome / Chromiumは `settings.json` の `executablePath` に保存された実体パスを確認する。Windowsでは直接起動しない
- Draw.io DesktopのGUI実体検証は重く不安定になりやすいため、必要になった時点で別タスクとして扱う

## 見直す条件

- 拡張機能側の外部ツール設定方法を `settings.json` 以外へ変更するとき
- CIでDraw.io Desktopの実体起動確認が必要になったとき
- 外部ツールを同梱する設計へ変更するとき

## 関連

- `docs/specs/output-format-conversion.md`
- `docs/specs/file-operation-security.md`
- `docs/tasks/0066-verify-ci-external-tools.md`
