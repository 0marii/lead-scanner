import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Avoid relying on third-party tile availability in browser tests.
  await page.route("https://tile.openstreetmap.org/**", route => route.fulfill({
    contentType: "image/png",
    body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64"),
  }));
});

test("radius clicks update scan coordinates and demo exports download", async ({ page }) => {
  await page.goto("/scan");
  const map = page.locator(".leaflet-container");
  await expect(map).toBeVisible();
  await map.click({ position: { x: 120, y: 120 } });
  await page.getByLabel("Use mock data").check();
  const requestPromise = page.waitForRequest(request => request.url().endsWith("/api/scan"));
  await page.getByRole("button", { name: "[ SCAN ]", exact: true }).click();
  const request = await requestPromise;
  expect(request.postDataJSON().center).not.toEqual({ lat: 40.7128, lng: -74.006 });
  await expect(page.getByRole("status")).toContainText("fictional businesses");
  await expect(page.getByRole("button", { name: /^Save / }).first()).toBeVisible();
  for (const format of ["csv", "json", "xlsx"]) {
    await page.getByRole("button", { name: "[ EXPORT ▾ ]" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: `.${format}`, exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`leads.${format}`);
    expect(await download.failure()).toBeNull();
  }
});

test("scan modes stay consistent and completed empty scans explain the result", async ({ page }) => {
  await page.goto("/scan");
  await page.getByRole("button", { name: "MULTI", exact: true }).click();
  await expect(page.getByRole("button", { name: "MULTI", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("combobox", { name: "state:", exact: true }).click();
  await page.getByRole("combobox", { name: "Search states", exact: true }).fill("Texas");
  await page.getByRole("option", { name: "Texas", exact: true }).click();
  await expect(page.getByRole("button", { name: "MULTI", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.route("**/api/scan", route => route.fulfill({ json: { leads: [], scanned: 12, skipped: 12, provider: "overpass" } }));
  await page.getByRole("button", { name: "[ SCAN ]", exact: true }).click();
  await expect(page.getByText("No matching businesses found.", { exact: false })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("verify each lead");
});

test("live failure is visible and does not show demo leads", async ({ page }) => {
  await page.goto("/scan");
  await page.route("**/api/scan", route => route.fulfill({ status: 503, json: { error: "Live provider unavailable" } }));
  await page.getByRole("button", { name: "[ SCAN ]", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Live provider unavailable" })).toHaveText("Live provider unavailable");
  await expect(page.getByRole("button", { name: /^Save / })).toHaveCount(0);
});

test("mobile navigation reaches scanner and information pages", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("link", { name: "[SCAN]", exact: true }).click();
  await expect(page).toHaveURL(/\/scan$/);
  await page.getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Privacy", exact: true })).toBeVisible();
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "Terms of use", exact: true })).toBeVisible();
});

test("tile failures show a retry control and preserve the scanner", async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", route => route.abort());
  await page.goto("/scan");
  await expect(page.getByRole("alert").filter({ hasText: "Map tiles could not load" })).toBeVisible();
  await expect(page.getByRole("button", { name: "[ SCAN ]", exact: true })).toBeEnabled();
  await page.unroute("https://tile.openstreetmap.org/**");
  await page.route("https://tile.openstreetmap.org/**", route => route.fulfill({
    contentType: "image/png",
    body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64"),
  }));
  await page.getByRole("button", { name: "Retry map", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Map tiles could not load" })).toHaveCount(0);
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible();
});

test("custom dropdowns support keyboard selection, bounded search, and dismissal", async ({ page }) => {
  await page.goto("/scan");
  const radius = page.getByRole("combobox", { name: "radius:", exact: true });
  await radius.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(radius).toContainText("15 mi");
  await page.getByRole("combobox", { name: "state:", exact: true }).click();
  const list = page.getByRole("listbox");
  expect((await list.boundingBox())!.height).toBeLessThanOrEqual(240);
  await page.screenshot({ path: "test-results/dropdown-desktop.png", animations: "disabled" });
  await page.getByRole("combobox", { name: "Search states", exact: true }).fill("CA");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("combobox", { name: "state:", exact: true })).toContainText("California");
  await expect(radius).toBeDisabled();
  await page.getByRole("combobox", { name: "state:", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await page.getByRole("combobox", { name: "state:", exact: true }).click();
  await page.getByRole("combobox", { name: "Search states", exact: true }).fill("No matching state");
  await expect(page.getByText("No states found.")).toBeVisible();
  await page.getByText("Mode:", { exact: false }).click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
});

test("state menu fits a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/scan");
  await page.getByRole("combobox", { name: "state:", exact: true }).click();
  const bounds = (await page.getByRole("listbox").boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
  await page.screenshot({ path: "test-results/dropdown-mobile.png", animations: "disabled" });
});

test("result cards filter, save, and select matching map pins", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const business = (id: string, name: string, lat: number, lng: number) => ({ id, name, lat, lng, phone: "(202) 555-0100", city: "New York", address: "123 Example Avenue, New York", rating: "4.3", reviewCount: 12, mapsUrl: "https://www.openstreetmap.org/", category: "plumbers", source: "mock" });
  await page.route("**/api/scan", route => route.fulfill({ json: { provider: "mock", scanned: 5, skipped: 2, leads: [business("a", "Northside Plumbing", 40.7128, -74.006), business("b", "Summit Pipe Services", 40.713, -74.0061), business("c", "Central Plumbing", 40.75, -73.97)] } }));
  await page.goto("/scan");
  await page.getByRole("button", { name: "[ SCAN ]", exact: true }).click();
  const results = page.getByRole("region", { name: "Scan results" });
  await expect(results.getByRole("listitem")).toHaveCount(3);
  await expect(page.locator(".lead-cluster").first()).toBeVisible();
  await page.getByRole("button", { name: "Show Northside Plumbing on map" }).click();
  await expect(page.locator(".lead-pin--selected")).toBeVisible();
  await expect(page.locator(".business-popup")).toContainText("Northside Plumbing");
  await page.locator(".leaflet-popup-close-button").click();
  await page.locator('.lead-pin[title="Central Plumbing"]').click();
  await expect(page.getByRole("button", { name: "Show Central Plumbing on map" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Show Northside Plumbing on map" }).click();
  await page.getByRole("button", { name: "Save Northside Plumbing", exact: true }).click();
  await page.getByRole("button", { name: "Saved (1)", exact: true }).click();
  await expect(results.getByRole("listitem")).toHaveCount(1);
  await page.getByRole("button", { name: "Saved (1)", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search leads" }).fill("Summit");
  await expect(results.getByRole("listitem")).toHaveCount(1);
  await expect(results).toContainText("Summit Pipe Services");
  await page.getByRole("searchbox", { name: "Search leads" }).fill("");
  await page.screenshot({ path: "test-results/results-desktop.png", fullPage: true, animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await results.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/results-mobile.png", animations: "disabled" });
});

test("multi-zone scanning preserves each radius, supports removal, and enforces five zones", async ({ page }) => {
  await page.goto("/scan");
  const multi = page.getByRole("button", { name: "MULTI", exact: true });
  const scan = page.getByRole("button", { name: "[ SCAN ]", exact: true });
  await multi.click();
  await expect(scan).toBeDisabled();
  const map = page.locator(".leaflet-container");
  await expect(map).toBeVisible();
  await map.click({ position: { x: 130, y: 170 } });
  await expect(page.locator(".zone-pin")).toHaveCount(1);
  await page.getByRole("combobox", { name: "radius:", exact: true }).click();
  await page.getByRole("option", { name: "25 mi", exact: true }).click();
  await map.click({ position: { x: 300, y: 240 } });
  const zones = page.getByLabel("Scan zones", { exact: true });
  await expect(zones).toContainText("Zone 1 · 10 mi");
  await expect(zones).toContainText("Zone 2 · 25 mi");
  await page.getByRole("button", { name: "Remove zone 1", exact: true }).click();
  await expect(page.locator(".zone-pin")).toHaveCount(1);
  await expect(zones).toContainText("Zone 1 · 25 mi");
  for (const [x, y] of [[150, 300], [250, 380], [350, 450], [440, 520]]) await map.click({ position: { x, y } });
  await expect(page.locator(".zone-pin")).toHaveCount(5);
  await map.click({ position: { x: 500, y: 570 } });
  await expect(page.getByRole("alert").filter({ hasText: "Maximum 5 zones" })).toBeVisible();
  await expect(page.locator(".zone-pin")).toHaveCount(5);
  await page.getByLabel("Use mock data").check();
  const sent = page.waitForRequest(request => request.url().endsWith("/api/scan"));
  await scan.click();
  const body = (await sent).postDataJSON();
  expect(body.mode).toBe("multi");
  expect(body.zones).toHaveLength(5);
  expect(body.zones.every((zone: { radiusMiles: number }) => zone.radiusMiles === 25)).toBe(true);
  expect(new Set(body.zones.map((zone: { lat: number; lng: number }) => `${zone.lat},${zone.lng}`)).size).toBe(5);
  await expect(page.getByRole("status")).toContainText("Demo results");
  await page.getByRole("button", { name: "[CLR]", exact: true }).click();
  await expect(page.locator(".zone-pin")).toHaveCount(0);
  await expect(scan).toBeDisabled();
  await multi.click();
  await expect(scan).toBeEnabled();
});

test("switching from a state to multi keeps the selected geographic area", async ({ page }) => {
  await page.goto("/scan");
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await page.getByRole("combobox", { name: "state:", exact: true }).click();
  await page.getByRole("combobox", { name: "Search states", exact: true }).fill("Texas");
  await page.getByRole("option", { name: "Texas", exact: true }).click();
  await expect(page.locator(".leaflet-overlay-pane path.leaflet-interactive")).toBeVisible();
  await page.getByRole("button", { name: "MULTI", exact: true }).click();
  const map = page.locator(".leaflet-container");
  const bounds = (await map.boundingBox())!;
  await map.click({ position: { x: bounds.width / 2, y: bounds.height / 2 } });
  await page.getByLabel("Use mock data").check();
  const request = page.waitForRequest(request => request.url().endsWith("/api/scan"));
  await page.getByRole("button", { name: "[ SCAN ]", exact: true }).click();
  const [zone] = (await request).postDataJSON().zones;
  expect(zone.lat).toBeGreaterThan(25);
  expect(zone.lat).toBeLessThan(37);
  expect(zone.lng).toBeGreaterThan(-107);
  expect(zone.lng).toBeLessThan(-93);
  await expect(page.getByRole("status")).toContainText("Demo results");
});
