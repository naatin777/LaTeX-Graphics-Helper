# GitHub Actionsの変更影響CI scope調査

調査日: 2026-07-15

## 目的

変更fileに応じて必要なCIだけを実行する際、required checkをPendingにせず、安全側に倒せる構成を確認する。

## 確認した公式情報

- GitHub Actions workflow syntax
  - URL: <https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax>
  - workflow-levelのbranch / path / commit message filterでworkflowがskipされると、関連checkはPendingのままになり、required checkならPR mergeを止める。
  - `paths` / `paths-ignore` はworkflowを起動するかどうかのfilterであり、job単位のskipではない。
  - path filterのdiffは、PRではthree-dot diff、pushではtwo-dot diffで評価される。
  - diff生成timeoutや1000 commit超過ではworkflowが常に実行される。3000 file制限もある。
- GitHub Actions job condition
  - URL: <https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-jobs-with-conditions>
  - `jobs.<job_id>.if` でjob単位の実行可否を制御できる。
  - skipped jobはSuccess扱いになり、required checkでもPR mergeを妨げない。

## このprojectでの結論

- required checkに関係するworkflowへ `paths` / `paths-ignore` を追加してworkflow自体をskipしない。
- 先頭の軽量classifier jobで変更fileをscopeへ分類する。
- 重いjobはclassifier outputを使ってjob-level `if` でskipする。
- 判定不能、未知file、diff取得失敗はfull scopeに倒す。
- path判定はworkflow YAMLへ分散させず、scriptへ集約する。
- branch protectionのrequired checkは、matrix jobではなく固定名のgate jobへ寄せる。

## 未確認事項

- GitHub Actionsのmatrix jobをscopeごとにどこまで動的削減できるか。
- このrepositoryのrequired check設定が、workflow単位かjob単位か。
- GitHub Actionsのstep-level `background` / `parallel` とscope判定を併用した場合の実測効果。
- rename、削除、初回pushなど、変更file一覧の取得方法ごとの差異。
