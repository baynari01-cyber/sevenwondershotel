import { expect, test } from "@playwright/test";
import { ADMIN_PASSWORD, login } from "./helpers";

test.describe("Admin dashboard", () => {
  test("redirects anonymous users to the login page", async ({ page }) => {
    await page.goto("/admin/reservations");
    await expect(page).toHaveURL(/\/admin\/login\?next=/);
  });

  test("rejects wrong credentials", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("#email", "admin@demo.baynari.local");
    await page.fill("#password", "wrong-password-123");
    await page.click('button[type="submit"]');
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("overview shows today's metrics and navigation works in both languages", async ({ page }) => {
    await login(page);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Today at the hotel/);
    await expect(page.getByText(/Occupancy tonight/i)).toBeVisible();
    await page.goto("/ar/admin");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("اليوم في الفندق");
  });

  test("viewer role cannot mutate reservations", async ({ page }) => {
    await login(page, "viewer@demo.baynari.local", ADMIN_PASSWORD);
    await page.goto("/admin/reservations");
    await page.locator("table tbody tr a").first().click();
    await expect(page.locator('[data-testid="status-actions"]')).toHaveCount(0);
    await expect(page.locator("textarea")).toHaveCount(0);
  });

  test("front desk can create a manual reservation that is priced on the server", async ({ page }) => {
    await login(page, "frontdesk@demo.baynari.local", ADMIN_PASSWORD);
    await page.goto("/admin/reservations/new");
    await page.fill("#g-fn", "Walk");
    await page.fill("#g-ln", "In");
    await page.fill("#g-em", "walk.in@example.com");
    await page.fill("#g-ph", "+962 77 123 4567");
    await page.getByRole("button", { name: /Price breakdown/i }).click();
    await expect(page.locator("dd.font-display")).toBeVisible();
    await page.getByRole("button", { name: /New reservation/i }).click();
    await expect(page).toHaveURL(/\/admin\/reservations\/[a-z0-9]+$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/SW-/);
  });
});
