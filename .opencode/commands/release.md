---
description: LHGのリリース準備、検証、VSIX作成を行う
agent: build
---

`lgh-release` Skillを読み込む。

対象バージョンは `$1` とする。

リリース前検証、VSIX作成、内容確認、リリースノート作成まで行う。

次はユーザーが明示的に依頼するまで実行しない。

- Git commit
- Git tag
- Git push
- GitHub Releaseの公開
- VS Marketplaceへの公開
- Open VSXへの公開

使用例：

/release 1.0.1
