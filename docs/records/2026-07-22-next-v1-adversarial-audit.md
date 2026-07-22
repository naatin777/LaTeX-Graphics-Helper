# next/v1 adversarial audit

## Scope

- Baseline branch: `next/v1`
- Baseline commit: `7f70f6996f9e21fc71a962971e8c0df05b40629f`
- Work branch: `next/v1-adversarial-review-2`
- Evidence capture head before this record: `5e4983a1e0bc827cbcc8dd3a854d374c7225a8c6`
- Audit date: 2026-07-22

この監査は、既存値や監査者の好みを新しい要件として扱わない。変更対象は、再現可能な失敗、明示されたproduct contract、または公式tool contractとの不一致が確認できたものに限定した。

## Method

次の10巡を独立した観点として実施した。

1. branch baseline、mainとの差分、直近PR、CI triggerの確認
2. package manifest、activation、public/internal command registrationの確認
3. workspace boundary、staging、cleanup、Safe Mode、Undoの確認
4. cancellation、batch concurrency、commit/rollback raceの確認
5. input preflight、parser、resource handling、file handleの確認
6. Draw.io、Ghostscript、pdftocairo、rsvg-convert、Puppeteerのadapter確認
7. PDF、SVG、raster、EPSの生成物検証の確認
8. Webview CSP、message validation、localization、preview failureの確認
9. test runtime、3 OS workflow、packaged VSIX workflow、tooling coverageの確認
10. specs、tasks、現行実装、未決product判断の再照合

既存のtest file inventoryとcapability catalogを索引として使い、修正候補は実装・test・spec・履歴を再読してから採用した。

## Fixed findings

### F-001 Draw.io CLIのPDF flag

**Finding**

native Draw.io PDF変換が`-xf`を1引数として渡していた。現行Draw.io CLIのexportとformatは別引数であり、main側の修正PRでも同じ不具合が確認されていた。

**Change**

- `-x`, `-f`, `pdf`へ分離した。
- 既存のcrop、transparent、all-pages指定は維持した。
- 引数列をtestで固定した。

### F-002 rollbackがcommit後の外部変更を破壊するrace

**Finding**

batchの先行出力をcommitした後、別processが同じ出力を編集し、その後続出力が失敗すると、rollbackが第三者の編集を旧backupで上書き、または新規出力ごと削除できた。

**Change**

- copyが完了した出力は、rollback前に現在内容とstaged内容を比較する。
- 既存出力が変わっていた場合は復元せず、recovery backupを保持する。
- 新規出力が変わっていた場合は削除しない。
- copy途中で失敗した出力は、従来どおり自分が作った不完全出力としてrollbackする。
- 既存出力と新規出力の両方にfailure injection testを追加した。

Node.jsの`copyFile`はatomicityを保証しないため、copy成功・失敗とownership確認を別に扱う。

### F-003 根拠のないpreflight resource上限

**Finding**

input preflightが500 MBを超えるfileをerror、100 MPixelを超えるrasterをwarningとしていた。これらは利用者設定でもtoolの実限界でもなく、変換可能な入力を固定値だけで拒否していた。

EPSにも100 MB output、BoundingBox寸法、32-bit座標の独立した固定制限が残っていた。

**Change**

- file size、pixel count、page countを固定値だけで拒否しないcontractへ変更した。
- EPS output size、BoundingBox寸法、32-bit座標制限を削除した。
- EPS座標はJavaScriptで正確に扱えるsafe integerと座標順だけを検証する。
- 501 MiB sparse PDF、100 MPixel超metadata、large EPS座標の回帰testを追加した。
- 外部process timeoutは入力受入上限ではなく停止不能processの回収手段として維持した。

### F-004 raster preflightの全file Buffer化

**Finding**

固定file-size上限を削除した状態で`readFile`してSharpへ渡すと、入力全体をextension host memoryへ載せる。これは上限削除と両立しない。

**Change**

- Sharpへpathを渡し、header-only `metadata()`を使う。
- Sharp streamを明示的にdestroyし、`close`完了後にpreflightを返す。
- 既存のWindows WebP rename testを契約Evidenceとして維持した。

Sharp公式仕様では`metadata()`はcompressed pixelをdecodeせずinput headerから情報を取得する。

### F-005 preflight診断の分断

**Finding**

Draw.io PDF、configured crop、merge、splitはoperationにOutput channelを持つ一方、preflightへ渡していなかった。複数errorのcommand向けmessageにも失敗input pathがなかった。

**Change**

- operationと同じOutput channelをpreflightへ渡した。
- aggregated errorへ各source pathを含めた。
- 対応拡張子を持つdirectoryをregular fileとして拒否するtestを追加した。

### F-006 external toolのexit code 0を成果物成功とみなす

**Finding**

Draw.io、Mermaid、pdftocairo、rsvg-convertが成功終了しても、空fileや別形式を出力した場合にfinal outputへcommitできる経路があった。

**Change**

- PDFはcommit前に`pdf-lib`でparseし、1page以上、MediaBox/CropBox/TrimBoxが有限かつ正寸法であることを確認する。
- SVGはcommit前に非空かつSVG rootを含むことを確認する。
- external runnerがHTML、text、empty outputを返すfailure injection testを追加した。

### F-007 SVG Puppeteer rendererのexternal navigation

**Finding**

SVGをinline HTMLへ埋め込むPuppeteer経路は通常resourceをabortしていたが、navigation requestだけ許可していた。SVGの`foreignObject`内にsubframeを置くと、外部navigationが不要に許可される余地があった。

**Change**

- inline SVG renderでは全requestをabortする。
- JavaScriptは従来どおり無効化する。
- source SVG以外のnetwork、subframe navigation、external assetを必要としないcontractへ統一した。

Puppeteerではnavigationもrequest interception対象であり、SVG `foreignObject`はXHTML等を埋め込める。

### F-008 LaTeX caption/label escape

**Finding**

captionはbackslashとunderscoreだけをescapeしていた。`%`, `#`, `&`, `$`, braces, caret, tildeを含むfile nameから生成したcaptionがLaTeX syntaxを壊せた。

**Change**

- LaTeX textの特殊文字を明示mapでescapeする。
- labelではslash、space、LaTeX特殊文字をseparatorへ正規化する。
- 日本語と通常英数字を変えないtestを追加した。

`\includegraphics{...}`のpath本体はcustom templateとgraphicx filename semanticsに関わるため、caption/label修正と分離した。

### F-009 Crop Webviewの未localize error

**Finding**

preview render failure後にApplyした場合だけ英語固定messageを表示し、protocolで渡された`previewApplyError`を使っていなかった。

**Change**

既存のlocalized labelを使用するよう修正した。

### F-010 spec drift

**Finding**

preflight specとTask 0204が固定resource上限をrequired contractとして残し、output-format specは実装済みEPSを未対応としていた。

**Change**

- preflightの現行contractと残作業を分離した。
- Evidenceなしの固定resource上限を追加しないことを明記した。
- EPS変換の現行supportをproduct specへ反映した。

## Areas reviewed without code change

次の基盤は、現行実装とtestの範囲で一貫しており、今回の大規模変更は不要と判断した。

- workspace logical/real pathの二段階containment
- symlinkを跨ぐwriteとcleanupの拒否
- staging root ownershipとfailure時のrecovery artifact保持
- Safe Modeのbatch conflict decision
- Undo recordのcontent hashとnewer conversion ID guard
- ASCII scratch baseとtool input/output containment
- Webview CSP nonce、local resource root、Host message validation
- platform-specific VSIX packagingと3 OS release smokeの構成

## Findings not auto-fixed

### R-001 clipboard pasteのlate cancellation

clipboard outputをcommitしてUndo recordを登録した後、PasteEditを返す直前にCancellationTokenが発火すると、fileだけが残りeditor editを返さない可能性がある。

修正には次のどれをproduct contractとするか判断が必要である。

- commit後はcancelを無視してPasteEditを返す
- commit済みoutputを自動rollbackする
- outputを残しUndoだけを正本とする

自動rollbackは同時編集raceとUndo ownershipへ影響するため、今回推測で選ばない。

### R-002 `\includegraphics` pathのTeX特殊文字

caption/labelは修正したが、path本体に`%`, `#`, braces等を含む場合の扱いは未決である。graphicx、engine差、custom templateとの互換を含む独立仕様が必要である。

### R-003 Split Webviewの`Page` / `Group`

Split Webviewには英語固定prefixが残る。`Group`用labelがprotocol/NLSに存在しないため、NLS schema追加を伴う独立変更とする。

### R-004 tooling coverage

Oxlint configは`scripts/**/*.mjs`用overrideを持つが、root `lint` scriptは`scripts/`とroot `.mjs` configを対象にしていない。既存監査にも記録済みである。

対象を増やす前に実warning inventoryを取得し、unrelated cleanupを別taskへ分離する。

### R-005 Task 0204の残作業

- warning一覧と続行/取消の1回確認
- preflight progressの外部表示
- PDF入力のparse・暗号化・page box詳細検査
- SVG XML構造検査
- Mermaid/Draw.io詳細検査

## Verification evidence

### Added or strengthened tests

- Draw.io CLI argument contract
- existing-output rollback external-change race
- new-output rollback same-inode external edit race
- non-regular input rejection
- no fixed file-size/pixel-count admission
- source-path diagnostic
- large valid EPS coordinates
- invalid PDF output rejection
- invalid/empty SVG output rejection
- LaTeX special-character escaping
- existing Windows raster file-handle test retained

### Execution status

この実行環境からGitHubをlocal cloneしようとしたが、DNSで`github.com`を解決できず失敗した。したがってlocalの`npm ci`、format、typecheck、testを実行済みとは記載しない。

repository workflowは`next/**` pushでCheck、Test、Playwrightを起動する設定だが、現在利用できるGitHub connectorはpush由来check run一覧を取得できず、commit status APIにもstatus contextが返らなかった。CI結果は未取得Evidenceとして扱う。

PRは作成していない。branchはmergeしていない。

## External references checked

- Node.js `fsPromises.copyFile`: atomicity is not guaranteed
- Sharp input metadata: reads input header without decoding compressed pixels
- Puppeteer request interception and navigation request behavior
- MDN SVG `foreignObject`
- VS Code platform-specific extension packaging
- Draw.io Desktop CLI export/format behavior and repository main-side fix history

## Verdict

`next/v1`の安全性primitiveは全体として強い。一方、外部tool successの過信、rollback後半のrace、preflightの根拠なしresource policyに実害があったため、v1 release前に今回のbranch差分をreviewし、CI Evidenceを取得する価値がある。

現時点のverdictは`conditional`である。静的監査とfailure injectionは追加済みだが、3 OS testとpackaged VSIX smokeの実行結果を確認するまでrelease-readyとは断定しない。
