import { expect, test } from "@playwright/test";

test.describe("Mobile experience", () => {
  test("homepage has no horizontal overflow and the mobile menu works", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: /open menu/i }).click();
    await expect(page.locator("#mobile-nav")).toBeVisible();
    await page.locator("#mobile-nav").getByRole("link", { name: /Rooms & Suites/ }).click();
    await expect(page).toHaveURL(/\/rooms$/);
  });

  test("Arabic homepage renders RTL without overflow", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const overflow = await page.evaluate(() => Math.abs(document.documentElement.scrollWidth - document.documentElement.clientWidth));
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("booking search bar navigates to the booking page on mobile", async ({ page }) => {
    await page.goto("/");
    await page.locator("form[aria-label]").first().getByRole("button", { name: /Search availability/ }).click();
    await expect(page).toHaveURL(/\/book\?checkIn=/);
    await page.waitForSelector('[data-testid="select-DBL"]');
    const overflow = await page.evaluate(() => Math.abs(document.documentElement.scrollWidth - document.documentElement.clientWidth));
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
