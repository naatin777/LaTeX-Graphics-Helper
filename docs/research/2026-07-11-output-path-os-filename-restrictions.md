# outputPathのOS別ファイル名制限調査

## 調査日

2026-07-11

## 対象

- Windowsのファイル名規則
- POSIX.1-2024のファイル名規則
- Node.js `node:path`のOS別挙動
- `resolveOutputPath`の現行実装

## 公式情報源

- [Microsoft: Naming Files, Paths, and Namespaces](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file)
- [Microsoft: Support for Whitespace characters in File and Folder names](https://learn.microsoft.com/en-us/troubleshoot/windows-client/shell-experience/file-folder-name-whitespace-characters)
- [The Open Group Base Specifications Issue 8: Definitions](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap03.html)
- [Node.js: Path](https://nodejs.org/download/release/latest-v20.x/docs/api/path.html)

## 確認できた事実

### Windows

Windowsでは、path componentに次の文字を使用できない。

- `< > : " / \\ | ? *`
- NUL
- 文字コード1から31の制御文字

次の名前は大文字小文字を問わず予約され、拡張子が続く場合も使用できない。

- `CON`, `PRN`, `AUX`, `NUL`
- `COM1`から`COM9`、`COM¹`から`COM³`
- `LPT1`から`LPT9`、`LPT¹`から`LPT³`

path componentの末尾を半角空白またはピリオドにしてはいけない。

先頭または末尾の半角空白は作成時に削除される。末尾のピリオドも削除されるため、設定した名前と実際の名前が一致しない可能性がある。

全角空白`U+3000`など、半角空白以外の空白文字は同じ扱いではない。ただし末尾の非ASCII空白はFile Pickerから見えない場合がある。

### POSIX系OS

POSIX.1-2024では、filenameに含められないものはNULと`/`である。実際のfilesystemは追加制限を持つ可能性がある。

Windowsで禁止される`?`、`*`、`:`などは、POSIXの一般規則ではfilenameに使用できる。

### Node.js

`node:path`の既定挙動は実行OSで変わる。

- WindowsではWindows形式のpathを扱う
- POSIXではPOSIX形式のpathを扱う
- `path.win32`を使うと、macOSやLinuxでもWindows形式のpath componentを解析できる

### 現行実装

`src/config/resolve_output_path.ts`はテンプレート変数を展開し、`path.normalize`または`path.resolve`を行うだけである。

OSで禁止される文字、予約名、先頭末尾空白、末尾ピリオドは検証していない。そのため現在は、実際の`mkdir`や`writeFile`まで進んでからOS由来のエラーになるか、Windowsで意図しない別名になる可能性がある。

## 提案

### 自動置換しない

禁止文字を`_`などへ自動置換しない。

理由:

- `settings.json`の指定と実際の出力名が変わる
- 異なる設定が同じ出力名へ衝突する可能性がある
- Safe Modeの競合判断より前に別名へ変わると挙動を理解しづらい

### 変換開始前に明示的なエラーにする

テンプレート展開後、`.latex-graphics-helper`配下へのコピーや出力生成を始める前に検証する。

エラーには少なくとも次を含める。

- 問題のあるpath component
- 禁止文字、予約名、または空白・ピリオドのどれが理由か
- 自動置換していないこと

### OS規則を注入してテストする

実際に禁止名を作成するテストへ依存せず、path検証処理へ`win32`または`posix`規則を渡せるようにする。

これにより、macOS・LinuxでもWindows規則をテストできる。Windows CIでは、commandが設定エラーを通知し、出力と作業ディレクトリを作らないことも確認する。

## 想定する失敗テスト

### Windows規則

- 各禁止文字を含むcomponentを拒否する
- 制御文字を拒否する
- 予約デバイス名を大文字小文字非依存で拒否する
- 予約デバイス名に拡張子が続く場合も拒否する
- 先頭または末尾の半角空白を拒否する
- 末尾のピリオドを拒否する
- drive letterの`:`は拒否しない
- path separator自体はcomponentの禁止文字として扱わない

### POSIX規則

- NULを拒否する
- `/`はseparatorとして扱う
- Windows専用の禁止文字や予約名を一律には拒否しない

### 共通の正常系

- 多言語文字、絵文字、全角英数字、途中の半角空白、全角空白を許可する
- 現在の複雑なUnicodeファイル名テストを維持する

### command

- `outputPath.cropPdf`が無効な場合はユーザーへ理由を通知する
- crop処理、Safe Modeの競合確認、出力作成を開始しない

## 決定

2026-07-11に、実際にファイル操作を行うExtension HostのOS規則で拒否する方針を採用した。

- local workspaceではlocal OSを使う
- WSL・SSH・Dev Containerではremote Extension HostのOSを使う
- Windows専用の禁止文字・予約名をmacOS/Linuxで一律には拒否しない
- 自動置換は行わない

正式仕様は[outputPath検証仕様](../specs/internal/output-path-validation.md)を正本とする。

## 再確認条件

- Node.jsのpath処理に破壊的変更が入った場合
- Windowsのファイル名規則またはLong Path対応方針を変更する場合
- remote workspace、WSL、SSH先のOSをHost OSと別に判定する場合
- outputPathをURI基準で扱う設計へ変更する場合
