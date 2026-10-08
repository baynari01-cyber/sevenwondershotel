import { expect, test } from "@playwright/test";
import { completeBooking, isoDaysFromNow, login } from "./helpers";

test.describe("Direct booking engine", () => {
  test("rejects invalid dates in the search bar", async ({ page }) => {
    await page.goto("/book");
    await page.fill("#checkIn", isoDaysFromNow(5));
    await page.fill("#checkOut", isoDaysFromNow(5));
    await page.click('button[type="submit"]');
    await expect(page.getByRole("alert").first()).toContainText(/after check-in|بعد تاريخ الوصول/);
  });

  test("books a two-night stay, keeps state across refresh, confirms and appears in the dashboard with reduced inventory", async ({ page }) => {
    const offset = 30 + Math.floor(Math.random() * 120);
    const checkIn = isoDaysFromNow(offset);
    const checkOut = isoDaysFromNow(offset + 2);
    await page.goto(`/book?checkIn=${checkIn}&checkOut=${checkOut}&adults=2&children=0&rooms=1`);
    await page.waitForSelector('[data-testid="select-DBL"]');
    const availableBefore = Number(await page.locator('[data-testid="room-type-DBL"] [data-testid="available-count"]').getAttribute("data-available"));
    expect(availableBefore).toBeGreaterThan(0);

    await page.click('[data-testid="select-DBL"]');
    await page.click('[data-testid="continue-rates"]');
    await page.click('[data-testid="rate-BB"]');
    await page.click('[data-testid="continue-extras"]');
    await page.click('[data-testid="continue-guest"]');
    await page.fill("#firstName", "Refresh");
    await page.fill("#lastName", "Tester");
    await page.fill("#email", "refresh.tester@example.com");
    await page.fill("#phone", "+962 79 111 2222");
    await page.selectOption("#country", "DE");
    await page.click('[data-testid="continue-review"]');
    await page.waitForSelector('[data-testid="grand-total"]');
    const before = await page.textContent('[data-testid="grand-total"]');

    await page.reload();
    await page.waitForSelector('[data-testid="grand-total"]');
    expect(await page.textContent('[data-testid="grand-total"]')).toBe(before);

    // Price breakdown is itemised: subtotal, service charge, tax, total.
    const breakdown = await page.locator('[data-testid="price-breakdown"]').textContent();
    expect(breakdown).toMatch(/10%/);
    expect(breakdown).toMatch(/16%/);

    await page.click('[data-testid="accept-terms"]');
    await page.click('[data-testid="confirm-reservation"]');
    await page.waitForSelector('[data-testid="reference"]');
    const reference = ((await page.textContent('[data-testid="reference"]')) ?? "").trim();
    expect(reference).toMatch(/^SW-\d{4}-[A-Z0-9]{5}$/);
    await expect(page.getByText(/DEMONSTRATION|نسخة تجريبية/i).first()).toBeVisible();

    // Inventory decreased by one for the same dates.
    await page.goto(`/book?checkIn=${checkIn}&checkOut=${checkOut}&adults=2&children=0&rooms=1`);
    await page.waitForSelector('[data-testid="select-DBL"]');
    const availableAfter = Number(await page.locator('[data-testid="room-type-DBL"] [data-testid="available-count"]').getAttribute("data-available"));
    expect(availableAfter).toBe(availableBefore - 1);

    // The reservation is visible in the admin dashboard immediately.
    await login(page);
    await page.goto(`/admin/reservations?q=${reference}`);
    await expect(page.locator(`a:has-text("${reference}")`).first()).toBeVisible();
    await page.locator(`a:has-text("${reference}")`).first().click();
    await expect(page.locator('[data-testid="status-actions"]')).toBeVisible();
    await expect(page.getByText(before ?? "").first()).toBeVisible();

    // Cancelling releases the room.
    await page.click('[data-testid="cancel-reservation"]');
    await page.click('[data-testid="confirm-cancel"]');
    await expect(page.locator('[data-testid="reservation-status"]')).toContainText(/Cancelled|ملغى/);
    await page.goto(`/book?checkIn=${checkIn}&checkOut=${checkOut}&adults=2&children=0&rooms=1`);
    await page.waitForSelector('[data-testid="select-DBL"]');
    const availableReleased = Number(await page.locator('[data-testid="room-type-DBL"] [data-testid="available-count"]').getAttribute("data-available"));
    expect(availableReleased).toBe(availableBefore);
  });

  test("books two rooms of the same category in one reservation", async ({ page }) => {
    const offset = 60 + Math.floor(Math.random() * 200);
    const { reference } = await completeBooking(page, { checkIn: isoDaysFromNow(offset), checkOut: isoDaysFromNow(offset + 1), roomCode: "TWN", rateCode: "ROOM_ONLY", rooms: 2 });
    expect(reference).toMatch(/^SW-/);
    await login(page);
    await page.goto(`/admin/reservations/${reference}`);
    await expect(page.locator("select[aria-label]").filter({ hasText: "TWN-" })).toHaveCount(2);
  });

  test("Arabic booking flow renders RTL and confirms", async ({ page }) => {
    await page.goto("/ar/book");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const offset = 60 + Math.floor(Math.random() * 200);
    const { reference } = await completeBooking(page, { checkIn: isoDaysFromNow(offset), checkOut: isoDaysFromNow(offset + 2), locale: "ar", roomCode: "TRP", rateCode: "FLEX" });
    expect(reference).toMatch(/^SW-/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("تم تأكيد الحجز التجريبي");
  });
});
