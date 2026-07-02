# GitHub Actions parallel steps

## 調査日

2026-07-02

## 対象

- GitHub Actions workflow syntax
- GitHub Changelog: Actions steps can now be run in parallel

## 公式情報源

- https://github.blog/changelog/2026-06-25-actions-steps-can-now-be-run-in-parallel/
- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## 確認できた事実

- GitHub Actionsは、同一job内のstepを並列実行する仕組みを追加している。
- `background: true` はstepを非同期実行し、次のstepへ進める。
- `wait` / `wait-all` はbackground stepの完了待ちに使う。
- `cancel` は不要になったbackground stepを終了する用途に使う。
- `parallel` は複数stepを並列実行し、最後に待つ構文糖衣として提供されている。
- 公式changelogでは、独立した複数build、background service起動、telemetry uploadなどが用途例として挙げられている。

## このプロジェクトへの推定

`pnpm install` まわりには直接効きにくい。

理由:

- `pnpm` setup
- `actions/setup-node`
- `pnpm install --frozen-lockfile`
- test / build

の順序依存があり、前段が終わらないと後段を開始できない。

一方、以下は候補になり得る。

- webviewの `crop_pdf` と `merge_pdf` build
- 互いに独立した外部ツールinstall
- release workflow内の独立したupload / publish処理

## 未確認事項

- 現在のrunner imageで `parallel` / `background` / `wait` syntaxが全OSで安定して使えるか
- `parallel` を使った場合のログの見やすさ
- 失敗時のexit code伝播とcancel動作
- YAML schema / editor tooling / GitHub UI上の表示

## 再確認条件

- 実際にworkflowへ導入する前
- GitHub Actionsのsyntaxが変更された場合
- runner version差で構文が通らないCI failureが出た場合
