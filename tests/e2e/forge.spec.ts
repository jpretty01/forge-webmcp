import { expect, test, type Page } from '@playwright/test';

async function installWebMCPHarness(page: Page) {
  await page.addInitScript(() => {
    const registry = new Map<string, { execute: (input: Record<string, unknown>) => Promise<{ content: Array<{ text: string }> }> }>();
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        async registerTool(tool: { name: string; execute: (input: Record<string, unknown>) => Promise<{ content: Array<{ text: string }> }> }) {
          registry.set(tool.name, tool);
        },
      },
    });
    Object.defineProperty(window, '__forgeRegisteredTools', { configurable: true, value: registry });
  });
}

test.beforeEach(async ({ page }) => {
  await installWebMCPHarness(page);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('landing enters the laboratory and registers every WebMCP capability', async ({ page }) => {
  await page.getByRole('link', { name: 'Run the live demo' }).click();
  await expect(page.getByRole('main')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __forgeRegisteredTools: Map<string, unknown> }).__forgeRegisteredTools.size)).toBe(30);
});

test('native proposal waits for approval, regression proves the repair, rollback restores it, and reset is repeatable', async ({ page }) => {
  await page.goto('/lab');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __forgeRegisteredTools: Map<string, unknown> }).__forgeRegisteredTools.size)).toBe(30);

  const proposal = await page.evaluate(async () => {
    const registry = (window as unknown as { __forgeRegisteredTools: Map<string, { execute: (input: Record<string, unknown>) => Promise<{ content: Array<{ text: string }> }> }> }).__forgeRegisteredTools;
    await registry.get('find_progression_blockers')?.execute({});
    const response = await registry.get('modify_item_spawn')?.execute({
      item_id: 'item-crypt-key',
      new_location_id: 'loc-crypt-entry',
      reason: 'Repair the circular progression dependency with the narrowest reversible change.',
    });
    return JSON.parse(response?.content[0].text ?? '{}') as { proposalId?: string };
  });
  expect(proposal.proposalId).toBeTruthy();
  const keyRemainsBehindGate = await page.evaluate(async () => {
    const registry = (window as unknown as { __forgeRegisteredTools: Map<string, { execute: (input: Record<string, unknown>) => Promise<{ content: Array<{ text: string }> }> }> }).__forgeRegisteredTools;
    const response = await registry.get('get_location_state')?.execute({ location_id: 'loc-crypt-sanctum' });
    const result = JSON.parse(response?.content[0].text ?? '{}') as { data?: { items?: Array<{ id: string }> } };
    return result.data?.items?.some((item) => item.id === 'item-crypt-key') ?? false;
  });
  expect(keyRemainsBehindGate).toBe(true);

  await page.getByRole('tab', { name: /Approvals/ }).click();
  await page.getByRole('button', { name: 'Approve' }).click();
  await page.getByRole('tab', { name: /QA results/ }).click();
  await page.getByRole('button', { name: 'Run regression' }).click();
  await expect(page.getByText('Required key is locked behind its own gate')).toHaveCount(0);

  await page.getByRole('tab', { name: 'Audit' }).click();
  await expect(page.getByText('Native WebMCP agent').first()).toBeVisible();
  await page.getByRole('button', { name: 'Roll back' }).first().click();
  await page.getByRole('tab', { name: /QA results/ }).click();
  await page.getByRole('button', { name: 'Retest current world' }).click();
  await expect(page.getByText('Required key is locked behind its own gate')).toBeVisible();

  await page.getByRole('button', { name: 'Reset demo world' }).click();
  await page.getByRole('button', { name: 'Reset Ashen Reach' }).click();
  const resetRestoredDefect = await page.evaluate(async () => {
    const registry = (window as unknown as { __forgeRegisteredTools: Map<string, { execute: (input: Record<string, unknown>) => Promise<{ content: Array<{ text: string }> }> }> }).__forgeRegisteredTools;
    const response = await registry.get('find_progression_blockers')?.execute({});
    const result = JSON.parse(response?.content[0].text ?? '{}') as { data?: { blockerCount?: number } };
    return result.data?.blockerCount === 1;
  });
  expect(resetRestoredDefect).toBe(true);
});

test('keyboard navigation exposes accessible controls', async ({ page }) => {
  await page.goto('/lab');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', 'FORGE home');
  await expect(page.getByRole('tab', { name: 'World' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy next prompt' })).toBeVisible();
});

test('narrow layout keeps the world atlas and agent activity available', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'narrow-chatgpt-pane', 'Narrow-layout assertion runs in the narrow project.');
  await page.goto('/lab');
  await expect(page.getByRole('button', { name: 'Agent activity' })).toBeVisible();
  await page.getByRole('button', { name: 'World atlas' }).click();
  await expect(page.getByRole('navigation', { name: 'Locations' })).toBeVisible();
  await page.getByRole('button', { name: 'Agent activity' }).click();
  await expect(page.locator('aside[aria-label="Agent activity"]:visible')).toBeVisible();
});
