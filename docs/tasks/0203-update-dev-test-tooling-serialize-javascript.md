# dev test toolingのserialize-javascript vulnerabilityを更新する

## Status

Planned (conditional)

`npm audit --audit-level=high`で検出したhigh advisoryに着手するための条件付きtask。0202(依存install security policy復元)から分離している。

## 背景

dependency chain: `@vscode/test-cli`(direct devDep) → `mocha` → `serialize-javascript`。

- high 1件(`serialize-javascript`): RCE via RegExp.flags / CPU exhaustion DoS。
- moderate 2件(`mocha`, `@vscode/test-cli`): 上記への依存。

すべてdev-only(VSIX非同梱)。監査時点でfix未提供。

## 着手条件

次のいずれか。

- `serialize-javascript`/`mocha`/`@vscode/test-cli`にnon-breaking fixが公開される。
- breaking updateを許容する判断がmaintainerからある。

## 対象外

- `npm audit fix --force`の使用。
- advisoryの無条件ignoreやaudit無効化。
- production dependencyの巻き込み更新。

## 確認方法

- `npm audit --audit-level=high`がhigh/criticalなしになること。
- `npm test`(Extension Host)がpassすること。
