import { expect, type Page } from "@playwright/test";

export const ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL ?? "admin@demo.baynari.local";
export const ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD ?? "SevenWonders!Demo2026";

export function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function login(page: Page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto("/admin/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin(\?|$)/);
}

export async function completeBooking(page: Page, opts: { checkIn: string; checkOut: string; roomCode?: string; rateCode?: string; locale?: "en" | "ar"; rooms?: number }) {
  const prefix = opts.locale === "ar" ? "/ar" : "";
  const rooms = opts.rooms ?? 1;
  await page.goto(`${prefix}/book?checkIn=${opts.checkIn}&checkOut=${opts.checkOut}&adults=${2 * rooms}&children=0&rooms=${rooms}`);
  const roomCode = opts.roomCode ?? "DBL";
  await page.waitForSelector(`[data-testid="select-${roomCode}"]`);
  for (let i = 0; i < rooms; i++) {
    if (i === 0) await page.click(`[data-testid="select-${roomCode}"]`);
    else await page.locator(`[data-testid="room-type-${roomCode}"] button[aria-label]`).last().click();
  }
  await page.click('[data-testid="continue-rates"]');
  await page.locator(`[data-testid="rate-${opts.rateCode ?? "BB"}"]`).first().click();
  await page.click('[data-testid="continue-extras"]');
  await page.click('[data-testid="extra-HAMMAM"] button');
  await page.click('[data-testid="continue-guest"]');
  await page.fill("#firstName", "Playwright");
  await page.fill("#lastName", "Guest");
  await page.fill("#email", "playwright.guest@example.com");
  await page.fill("#phone", "+962 79 000 0000");
  await page.selectOption("#country", "GB");
  await page.click('[data-testid="continue-review"]');
  await page.waitForSelector('[data-testid="grand-total"]');
  const total = (await page.textContent('[data-testid="grand-total"]')) ?? "";
  await page.click('[data-testid="accept-terms"]');
  await page.click('[data-testid="confirm-reservation"]');
  await page.waitForSelector('[data-testid="reference"]');
  const reference = ((await page.textContent('[data-testid="reference"]')) ?? "").trim();
  return { reference, total };
}
