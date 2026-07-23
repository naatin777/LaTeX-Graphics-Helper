# ADR-0019: Sharpのpath入力ではfilesystem cacheを無効にする

## ステータス

採用

## 日付

2026-07-23

## 背景

Raster入力のpreflightと変換で、Sharpへ画像全体のBufferを渡す実装を廃止し、入力pathを直接渡す必要がある。Buffer入力はExtension Hostへ画像全体を読み込むため、大きな画像で不要なメモリ使用を引き起こす。一方、path入力はSharp/libvipsのfilesystem cacheと相互作用する。

path入力へ移行した後、WindowsのExtension Host testで次の失敗が発生した。

- preflight直後のRaster入力のrenameが`EBUSY`で失敗する
- GIF/WebP入力のcleanupが`EBUSY`で失敗する
- その後のPNG/PDF/JPEG/AVIF testが入力fileの解放待ちでtimeoutする
- LinuxとmacOSの同じtest、およびpackaged Electron Playwrightは成功する

Sharpのfilesystem cacheは既定で複数のfileを開いたまま保持できる。Windowsではこの保持が入力fileのrenameや削除を妨げる。linterの設定はExtension Hostのtest実行経路に含まれないため、この失敗の原因ではない。

## 決定

Raster入力で次のcontractを採用する。

1. SharpにはRaster入力のpathを直接渡す。画像全体をBufferへ読み込む実装へ戻さない。
2. Raster入力を開く共通helperの初期化時に、Sharpのfilesystem cacheだけを無効にする (`sharp.cache({ files: 0 })`)。
3. preflightと実変換の両方で、処理終了時にSharp inputを`destroy()`し、`close` eventを待つ。
4. Windowsでmetadata取得直後に入力fileをrenameできるtestを必須の回帰Evidenceとして維持する。
5. filesystem cacheの変更はfile cacheだけを対象にする。`limitInputChannels`の既定値は変更せず、`unlimited`や`limitInputPixels: false`は使用しない。
6. Project linter rule `project/forbid-raster-input-limit-bypass`で、`limitInputPixels: false`、`unlimited: true`、`limitInputChannels`の直接指定、およびBuffer/readFileをlimit付きSharpへ渡す実装をerrorにする。

## 理由

- path入力は大きなRaster画像全体をExtension Hostのメモリへ複製しない。
- filesystem cacheを無効にすることで、Sharp/libvipsがpath入力のfile handleを保持してWindowsのfile操作を阻害する経路を閉じる。
- `sharp.cache(false)`ではなく`{ files: 0 }`を使い、memory cacheとoperation cacheまで不要に変更しない。
- 固定時間のsleepによる解決は、file handle解放を保証せず、実行時間とflakinessを増やすため採用しない。
- Buffer入力へ戻す方法はWindowsのhandle問題を避けるが、大画像のメモリ要件と今回のpath入力contractに反する。

## 結果・影響

- Windowsでpreflight後の入力fileをrename・cleanupできる。
- Sharpのfilesystem file cacheによる再利用は失われるため、同一process内のfile入力では性能が低下する可能性がある。
- Raster入力処理は、path入力、pixel上限、明示的destroy、Windows file-handle testの組み合わせを維持する必要がある。
- このlifecycle contractを破る実装は、code reviewだけでなくlintで早期に検出する。
- Sharpのversion更新時は、file cacheの既定値と`files: 0`の挙動をWindows testで再確認する。

## 見直す条件

- Sharp/libvipsがfilesystem cacheを個別のSharp instanceだけで制御できるようになったとき
- Windowsでpath入力のfile handleを保持しないことが、対象Sharp versionで実証されたとき
- file cache無効化による性能影響が、実運用上の問題として再現したとき
- Raster入力のresource lifecycleを別の画像処理実装へ置き換えるとき

## 関連

- [Raster入力preflightの内部契約](../specs/internal/input-preflight.md)
- [Raster入力のfile-handle回帰test](../../test/operations/input_preflight_file_handle.test.ts)
- [ADRの運用方針](README.md)
