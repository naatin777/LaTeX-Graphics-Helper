# outputPath検証の内部契約

`outputPath`の利用者向け検証挙動は、[product specification](../product/output-path-validation.md)を正本とする。この文書は、path resolution、validation ownership、platform policy injectionの境界だけを記録する。

## Validation ownership

outputPath templateの展開と絶対pathの解決を完了した直後に、output-path validation boundaryが検証を行う。検証は次の処理より前でなければならない。

- operation stagingへの入力コピー
- 変換用外部commandの起動
- 出力artifactの生成
- Safe Modeの競合確認
- progress付きの変換開始

実際にfile operationを行うruntimeのOS policyをvalidationへ渡す。local workspaceではlocal Extension Host、WSL・SSH・Dev Containerではremote Extension Hostのpolicyを使う。

## Module boundary

platform policyはvalidation処理へ注入できる形で分離し、validation moduleは入力pathを別の文字列へ自動変換しない。command layerはvalidation failureを受け取った時点で下流のoperationを開始しない。

## Test seam

どのCI OSでもWindowsとPOSIXの両方のpolicyを検証できるよう、OS規則をvalidation処理へ注入する。command testでは、無効な設定時に変換、progress、stagingが開始されない境界を確認する。
