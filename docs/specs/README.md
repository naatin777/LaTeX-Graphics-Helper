# Specifications

## Product specifications

利用者や外部から観測できる挙動を定義する。

判断基準:

> 実装を全面的に書き換えても維持する必要があるか

Yesの場合はproduct specificationとする。

## Internal specifications

ソースコード内部のprotocol、invariant、責務、開発方針を定義する。

実装方法そのものではなく、複数moduleやtestが依存する内部contractを記録する。

## Classification rule

利用者が観測する結果、操作、エラー、設定の意味は`product/`へ置く。message protocol、staging、module責務、test runtime、CI Evidenceなど開発時に守る契約は`internal/`へ置く。両方を含む文書は、productとinternalへ分け、互いに正本の境界をlinkで示す。
