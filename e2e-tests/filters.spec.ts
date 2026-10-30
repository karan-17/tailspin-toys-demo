import { test, expect } from '@playwright/test';

test.describe('Game catalog filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('matches any selected category', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Strategy' }).check();
    await page.getByRole('checkbox', { name: 'Puzzle' }).check();

    await expect(page.getByRole('link', { name: /DevOps Dominion/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Code Puzzle Chronicles/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Container Chaos/ })).toBeHidden();
  });

  test('filters by publisher', async ({ page }) => {
    await page.getByLabel('Publisher').selectOption({ label: 'CodeForge Studios' });

    await expect(page.getByRole('link', { name: /DevOps Dominion/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Pipeline Conquest/ })).toBeHidden();
  });

  test('combines category and publisher filters', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Strategy' }).check();
    await page.getByLabel('Publisher').selectOption({ label: 'CodeForge Studios' });

    await expect(page.getByRole('link', { name: /DevOps Dominion/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Pipeline Conquest/ })).toBeHidden();
    await expect(page.getByRole('link', { name: /Code Puzzle Chronicles/ })).toBeHidden();
    await expect(page.getByTestId('filter-results')).toHaveText('Showing 1 game.');
  });

  test('clears selected filters and restores all games', async ({ page }) => {
    const allCards = page.getByTestId('game-card');
    const initialCount = await allCards.count();

    await page.getByRole('checkbox', { name: 'Strategy' }).check();
    await page.getByLabel('Publisher').selectOption({ label: 'CodeForge Studios' });
    await page.getByTestId('clear-filters').click();

    await expect(page.getByRole('checkbox', { name: 'Strategy' })).not.toBeChecked();
    await expect(page.getByLabel('Publisher')).toHaveValue('');
    await expect(page.locator('[data-testid="game-card"]:visible')).toHaveCount(initialCount);
    await expect(page.getByTestId('filter-results')).toHaveText(`Showing ${initialCount} games.`);
  });
});
