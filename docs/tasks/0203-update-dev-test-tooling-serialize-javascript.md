# dev test toolingのserialize-javascript vulnerabilityを更新する

## Status

Planned (conditional; remaining)

2026-07-22に、互換範囲内のlockfileだけを`npm audit fix --package-lock-only`(非force)で更新した。brace-expansion、fast-uri、js-yaml、linkify-itのhigh advisoryとMermaid経由のDOMPurify low advisoryは解消したが、serialize-javascriptは現行の`mocha`/`@vscode/test-cli` chainに残っているため、このtaskはopenのままとする。0202(依存install security policy復元)から分離している。

## 背景

dependency chain: `@vscode/test-cli`(direct devDep) → `mocha` → `serialize-javascript`。

更新前のfull auditはhigh 5件(group)、moderate 2件、low 1件だった。`serialize-javascript`のhigh(RCE via RegExp.flags / CPU exhaustion DoS)と、それを経由する`mocha`/`@vscode/test-cli`はdev-only(VSIX非同梱)で、現行の直接依存範囲内には互換fixがなかった。

## 2026-07-22の対応結果

`npm audit fix --package-lock-only`を`--force`なしで実行した。`package.json`の直接依存、version range、新しいdirect dependencyは変更していない。

- dev-onlyの`brace-expansion`を2.1.1→2.1.2、nested copyを5.0.6→5.0.7へ更新。
- dev-onlyの`fast-uri`を3.1.2→3.1.4、`js-yaml`を4.2.0→4.3.0、`linkify-it`を5.0.1→5.0.2へ更新。
- Mermaid経由のruntime `dompurify`を3.4.11→3.4.12へ更新。
- 直接範囲`mocha: ^11.3.0`内でlockfileを11.3.0→11.7.6へ更新し、Mochaが要求するtransitive graphも更新した。`serialize-javascript`は6.0.2のまま残った。

post-fixのfull auditはdev-onlyの`serialize-javascript` high 1件、`mocha` moderate 1件、`diff` low 1件。`npm audit fix --package-lock-only --dry-run`は追加変更0件で、現行の`mocha`/`@vscode/test-cli` chainに互換lockfile-only fixは残っていない。runtime auditは0件。

## 着手条件

次のいずれか。

- `serialize-javascript`/`mocha`/`@vscode/test-cli`にnon-breaking fixが公開される。
- breaking updateを許容する判断がmaintainerからある。

## 対象外

- `npm audit fix --force`の使用。
- advisoryの無条件ignoreやaudit無効化。
- production dependencyの巻き込み更新。

## 確認方法

- `npm audit --audit-level=high`: serialize-javascript highが残るため未達(open理由)。
- `npm audit --omit=dev --audit-level=high`: pass。runtimeのhigh/criticalはなく、post-fixのruntime auditは0件。
- `npm ci`: pass。
- `npm install-scripts ls`: pass(`No packages with unreviewed install scripts.`)。
- `npm test`(Extension Host): pass、320 passing。
