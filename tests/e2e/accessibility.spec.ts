import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = ['/', '/market', '/auction', '/match', '/settings'];

for (const route of routes) {
  test(`no critical a11y violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const critical = accessibilityScanResults.violations.filter(v => v.impact === 'critical');
    expect(critical, critical.map(v => `${v.id}: ${v.help} @ ${v.nodes.map(n => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
  });
}
