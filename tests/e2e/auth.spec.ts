import { test, expect } from '@playwright/test'

test.describe('Auth Flow', () => {
  test('unauthentifizierter User wird zu /login redirectet', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText('EventFlow')).toBeVisible()
  })

  test('Login-Formular ist sichtbar und hat Email-Feld', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('E-Mail')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Magic Link senden' })).toBeVisible()
  })

  test('/dashboard ohne Auth redirectet zu /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('/home ohne Auth redirectet zu /login', async ({ page }) => {
    await page.goto('/home')
    await expect(page).toHaveURL(/\/login/)
  })
})
