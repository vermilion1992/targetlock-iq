/** Cross-section navigation — land on methodology / how-it-works when swapping apps. */
export const TARGETLOCK_HOW_IT_WORKS_URL = "/targetlock?howItWorks=1";
export const PLANNER_HOW_IT_WORKS_URL = "/targetlock/planner?tab=methodology";

export function isHowItWorksLanding(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.get("howItWorks") === "1";
}

export function plannerTabFromSearch(search: string): string | null {
  return new URLSearchParams(search).get("tab");
}
