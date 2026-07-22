# タスク: 変換入力preflightの未実装契約を完了する

## Status

Planned

## 目的

`docs/specs/internal/input-preflight.md`で決定済みの契約と既存実装の差分を解消し、warning・error・progress・cancellationを利用者から確認できる一貫したpreflightとして完成させる。

## 現在のEvidence

軽量なheader・file size・raster metadata・一部形式検査、全入力を変換前に検査するflow、同時実行数2件の上限、queued検査のcancel、安定したreport順は実装済みである。

次の契約は未実装または部分実装である。

- warningを全件表示し、続行または取消をユーザーへ1回だけ確認する。
- preflightの「N件中M件」進捗を既存のprogress notificationへ伝える。
- PDFをparseし、page count・暗号化・page box・上限を検査する。
- SVGをXMLとしてparseし、rootとdimension/viewBoxを契約どおり判定する。
- Mermaid CLI syntax検査とDraw.ioの内容検査を、tool利用可能時の詳細検査として実行する。
- raster pixel上限など、実装結果が仕様のwarning/error区分と異なる箇所を一致させる。
- Output channelへ仕様で定めた詳細reportを記録する。

## 完了条件

- warningだけのbatchは、全warningを示した1回の確認で続行または取消できる。
- errorを含むbatchは変換を開始せず、全errorを診断できる。
- preflight進捗とcancelがcommand層から外部確認でき、cancel後にqueued検査や変換を開始しない。
- 仕様に列挙された形式別の軽量検査を実装し、opt-in詳細検査はtool不在時のfallbackを含める。
- 正常・warning・error・cancelを実形式に近いfixtureでテストする。
- 関係するtest、typecheck、lint、format、buildがpassする。

## 変更可能なファイル

- `src/commands/`
- `src/operations/input_preflight.ts`
- preflightを呼び出す`src/operations/`の変換処理
- `test/`のpreflight・command testとfixture
- `package.nls.json`
- `package.nls.ja.json`
- `docs/specs/internal/input-preflight.md`
- `docs/tasks/0204-complete-input-preflight-implementation.md`
- `docs/tasks/README.md`

## 対象外

- 入力ファイルの自動修復
- password入力UI
- qpdf・Mermaid CLI・Draw.io CLIを新しい必須dependencyにすること
- preflightと無関係な変換処理のrefactor

## 関連

- [入力preflightの内部契約](../specs/internal/input-preflight.md)
- [0128: 変換入力preflightの仕様を決める](0128-design-input-preflight-validation.md)
