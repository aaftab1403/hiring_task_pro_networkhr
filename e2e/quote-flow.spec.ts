import { test, expect, type Page } from '@playwright/test';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
async function waitForResponse(page: Page, urlPattern: string) {
  return page.waitForResponse((res) => res.url().includes(urlPattern) && res.status() === 200);
}

// ─── E2E TEST SUITE ───────────────────────────────────────────────────────────
test.describe('PriceEngine Full User Flow', () => {
  const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForURL(`${BASE_URL}/admin`);
  });

  // ─── STEP 1: Navigate to Products ───────────────────────────────────────────
  test('Step 1 — Navigate to Products & Tiers', async ({ page }) => {
    await page.click('a[href="/admin/products"]');
    await page.waitForURL(`${BASE_URL}/admin/products`);
    await expect(page.locator('h1')).toContainText('Products');
  });

  // ─── FULL E2E FLOW ──────────────────────────────────────────────────────────
  test('Full flow: product → matrix → 12-month quote → public view', async ({ page }) => {
    const productName = `E2E-Product-${Date.now()}`;
    const tierName = 'Growth';
    const featureName = `API-Access-${Date.now()}`;
    const customerName = 'Playwright Corp';
    const quoteName = `E2E Quote ${Date.now()}`;
    let quoteUrl = '';

    // ── 1. Go to Products ──────────────────────────────────────────────────
    await page.click('a[href="/admin/products"]');
    await page.waitForURL(`${BASE_URL}/admin/products`);

    // ── 2. Create Product ──────────────────────────────────────────────────
    await page.click('#create-product-btn');
    await page.waitForSelector('.modal-content');
    await page.fill('#product-name', productName);
    await page.fill('#product-description', 'Automated test product');

    const productCreatedRes = waitForResponse(page, '/api/products');
    await page.click('button[type="submit"]');
    await productCreatedRes;
    await page.waitForSelector('.modal-content', { state: 'hidden' });

    // Select the newly created product
    await page.locator(`button:has-text("${productName}")`).first().click();

    // ── 3. Create Tier ─────────────────────────────────────────────────────
    await page.locator(`button[id^="add-tier-btn-"]`).first().click();
    await page.waitForSelector('.modal-content');
    await page.fill('#tier-name', tierName);
    await page.fill('#tier-base-price', '50');

    const tierCreatedRes = waitForResponse(page, '/api/tiers');
    await page.click('button[type="submit"]');
    await tierCreatedRes;
    await page.waitForSelector('.modal-content', { state: 'hidden' });

    // ── 4. Create Feature ──────────────────────────────────────────────────
    await page.locator(`button[id^="add-feature-btn-"]`).first().click();
    await page.waitForSelector('.modal-content');
    await page.fill('#feature-name', featureName);

    const featureCreatedRes = waitForResponse(page, '/api/features');
    await page.click('button[type="submit"]');
    await featureCreatedRes;
    await page.waitForSelector('.modal-content', { state: 'hidden' });

    // ── 5. Configure Matrix ────────────────────────────────────────────────
    await page.click('a[href="/admin/matrix"]');
    await page.waitForURL(`${BASE_URL}/admin/matrix`);

    // Select correct product in matrix
    await page.selectOption('#matrix-product-select', { label: productName });
    await page.waitForTimeout(500);

    // Click the cell for our feature and tier
    const cell = page.locator('td').filter({ hasText: featureName }).locator('..').locator('td').nth(1).locator('button');
    await cell.click();

    await page.waitForSelector('.modal-content');

    // Set to PAID_ADD_ON
    await page.click('input[value="PAID_ADD_ON"]');
    await page.selectOption('#pricing-model-select', 'PER_SEAT');
    await page.fill('#addon-value', '15');

    const matrixRes = waitForResponse(page, '/api/matrix');
    await page.click('button:has-text("Save Cell")');
    await matrixRes;
    await page.waitForSelector('.modal-content', { state: 'hidden' });

    // Verify cell shows Add-On badge
    await expect(
      page.locator('td').filter({ hasText: featureName }).locator('..').locator('td').nth(1)
    ).toContainText('Add-On');

    // ── 6. Build a Quote ───────────────────────────────────────────────────
    await page.click('a[href="/admin/quotes"]');
    await page.waitForURL(`${BASE_URL}/admin/quotes`);

    await page.click('#new-quote-btn');
    await page.waitForSelector('.modal-content');

    // Step 1: Metadata
    await page.fill('#quote-customer-name', customerName);
    await page.fill('#quote-name', quoteName);
    await page.click('button:has-text("Continue")');

    // Step 2: Product / Tier / Seats
    await page.selectOption('#quote-product-select', { label: productName });
    await page.waitForTimeout(300);
    await page.selectOption('#quote-tier-select', { label: tierName });
    await page.waitForTimeout(200);
    await page.fill('#quote-core-seats', '25');
    await page.click('button:has-text("Continue")');

    // Step 3: Term — Select ANNUAL (12 months)
    await page.click('input[value="ANNUAL"]');
    await page.click('button:has-text("Continue")');

    // Step 4: Add-Ons — Select the PER_SEAT add-on
    const addOnCheckbox = page.locator(`#addon-check-${featureName}`).or(
      page.locator('input[type="checkbox"]').first()
    );
    await addOnCheckbox.check();
    await page.waitForTimeout(300);

    // Fill in add-on seats
    const seatsInput = page.locator(`input[id^="addon-seats-"]`).first();
    await seatsInput.fill('5');

    // Set global discount
    await page.fill('#global-discount', '10');
    await page.click('button:has-text("Continue")');

    // Step 5: Review and save
    await page.waitForSelector('#save-quote-btn');

    // Capture the quote URL from the navigation after save
    const navigationPromise = page.waitForURL(`${BASE_URL}/admin/quotes`);
    await page.click('#save-quote-btn');
    await navigationPromise;

    // Find the newly created quote and get its view link
    await page.waitForTimeout(500);
    const viewButton = page.locator(`button[id^="view-quote-"]`).first();
    await expect(viewButton).toBeVisible();

    // ── 7. View Public Quote Page ──────────────────────────────────────────
    await viewButton.click();
    await page.waitForURL(/\/quote\//);
    quoteUrl = page.url();

    // Verify quote view page loads
    await expect(page.locator('#quote-breakdown-table')).toBeVisible();
    await expect(page.locator('h1')).toContainText(quoteName);
    await expect(page.locator('text=Prepared for')).toBeVisible();

    // Verify customer name
    await expect(page.locator(`text=${customerName}`)).toBeVisible();

    // Verify Total Contract Value is displayed
    const totalCell = page.locator('#quote-total-value');
    await expect(totalCell).toBeVisible();
    const totalText = await totalCell.textContent();
    expect(totalText).toMatch(/\$[\d,]+\.\d{2}/);

    // ── 8. Verify Calculation Values in Table ─────────────────────────────
    // Parse and validate the amounts in the breakdown table
    const formulaCells = page.locator('[data-testid^="formula-"]');
    const formulaCount = await formulaCells.count();
    expect(formulaCount).toBeGreaterThan(0);

    // Base formula should mention 25 seats, $50/seat/mo, 12 months, 15%
    const baseFormula = await page.locator('[data-testid="formula-0"]').textContent();
    expect(baseFormula).toMatch(/25 seats/);
    expect(baseFormula).toMatch(/\$50\.00\/seat\/mo/);
    expect(baseFormula).toMatch(/12 months/);
    expect(baseFormula).toMatch(/15%/);

    // Base amount should be $12,750.00
    const baseAmount = await page.locator('[data-testid="amount-0"]').textContent();
    expect(baseAmount).toContain('12,750.00');

    // ── 9. Verify total matches expected calculation ───────────────────────
    // base = 25 * 50 * 12 * 0.85 = 12750
    // addon PER_SEAT = 5 * 15 * 12 = 900
    // subtotal = 13650
    // 10% discount = 1365
    // final = 12285
    const totalValue = await totalCell.textContent();
    expect(totalValue).toContain('12,285.00');
  });

  // ─── QUOTE PAGE — Direct Access ─────────────────────────────────────────────
  test('Quote page 404 for invalid ID', async ({ page }) => {
    await page.goto(`${BASE_URL}/quote/00000000-0000-0000-0000-000000000000`);
    await expect(page.locator('text=404')).toBeVisible();
  });

  // ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────
  test('Admin dashboard loads and shows quick action cards', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('PriceEngine Dashboard');
    await expect(page.locator('text=Products & Tiers')).toBeVisible();
    await expect(page.locator('text=Feature Matrix')).toBeVisible();
    await expect(page.locator('text=Quote Builder')).toBeVisible();
  });
});
