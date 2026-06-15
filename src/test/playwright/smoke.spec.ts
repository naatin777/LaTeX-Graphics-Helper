import { expect, test } from './fixtures';

test('opens the seeded workspace and main.tex', async ({ page }) => {
    const mainTex = page.getByRole('treeitem', { name: 'main.tex' });
    await expect(mainTex).toBeVisible({ timeout: 60_000 });
    await mainTex.dblclick();
    await expect(page.getByRole('tab', { name: /main\.tex/i })).toBeVisible({ timeout: 15_000 });
});

// package.json commandPalette sets when: false — conversion commands are Explorer-only.
// Crop/split/merge etc. are covered by vscode-test via runExplorerContextCommand().
test('shows workspace PDF fixtures in the explorer', async ({ page }) => {
    await expect(page.getByRole('treeitem', { name: 'sample.pdf' })).toBeVisible({
        timeout: 60_000,
    });
});
