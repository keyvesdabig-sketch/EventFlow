import { test, expect, type Page } from '@playwright/test'

/**
 * Loggt einen Benutzer via E2E-Login ein.
 * Holt Tokens vom /api/e2e-login-Endpoint, setzt sie via /auth/e2e-callback.
 */
async function devLogin(page: Page, email: string) {
  // Tokens vom E2E-Endpoint holen (server-seitig, kein Supabase-Redirect)
  const res = await page.request.get(`/api/e2e-login?email=${encodeURIComponent(email)}`)
  if (!res.ok()) throw new Error(`e2e-login fehlgeschlagen: ${res.status()} ${await res.text()}`)
  const { access_token, refresh_token } = await res.json()

  // Session via App-eigene Callback-Seite setzen (setzt Supabase-Cookies korrekt)
  await page.goto(
    `/auth/e2e-callback?access_token=${encodeURIComponent(access_token)}&refresh_token=${encodeURIComponent(refresh_token)}`,
  )
  await page.waitForURL(/\/(dashboard|home)/, { timeout: 20_000 })
}

test.describe('Booking-Zyklus (Smoke Test)', () => {
  test('Owner erstellt Event, schickt Anfrage — Freelancer sagt zu', async ({ browser }) => {
    // ─── Owner-Session ────────────────────────────────────────────────────────
    const ownerCtx = await browser.newContext()
    const owner = await ownerCtx.newPage()

    await devLogin(owner, 'keyvesdabig@gmail.com')
    await expect(owner).toHaveURL(/\/dashboard/)

    // ─── Event erstellen ──────────────────────────────────────────────────────
    await owner.goto('/events/new')

    // Step 1: Template wählen
    await owner.getByText('NL2 Heimspiel EHC Chur').click()

    // Step 2: Titel setzen, erste Phase befüllen, Weiter
    await expect(owner.getByPlaceholder('z. B. EHC Chur vs. HC Davos')).toBeVisible()
    await owner.getByPlaceholder('z. B. EHC Chur vs. HC Davos').fill('E2E Smoke-Test Event')
    await owner.locator('input[type="time"]').first().fill('14:00')
    await owner.getByRole('button', { name: 'Weiter' }).click()

    // Step 3: Direkt speichern (Venue ist optional)
    await owner.getByRole('button', { name: 'Als Entwurf speichern' }).click()

    // Auf Event-Detailseite warten
    await owner.waitForURL(/\/events\/[0-9a-f-]{36}$/, { timeout: 15_000 })
    const eventUrl = owner.url()

    // ─── Booking starten ─────────────────────────────────────────────────────
    await owner.getByRole('button', { name: 'Booking starten' }).click()
    await expect(owner.getByText('Kameramann 1')).toBeVisible({ timeout: 10_000 })

    // Kameramann 1: Anderen wählen → Max Müller (Button enthält Name + Skills)
    await owner.getByRole('button', { name: /Andere wählen/ }).first().click()
    // Warten bis der Picker mit Max Müller aufgeklappt ist
    await expect(owner.getByText('Max Müller').first()).toBeVisible({ timeout: 5_000 })
    await owner.getByText('Max Müller').first().click()

    // Warten bis Assignment gesetzt (Button wird aktiv)
    await expect(owner.getByRole('button', { name: /Anfragen senden \(1/ })).toBeEnabled({ timeout: 5_000 })

    // Anfragen senden und hart neu laden (Realtime-Subscription in Tests nicht zuverlässig)
    await owner.getByRole('button', { name: /Anfragen senden/ }).click()
    await owner.waitForTimeout(2_000)
    await owner.goto(eventUrl)
    await expect(owner.getByText('Angefragt')).toBeVisible({ timeout: 10_000 })

    // ─── Freelancer-Session ───────────────────────────────────────────────────
    const freelancerCtx = await browser.newContext()
    const freelancer = await freelancerCtx.newPage()

    await devLogin(freelancer, 'max@crew.ch')
    await expect(freelancer).toHaveURL(/\/home/)

    // Booking-Anfrage sehen und zusagen
    await expect(freelancer.getByText('E2E Smoke-Test Event').first()).toBeVisible({ timeout: 10_000 })
    await freelancer.getByRole('button', { name: 'Zusagen' }).first().click()
    // Kurz warten bis die Zusage serverseitig verarbeitet ist
    await freelancer.waitForTimeout(2_000)

    // ─── Owner prüft bestätigten Status ──────────────────────────────────────
    await owner.goto(eventUrl)
    await expect(owner.getByText('Zugesagt')).toBeVisible({ timeout: 10_000 })

    await ownerCtx.close()
    await freelancerCtx.close()
  })
})
