/**
 * Capture TargetLock pitch screenshots. Requires dev server on :3000.
 * Usage: npm run capture:screenshots
 */
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "..", "..", "docs", "targetlock-pitch", "screenshots");
const appRoot = process.env.TARGETLOCK_URL ?? "http://localhost:3000/targetlock";
function urlWithMode(mode) {
  const u = new URL(appRoot);
  u.searchParams.set("mode", mode);
  return u.toString();
}

async function waitForApp(page) {
  await page.getByRole("heading", { name: "TargetLock IQ" }).waitFor({ timeout: 60_000 });
  await page.waitForTimeout(1200);
}

async function advanceTourToTitle(page, titlePattern, maxSteps = 12) {
  for (let i = 0; i < maxSteps; i += 1) {
    const title = page.locator(".pitch-walkthrough-title");
    if (await title.isVisible().catch(() => false)) {
      const text = (await title.textContent()) ?? "";
      if (titlePattern.test(text)) return;
    }
    const next = page.getByRole("button", { name: /^Next$/i });
    if (await next.isVisible().catch(() => false)) {
      await next.click();
    } else {
      await page.getByRole("button", { name: /^Finish guide$/i }).click();
    }
    await page.waitForTimeout(500);
  }
  throw new Error(`Tour did not reach step matching ${titlePattern}`);
}

async function screenshot(page, name, options = {}) {
  const path = join(outDir, name);
  if (options.clipTo) {
    await page.locator(options.clipTo).first().screenshot({ path });
  } else {
    await page.screenshot({ path, fullPage: options.fullPage ?? false });
  }
  console.log("Wrote", path);
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await page.goto(urlWithMode("simple"), { waitUntil: "networkidle" });
  await waitForApp(page);
  await screenshot(page, "01-simple-dashboard.png");

  await page.goto(urlWithMode("advanced"), { waitUntil: "networkidle" });
  await waitForApp(page);
  await page.getByRole("heading", { name: /Hole library/i }).waitFor({ state: "visible", timeout: 20_000 });

  // Advanced is tabbed: select each tab before capturing its content.
  const selectTab = async (name) => {
    const tab = page.getByRole("tab", { name });
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await page.waitForTimeout(500);
    }
  };

  await selectTab(/Steering feasibility/i);
  await screenshot(page, "02-advanced-dashboard.png", { fullPage: true });
  await screenshot(page, "10-steering-feasibility.png");

  await page.getByRole("heading", { name: /Hole library/i }).scrollIntoViewIfNeeded();
  await screenshot(page, "03-hole-library.png", { clipTo: ".targetlock-sidebar" });

  await selectTab(/Setup \/ assumptions/i);
  await screenshot(page, "11-capability-assumptions.png");

  await selectTab(/Decisions/i);
  await page.getByRole("heading", { name: /Supervisor decision/i }).scrollIntoViewIfNeeded().catch(() => {});
  await screenshot(page, "04-supervisor-decision.png", { clipTo: ".targetlock-sidebar" });

  await selectTab(/Trajectory/i);
  await page
    .getByRole("img", { name: /Three-dimensional plan and actual trajectory/i })
    .scrollIntoViewIfNeeded()
    .catch(() => {});
  await screenshot(page, "05-trajectory-3d.png");

  await page.getByRole("button", { name: /^Guide$/i }).click();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: /Standard hole workflow/i }).click();
  await page.getByRole("button", { name: /Start guide/i }).click();
  await page.waitForTimeout(500);
  await advanceTourToTitle(page, /Understand the Action Plan/i);
  await screenshot(page, "06-pitch-correction-step.png");

  await advanceTourToTitle(page, /Understand the Action Plan/i);
  await screenshot(page, "09-action-plan.png");

  await page.getByRole("button", { name: /Exit guide/i }).click().catch(() => {});
  await page.waitForTimeout(400);

  await page.getByRole("button", { name: /Export PDF/i }).scrollIntoViewIfNeeded();
  await screenshot(page, "07-export-handover-buttons.png", { clipTo: ".targetlock-sidebar" });

  const pdfPage = await context.newPage();
  const previewUrl = new URL("/pitch-handover-preview.html", appRoot).toString();
  await pdfPage.goto(previewUrl, { waitUntil: "networkidle", timeout: 30_000 });
  await pdfPage.locator("#pdf-canvas").waitFor({ timeout: 20_000 });
  await pdfPage.waitForTimeout(800);
  await pdfPage.screenshot({
    path: join(outDir, "08-pdf-handover-preview.png"),
  });
  console.log("Wrote", join(outDir, "08-pdf-handover-preview.png"));
  await pdfPage.close();

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
