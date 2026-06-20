import { chromium } from "playwright";

const BASE = process.env.TARGETLOCK_URL ?? "http://localhost:3000/targetlock";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(BASE, { waitUntil: "networkidle" });

  // Advanced mode + Settings tab
  await page.getByRole("tab", { name: "Advanced", exact: true }).click();
  await page.getByRole("tab", { name: "Settings", exact: true }).click();

  const gearNatural = page.locator('.targetlock-settings-gear-row input[type="checkbox"]').first();
  const wasChecked = await gearNatural.isChecked();
  await gearNatural.click({ force: true });
  const afterGear = await gearNatural.isChecked();
  console.log("gear toggle:", { wasChecked, afterGear, changed: wasChecked !== afterGear });

  const toleranceField = page.locator('.targetlock-settings-field', {
    has: page.locator('.targetlock-settings-field-label', { hasText: 'Tolerance' }),
  });
  const toleranceSlider = toleranceField.locator(".targetlock-settings-slider");
  const toleranceInput = toleranceField.locator(".targetlock-settings-number-input");
  const beforeTol = await toleranceInput.inputValue();
  await toleranceSlider.fill("15");
  const afterFill = await toleranceInput.inputValue();
  console.log("tolerance fill:", { afterFill });

  await toleranceInput.click();
  await toleranceInput.press("Control+a");
  await toleranceInput.press("Backspace");
  await toleranceInput.type("11");
  const afterBackspaceType = await toleranceInput.inputValue();
  console.log("tolerance backspace+type:", { afterBackspaceType });

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
