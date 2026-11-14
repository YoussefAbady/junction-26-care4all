import { expect, test } from "@playwright/test";

// These journeys run against the PWA container, which is the address people open (see playwright.config.ts).
test.use({ serviceWorkers: "allow" });

test("the PWA is installable, registers its worker, opens offline and caches only the public content from the API", async ({ page, context, request }) => {
  await page.goto("/");

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(manifestHref).toBeTruthy();
  const manifest = await (await request.get(manifestHref!)).json();
  expect(manifest).toMatchObject({ name: "care4all", display: "standalone", start_url: "/", scope: "/" });
  expect(manifest.icons.some((icon: { sizes: string; purpose: string }) => icon.sizes === "512x512" && icon.purpose === "maskable")).toBe(true);
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok(), icon.src).toBe(true);
  expect((await request.get(await page.locator('link[rel="apple-touch-icon"]').getAttribute("href") as string)).ok()).toBe(true);

  // The app registers its own worker on load, and the worker controls the page after a reload.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  // The worker keeps exactly one API response: the public content, which the app asked for when it started after the
  // reload. Every other API call goes through the worker without being stored, including a path that only starts like it.
  const cachedPaths = () => page.evaluate(async () => {
    const paths: string[] = [];
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      paths.push(...(await cache.keys()).map(entry => new URL(entry.url).pathname));
    }
    return paths;
  });
  await expect.poll(async () => (await cachedPaths()).filter(path => path.startsWith("/api/"))).toEqual(["/api/content"]);
  await page.evaluate(async () => {
    await fetch("/api/cancers?lang=en");
    await fetch("/api/account?view=identity");
    await fetch("/api/content-reports");
  });
  const cached = await cachedPaths();
  expect(cached).toContain("/");
  expect(cached.some(path => path.endsWith(".js"))).toBe(true);
  expect(cached.filter(path => path.startsWith("/api/") && path !== "/api/content")).toEqual([]);

  // Offline, the cached shell still opens.
  await context.setOffline(true);
  await page.reload();
  await expect(page).toHaveTitle(/care4all/);
  await expect(page.locator("#app")).toBeVisible();
  await expect(page.locator(".screen")).toHaveCount(1);
  await context.setOffline(false);

  // The only thing this browser holds for the app is display preferences.
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.every(key => key === "c4a:display")).toBe(true);
});

test("the PWA container serves strict security headers and proxies the backend", async ({ request }) => {
  const page = await request.get("/");
  expect(page.status()).toBe(200);
  const headers = page.headers();
  expect(headers["content-security-policy"]).toContain("script-src 'self'");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("no-referrer");
  expect(headers["cache-control"]).toBe("no-cache");

  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect((await health.json()).status).toBe("ok");

  // Private responses are never cacheable.
  const account = await request.get("/api/account?view=identity");
  expect(account.headers()["cache-control"]).toContain("no-store");

  // A write that does not come from the PWA's own origin is refused.
  const foreign = await request.post("/api/account", { headers: { Origin: "http://example.invalid" }, data: {} });
  expect(foreign.status()).toBe(403);
});
