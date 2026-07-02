# タスク: 一時的なCI計測wrapperを通常運用から外す

## Status

Done

## 目的

0085で外部ツールinstall時間を測るために追加した詳細計測wrapperを、通常運用のCI scriptから外して複雑さを戻す。

## 背景

0085で目的の実測値は取得済み。

その後、0086でmacOS install高速化を検討したが、期待できる改善は限定的だった。詳細な`[timing]`ログを通常運用に残し続ける必要は薄く、CI scriptの見通しを優先する。

## やったこと

- bash scriptの`run_timed` helperを削除した
- PowerShell scriptの`Invoke-TimedStep` helperを削除した
- install / verify処理は、計測前と同じ素直な逐次実行に戻した
- Windowsの`Invoke-WebRequest`でprogress描画を抑制し、CIログ出力とdownload処理を軽くした
- 0085の実測記録は削除せず、タスク文書に残した

## 変更ファイル

- `.github/scripts/install-test-tools-linux.sh`
- `.github/scripts/install-image-tools-macos.sh`
- `.github/scripts/install-image-tools-windows.ps1`
- `.github/scripts/verify-image-tools-unix.sh`
- `.github/scripts/verify-image-tools-windows.ps1`
- `docs/tasks/README.md`
- `docs/tasks/0086-reduce-macos-external-tool-install-time.md`
- `docs/tasks/0087-remove-temporary-ci-timing-wrappers.md`

## 対象外

- CI高速化
- 外部ツールversion変更
- test内容変更
- workflow構成変更

## 確認方法

- `bash -n .github/scripts/install-test-tools-linux.sh .github/scripts/install-image-tools-macos.sh .github/scripts/verify-image-tools-unix.sh`
- `CI=true pnpm run check`
