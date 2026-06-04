/**
 * Minimal RC1 browser smoke for pilot gate.
 * Prerequisite: production server (npm run build && npm start).
 * Usage: npm run smoke:pilot
 * Env: TARGETLOCK_URL (default http://localhost:8080/targetlock)
 */
import { chromium } from "playwright";

const appUrl = process.env.TARGETLOCK_URL ?? "http://localhost:8080/targetlock";

const BENIGN_CONSOLE = [
  /favicon/i,
  /Failed to load resource.*favicon/i,
  /Download the React DevTools/i,
];

function isBenignConsole(text) {
  return BENIGN_CONSOLE.some((re) => re.test(text));
}

async function main() {
  const errors = [];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (isBenignConsole(text)) return;
    errors.push(text);
  });

  page.on("pageerror", (err) => {
    errors.push(`pageerror: ${err.message}`);
  });

  try {
    await page.goto(appUrl, { waitUntil: "networkidle", timeout: 60_000 });
    await page
      .getByText("Loading hole package")
      .waitFor({ state: "hidden", timeout: 60_000 })
      .catch(() => {});
    await page.getByAltText("TargetLock IQ").waitFor({ timeout: 60_000 });

    const guideBtn = page.getByRole("button", { name: /^Guide$/i }).first();
    await guideBtn.click();
    await page.getByRole("heading", { name: /Guide Center/i }).waitFor({ timeout: 10_000 });
    await page.getByRole("button", { name: /^Close$/i }).first().click();
    await page.waitForTimeout(400);

    const scenarioBtn = page.getByRole("button", { name: /Scenario Lab/i }).first();
    await scenarioBtn.click();
    await page.getByRole("heading", { name: /Scenario Lab/i }).waitFor({ timeout: 10_000 });
    const closeLab = page.getByRole("button", { name: /^Close$/i }).first();
    if (await closeLab.isVisible().catch(() => false)) {
      await closeLab.click();
    } else {
      await page.keyboard.press("Escape");
    }
    await page.waitForTimeout(400);

    const advancedBtn = page.getByRole("button", { name: /^Advanced$/i }).first();
    if (await advancedBtn.isVisible().catch(() => false)) {
      await advancedBtn.click();
      await page.waitForTimeout(300);
      await page.getByRole("button", { name: /^Simple$/i }).first().click();
    }

    await page.getByRole("button", { name: /^Export TXT$/i }).waitFor({ timeout: 10_000 });
    await page.getByRole("button", { name: /^Export PDF$/i }).waitFor({ timeout: 5_000 });

    if (errors.length > 0) {
      console.error("Console errors:", errors);
      process.exit(1);
    }
    console.log("pilot-gate-smoke: pass");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("pilot-gate-smoke failed:", err.message);
  process.exit(1);
});
