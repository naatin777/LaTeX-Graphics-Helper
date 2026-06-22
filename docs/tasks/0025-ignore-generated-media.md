# タスク: 生成されたmediaフォルダをGit管理から外す

## Status

Done

## 目的

Webviewのbuild生成物である`media/`をGitの差分へ含めないようにする。

## 完了条件

- `.gitignore`に`media/`がある
- 既存のmediaファイルを実ファイルとして残す
- 既存のmediaファイルをGitの追跡対象から外す

## 変更可能なファイル

- `.gitignore`
- `media/`
- `docs/tasks/README.md`
- `docs/tasks/0025-ignore-generated-media.md`

## 対象外

- Webview build設定の変更
- media生成処理の変更

## 関連

- `.vscode-test.mjs`

## 確認方法

- `git status --ignored`

## 実施結果

- `.gitignore`に`media/`を追加した
- `git rm --cached`で実ファイルを残したままGitの追跡対象から外した
