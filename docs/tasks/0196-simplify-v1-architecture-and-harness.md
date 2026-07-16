# v1構造とハーネスを簡素化する

## Status

Done

## 目的

v1安全性修正で増えたrepository内ハーネス、task強制、引数伝播、共通化の責務を整理し、安全性を維持したまま人間が理解・レビューできる構造へ戻す。

## 変更内容

- `AGENTS.md`を手書き正本へ戻し、RuleSyncとStop hookを必須導線から外す。
- task templateとindexを軽量化し、0194をBlocked、0195を未着手として保持する。
- command登録、conversion runtime、tool依存、staged batchの責務と引数を整理する。
- Clipboard PasteのUI境界と保存operationを分離する。
- 実装に合わせてPROJECT_STATE、ADR、task補足を更新する。

## 対象外

- 新しいユーザー機能
- release matrixの追加対応
- 設定migration
- Webview機能追加
- 安全性primitiveの削除
- 新しいdependency
- 0194、0195の追加実装

## 確認方法

- safety regression testを維持して実行する。
- `pnpm run check:all`、`pnpm run build`、`pnpm run test:vscode`を実行する。
- Webviewまたはpackagingに影響する場合は対象PlaywrightとVSIX smokeを実行する。
- `git diff --check`と最終検索を実行する。

## 結果

構造整理と既存安全性回帰確認を完了した。RuleSync、Stop hook、task validatorは正式checkから外し、RuleSync同期自体はv1の必須検証対象外とした。

| Command                                                                                                                                          | Result | Notes                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | --------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                                                                                                 | Pass   | pnpm 11.8.0、lockfileから再解決なし                 |
| `pnpm run check:all`                                                                                                                             | Pass   | lint warningのみ、NLS 220 keys                      |
| `pnpm run build`                                                                                                                                 | Pass   | extensionとCrop Webviewをbuild                      |
| `pnpm run test:vscode`                                                                                                                           | Pass   | 208 tests passed                                    |
| `pnpm run test:playwright`                                                                                                                       | Pass   | browser 18 tests passed                             |
| `pnpm run test:playwright:electron`                                                                                                              | Pass   | Electron 1 test passed、VS Code 1.128.0             |
| `pnpm run package:vsix -- --target darwin-arm64 --out /tmp/lgh-simplified.vsix`                                                                  | Pass   | 94.24 MB、Sharp installを含むlockfile-based package |
| `LGH_VSIX_PATH=/tmp/lgh-simplified.vsix pnpm exec playwright test --project=vscode-electron test/playwright/electron/crop_pdf_configure.spec.ts` | Pass   | packaged VSIX smoke 1 test passed                   |
| `git diff --check`                                                                                                                               | Pass   | whitespace errorなし                                |
| final `rg` safety/harness search                                                                                                                 | Pass   | 旧実装参照は意図した履歴文書のみ                    |

未確認の他OS release matrixは0194のBlocked理由として保持し、0195は未着手のままにした。`rulesync:generate`、`rulesync:check`、task parser checkはv1の正式導線から外したため実行対象外とした。
