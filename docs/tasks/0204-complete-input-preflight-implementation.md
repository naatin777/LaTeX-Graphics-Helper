# タスク: 変換入力preflightの未実装契約を完了する

## Status

Done

## 目的

`docs/specs/internal/input-preflight.md`と既存実装の差分を解消し、warning・error・progress・cancellationを利用者から確認できる一貫したpreflightとして完成させる。

## 現在のEvidence

次は実装済みである。

- 全入力を変換開始前に検査する。
- 存在・読取可能性・regular file・空file・対応形式を検査する。
- PDF header、raster metadata、SVG、Mermaid、Draw.io、EPSの軽量検査を行う。
- batch同時実行数を2件に制限し、report順を入力順に保つ。
- cancel後にqueued検査を開始しない。
- error通知に入力pathを含め、Output channelへ入力単位のreportを記録できる。
- file size、pixel count、page countを根拠のない固定値で拒否しない。実parserまたは変換toolが扱えない場合に、その具体的な失敗を返す。

次の契約は未実装または部分実装である。

- warningを全件表示し、続行または取消をユーザーへ1回だけ確認する。
- preflightの「N件中M件」進捗を既存のprogress notificationへ伝える。
- PDFをparseし、page count・暗号化・page boxを検査する。
- SVGをXMLとしてparseし、rootとdimension/viewBoxを構造として判定する。
- Mermaid CLI syntax検査とDraw.ioの内容検査を、tool利用可能時の詳細検査として実行する。
- Output channelへformat固有detailsを一貫した形式で記録する。

## 完了条件

- warningだけのbatchは、全warningを示した1回の確認で続行または取消できる。
- errorを含むbatchは変換を開始せず、全errorを入力path付きで診断できる。
- preflight進捗とcancelがcommand層から外部確認でき、cancel後にqueued検査や変換を開始しない。
- 形式別の軽量検査を実装し、opt-in詳細検査はtool不在時のfallbackを含める。
- 正常・warning・error・cancelを実形式に近いfixtureでテストする。
- 関係するtest、typecheck、lint、format、buildがpassする。

## 変更可能なファイル

- `src/commands/`
- `src/operations/input/input_preflight.ts`
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
- 根拠や利用者設定なしの固定resource上限を追加すること
- preflightと無関係な変換処理のrefactor

## 関連

- [入力preflightの内部契約](../specs/internal/input-preflight.md)
- [0128: 変換入力preflightの仕様を決める](0128-design-input-preflight-validation.md)
