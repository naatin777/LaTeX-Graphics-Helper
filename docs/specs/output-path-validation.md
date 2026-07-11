# outputPath検証仕様

## 対象

`latex-graphics-helper.outputPath.*`をテンプレート展開して得られる出力パス。

## 基本方針

- 出力パスは、実際にファイル操作を行うExtension HostのOS規則で検証する
- local workspaceではlocal Extension Host、WSL・SSH・Dev Containerではremote Extension HostのOS規則を使う
- 禁止文字や禁止名を別の文字へ自動置換しない
- 無効な出力パスは変換開始前に拒否する
- 多言語文字、絵文字、全角英数字は、実行OSが禁止していない限り変更しない

理由:

- macOS・Linuxで有効な既存ファイル名を、Windowsとの移植性だけを理由に拒否しない
- 設定と異なる出力名を黙って作らない
- 自動置換による出力先衝突を起こさない

## 検証時点

テンプレート変数を展開し、絶対出力パスを解決した直後に検証する。

次の処理より前でなければならない。

- `.latex-graphics-helper`への入力コピー
- 変換用外部commandの起動
- 出力ファイルの生成
- Safe Modeの競合確認
- `withProgress`による変換開始

## Windows規則

path全体ではなく、rootを除く各path componentを検証する。

### 禁止文字

- `< > : " | ? *`
- NUL
- 文字コード1から31の制御文字

`/`と`\\`はpath separatorとして扱い、component内の文字として扱わない。

drive letterまたはvolume rootの`:`は許可する。

### 予約名

次の名前を大文字小文字非依存で拒否する。拡張子が続く場合も拒否する。

- `CON`, `PRN`, `AUX`, `NUL`
- `COM1`から`COM9`、`COM¹`から`COM³`
- `LPT1`から`LPT9`、`LPT¹`から`LPT³`

### 空白とピリオド

- 先頭または末尾が半角空白のcomponentを拒否する
- 末尾がピリオドのcomponentを拒否する

先頭半角空白も拒否する理由は、Windowsで削除され、設定と異なる名前になる可能性があるため。

全角空白`U+3000`はこの規則では拒否しない。

## POSIX規則

- NULを拒否する
- `/`はpath separatorとして扱う
- Windows専用の禁止文字や予約名は拒否しない

filesystem固有の追加制限で作成に失敗した場合は、そのfilesystem errorをユーザーへ通知する。

## エラー

エラーには次を含める。

- 実行OS
- 問題のあるpath component
- 禁止文字、予約名、空白、ピリオドのどれが理由か

自動置換や自動削除は行わない。

## テスト方針

OS規則を検証処理へ注入できるようにし、どのCI OSでもWindowsとPOSIXの両方をテストする。

加えてcommand testで、無効な設定の場合に変換・進捗表示・作業ファイル作成を開始しないことを確認する。

正常系では次を同じファイル名に混在させる。

- 複数言語
- 絵文字
- 全角英数字
- 途中の半角空白
- 全角空白

先頭半角空白はWindowsの失敗ケースとし、cross-platform正常系では先頭全角空白を使う。
