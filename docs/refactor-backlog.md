# Refactor Backlog

気になる実装は、すぐ直さずここに記録する。

リファクタリングは、気持ち悪さを消すためではなく、具体的な変更コスト・バグリスク・テスト困難を減らすために行う。

## Rule

リファクタしてよい条件。

- バグリスクがある
- 次の機能追加を妨げている
- テストしづらい
- 同じ問題が3回出た
- ファイルや責務が大きくなり、理解が難しくなっている

リファクタしない条件。

- なんとなく綺麗にしたい
- 命名が気になるだけ
- 軽微な重複
- MVP前の構成整理
- 機能追加のついで

## Template

### タイトル

- Area:
- Type:
  - Duplication
  - Naming
  - Architecture
  - Testability
  - Bug risk
  - Readability
  - Preference

- Why it bothers me:
- Concrete problem:
- Do now?
  - Yes / No

- Condition to do:
- Related files:

---

## Items

### Example: similar command handlers

- Area: command handlers
- Type: Duplication
- Why it bothers me: 複数の command handler が似ている。
- Concrete problem: まだ具体的な問題はない。
- Do now? No
- Condition to do: 3つ目の同じ変更が必要になったら検討する。
- Related files:
  - `src/...`

---
