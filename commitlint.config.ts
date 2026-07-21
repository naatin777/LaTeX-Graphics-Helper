import type { UserConfig } from '@commitlint/types';

/**
 * CommitLint 設定 — Conventional Commits に準拠
 *
 * 【プレフィックスの使い分け】
 *
 * | プレフィックス | 用途 | このプロジェクトでの対象例 |
 * |--------------|------|--------------------------|
 * | `feat`       | 新機能追加 | 新コマンド、新変換フォーマット、UI 追加 |
 * | `fix`        | バグ修正   | 不具合修正、誤動作の是正 |
 * | `docs`       | ドキュメント更新 | README、仕様書、コメントのみの変更 |
 * | `refactor`   | リファクタリング | 機能変更を伴わない内部構造改善 |
 * | `test`       | テスト追加・修正 | ユニットテスト、統合テスト、E2Eテスト |
 * | `chore`      | 設定/ツール/依存関係の更新 | **`.github/` 以外の設定ファイル、依存関係更新、ツール設定** |
 * | `ci`         | CI/CD 設定の変更 | **`.github/workflows/`, `.github/actions/` のみ** |
 * | `build`      | ビルドシステム/外部依存の変更 | まれに使用（`chore` で十分なことが多い） |
 * | `perf`       | パフォーマンス改善 | 速度・メモリ最適化 |
 * | `style`      | コードスタイル整形 | oxfmt/oxlint 適用、インデント修正など |
 * | `revert`     | 過去コミットの取り消し | `revert: ...` 形式 |
 *
 * 【重要：`ci` と `chore` の境界】
 * - `ci:` ＝ **`.github/` ディレクトリ配下のみ**（GitHub Actions / Actions / Dependabot 設定）
 * - `chore:` ＝ それ以外の設定・ツール・依存関係更新
 *   - 例：`package.json` の依存更新、`lefthook.yml`、`oxfmt.config.ts`、`tsconfig.json` など
 *
 * 【スコープ（任意）】
 * - 推奨スコープ例：`config`、`deps`、`workflow`、`actions`、`operations`、`commands`、`webview`、`security`
 * - 空欄（スコープなし）も許可。迷ったら空欄でOK。
 *
 * 【PR タイトル】
 * - PR タイトルも同じ形式（`feat: ...` 等）を推奨。
 * - 自動チェックは行わないが、マージ時の履歴整合性のため統一が望ましい。
 *
 * 【参考：よくある迷いどころの正解】
 * - `lefthook.yml` 変更 → `chore:`（`.github/` ではない）
 * - `package.json` 依存追加 → `chore(deps):`
 * - GitHub Actions ワークフロー変更 → `ci:`
 * - 新しい変換コマンド追加 → `feat(commands):`
 * - バグ修正 → `fix:`
 * - リファクタリング → `refactor(operations):` 等
 */

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  // ルールのカスタマイズ（必要に応じて追加）
  rules: {
    // type は Conventional Commits 標準のものを許可
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'refactor',
        'test',
        'chore',
        'ci',
        'build',
        'perf',
        'style',
        'revert',
      ],
    ],
    // スコープは任意（空欄可）。強制しない。
    'scope-enum': [0],
    // 本文の最大行長などは標準に従う
    'subject-case': [0], // 大文字小文字は自由
  },
};

export default config;