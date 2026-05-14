import { test, expect } from './fixtures/coverage'

test('smoke: app boots, sample loads, shortcuts work', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  await page.goto('/')

  // Toolbar renders, Hand is the default tool.
  const toolbar = page.getByRole('toolbar', { name: 'Drawing tools' })
  await expect(toolbar).toBeVisible()
  await expect(page.getByRole('button', { name: 'Hand' })).toHaveAttribute('aria-pressed', 'true')

  // Sidebar renders, JSON tab is active by default.
  await expect(page.getByRole('tab', { name: /JSON/ })).toHaveAttribute('aria-selected', 'true')

  // Status pill displays a MapKit state (mock simulates 'ready').
  await expect(page.locator('text=MapKit JS').first()).toBeVisible()

  // Load sample data from the empty-state CTA.
  await page.getByRole('button', { name: /Load sample data/ }).click()
  await expect(page.getByRole('tab', { name: /JSON/ })).toContainText('3')

  // Keyboard shortcut switches to the Point tool.
  await page.keyboard.press('p')
  await expect(page.getByRole('button', { name: 'Point' })).toHaveAttribute('aria-pressed', 'true')

  expect(consoleErrors).toEqual([])
})
