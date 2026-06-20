/**
 * Phase 6D execution gate smoke — plan-to-drill lifecycle.
 * Prerequisite: production server (npm run build && npm start).
 * Usage: npm run smoke:execution-gate
 * Env: TARGETLOCK_URL (default http://localhost:8080/targetlock)
 */
import { chromium } from "playwright";

const baseUrl = process.env.TARGETLOCK_URL ?? "http://localhost:8080/targetlock";
const plannerUrl = baseUrl.replace(/\/targetlock\/?$/, "/targetlock/planner");
const libraryKey = "targetlock-iq-library-v1";
const smokeHoleId = "smoke-exec-gate-1";

const BENIGN_CONSOLE = [
  /favicon/i,
  /Failed to load resource.*favicon/i,
  /Download the React DevTools/i,
];

function isBenignConsole(text) {
  return BENIGN_CONSOLE.some((re) => re.test(text));
}

function buildSmokeLibrary() {
  const now = "2026-06-10T08:00:00.000Z";
  const planRecords = [
    { md: 0, dip: -60, azimuth: 90 },
    { md: 300, dip: -62, azimuth: 92 },
  ];
  const actualRecords = [{ md: 0, dip: -60, azimuth: 90 }];
  const target = {
    e: 100,
    n: 200,
    d: 50,
    md: 300,
    tolerance: 6,
    maxDls: 3,
    nextInterval: 30,
  };
  const planHash = "smoke-plan-hash-v1";
  const approvalHash = "smoke-approval-hash-v1";

  const hole = {
    version: 1,
    holeId: smokeHoleId,
    holeName: "SMOKE-EXEC-1",
    siteName: "Smoke Site",
    planRecords,
    actualRecords,
    target,
    mode: "simple",
    history: [],
    updatedAt: now,
    plannerMeta: {
      coordinateMode: "collar-relative",
      northReference: "grid",
      plannedAt: now,
      createdFromPlanner: true,
      status: "active",
      planRevision: 1,
      programName: "Smoke Program",
      programId: "smoke-program-1",
      approvedBy: "Smoke Geologist",
      approvedAt: now,
      activatedAt: now,
      activatedFromPlannerAt: now,
      activePlanHash: planHash,
      approvalSnapshot: {
        approvedBy: "Smoke Geologist",
        approvedAt: now,
        statusAtApproval: "approved",
        planHash,
        qaHash: "smoke-qa-hash",
        coordinateSystemHash: "smoke-cs-hash",
        planRevision: 1,
        warningsAtApproval: [],
        hardErrorsAtApproval: [],
      },
      lockedPlan: {
        lockedAt: now,
        planHash,
        planRevision: 1,
        approvalHash,
        approvedBy: "Smoke Geologist",
        approvedAt: now,
        planRecords,
        target,
        qaSummary: { hardErrorCount: 0, warningCount: 0, clearanceRiskCount: 0 },
      },
      executionStatus: {
        state: "not-started",
        startedAt: undefined,
      },
    },
  };

  return {
    version: 1,
    activeHoleId: smokeHoleId,
    holes: [hole],
  };
}

async function seedLibrary(page) {
  const lib = buildSmokeLibrary();
  await page.evaluate(
    ({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    },
    { key: libraryKey, data: lib }
  );
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
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await seedLibrary(page);
    await page.reload({ waitUntil: "networkidle", timeout: 60_000 });
    await page
      .getByText("Loading hole package")
      .waitFor({ state: "hidden", timeout: 60_000 })
      .catch(() => {});

    await page.goto(`${plannerUrl}?holeId=${smokeHoleId}`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.getByText("SMOKE-EXEC-1").first().waitFor({ timeout: 15_000 });
    await page.getByText(/active/i).first().waitFor({ timeout: 10_000 });

    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60_000 });
    await page
      .locator(".planner-exec-banner")
      .waitFor({ timeout: 15_000 });

    const mdInput = page.getByLabel("Survey measured depth in metres");
    await mdInput.fill("50");
    await page.getByLabel("Survey dip in degrees").fill("-60.5");
    await page.getByLabel("Survey azimuth in degrees").fill("90.5");
    await page.getByRole("button", { name: /^Add survey$/i }).click();
    await page.waitForTimeout(800);

    const stripOrBanner = page.locator(".planner-avp-strip, .planner-exec-banner");
    await stripOrBanner.first().waitFor({ timeout: 10_000 });

    // Mode toggle and advanced sections render as role="tab".
    const advancedTab = page.getByRole("tab", { name: /^Advanced$/i }).first();
    await advancedTab.click();
    await page.waitForTimeout(300);
    // Execution exports live under the "Execution" advanced tab (present when the
    // active hole has a planner execution context / locked plan).
    await page.getByRole("tab", { name: /^Execution$/i }).first().click();
    await page.waitForTimeout(400);

    await page.getByRole("button", { name: /^Export execution TXT$/i }).waitFor({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: /^Export execution PDF$/i }).waitFor({
      timeout: 5_000,
    });
    await page.getByRole("button", { name: /^Export actual survey CSV$/i }).waitFor({
      timeout: 5_000,
    });
    await page.getByRole("button", { name: /^Export audit manifest JSON$/i }).waitFor({
      timeout: 5_000,
    });

    await page.goto(`${plannerUrl}?holeId=${smokeHoleId}`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.getByText("Execution audit").first().waitFor({ timeout: 10_000 });
    await page.getByText(/active/i).first().waitFor({ timeout: 5_000 });

    if (errors.length > 0) {
      console.error("Console errors:", errors);
      process.exit(1);
    }
    console.log("planner-execution-gate-smoke: pass");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("planner-execution-gate-smoke failed:", err.message);
  process.exit(1);
});
