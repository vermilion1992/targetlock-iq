/**
 * Planner pilot gate smoke — compact planner shell + demo program.
 * Prerequisite: production server (npm run build && npm start).
 * Usage: npm run smoke:planner-gate
 */
import { chromium } from "playwright";

const baseUrl = process.env.TARGETLOCK_URL ?? "http://localhost:8080/targetlock";
const plannerUrl = baseUrl.replace(/\/targetlock\/?$/, "/targetlock/planner");

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
    if (msg.type() === "error" && !isBenignConsole(msg.text())) {
      errors.push(`console: ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

  await page.goto(plannerUrl, { waitUntil: "networkidle" });
  await page.waitForSelector(".planner-context-row", { timeout: 15000 });

  const createTab = page.getByRole("tab", { name: /^Create$/i });
  if ((await createTab.count()) === 0) {
    errors.push("Create tab not visible");
  }

  const plansTab = page.getByRole("tab", { name: /^Plans$/i });
  if ((await plansTab.count()) === 0) {
    errors.push("Plans tab not visible");
  }

  await plansTab.click();
  await page.waitForTimeout(300);

  // Header button reads "Demo program"; the empty-state CTA reads
  // "Load demo program" — accept either.
  const demoBtn = page.getByRole("button", { name: /(Load )?demo program/i });
  if ((await demoBtn.count()) === 0) {
    errors.push("Demo program button not found");
  } else {
    // Load the demo so downstream tabs (Program/Map/3D/QA) have content.
    await demoBtn.first().click();
    const confirmBtn = page.getByRole("button", { name: /^Load demo$/i });
    await confirmBtn.waitFor({ timeout: 5000 }).catch(() => {});
    if ((await confirmBtn.count()) > 0) {
      await confirmBtn.click();
    }
    await page.waitForTimeout(500);
    if ((await page.getByText(/RC2-001/i).count()) === 0) {
      errors.push("Demo program holes not visible after load");
    }
  }

  const navItems = ["Create", "Program", "Map", "3D", "QA", "Review", "Package"];
  for (const label of navItems) {
    // Prefix match: the QA tab's accessible name includes its risk-count badge.
    await page.getByRole("tab", { name: new RegExp(`^${label}`, "i") }).click();
    await page.waitForTimeout(label === "3D" ? 1500 : 300);
    if (label === "3D") {
      // Geology overlays panel mounts under the 3D scene.
      if ((await page.locator(".planner-geology").count()) === 0) {
        errors.push("Geology overlays panel not found on 3D tab");
      }
    }
  }

  await page.getByRole("tab", { name: /^Package/i }).click();
  await page.getByRole("button", { name: /Program package|Package \(CSV/i }).first().click();

  await browser.close();

  if (errors.length) {
    console.error("PLANNER GATE FAILED");
    errors.forEach((e) => console.error(" -", e));
    process.exit(1);
  }
  console.log("PLANNER GATE OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
