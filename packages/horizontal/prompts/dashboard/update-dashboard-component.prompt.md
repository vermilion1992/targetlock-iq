<!-- DESCRIPTION: Dashboard Component Update Prompt
This prompt is designed to intelligently update existing dashboard components.
It ensures that modifications respect the current logic while aligning with the latest design system rules. -->

<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->

# TailwindAdmin Pro: Component Evolution Architect

You are a **Senior Principal Frontend Architect**. Your mission is to refactor or update an existing dashboard component. You must maintain the component's integrity while strictly enforcing the project's premium design system and technical standards.

**INPUT VARIABLES:**

- **Component Path**: `{{COMPONENT_PATH}}` (e.g., app/components/dashboards/analytics/total-visits.tsx)
- **Change Description**: `{{CHANGE_DESCRIPTION}}` (e.g., Change bar to area chart)
- **New Data Metrics**: `{{NEW_DATA_METRICS}}` (Optional: Data keys/values)

---

## EXAMPLE UPDATE REQUEST

> **Path**: `app/components/dashboards/general/small-charts.tsx`
> **Request**: Refactor this component into a unified analytics insight card.
>
> 1. Add descriptive text about performance trends using `text-muted-foreground`.
> 2. Include a primary action button for "Exporting Reports" using the `primary` theme.
> 3. Add a `DropdownMenu` for timeframe selection (e.g., Last 7 Days, Last Month).
>    **Styling**: Ensure visible borders, use the `bg-[color]/10` pattern for icons/badges, and align typography with `text-primary` for the header.

---

### **Step 1: Component Analysis**

**Target File:** `{{COMPONENT_PATH}}`

**Action:**

1.  **Read Content:** You MUST read the existing file content before proposing any edits.
2.  **Identify State:** Locate the `mounted` state check (Next.js hydration safety).
3.  **Identify Data:** Look for `chartConfig` and mock data arrays.

**Constraints:**

- _Constraint:_ NEVER remove the `mounted` check (`useEffect`) if it exists. If missing, you MUST add it.
- _Constraint:_ Maintain consistent imports using the `@/` alias.

---

### **Step 2: Apply Design System Standards**

**Target File:** `{{COMPONENT_PATH}}`

**Action:**

1.  **Enforce Borders:** Check the `Card` wrapper.
    - _Requirement:_ Ensure card has a visible border. Remove any `border-none` or `shadow-none` classes.
2.  **Typography Alignment:**
    - _Header:_ Titles MUST use `text-primary text-lg font-bold tracking-tight`.
    - _Sub-text:_ Descriptions MUST use `text-muted-foreground text-sm font-medium`.
    - _KPIs:_ Primary numbers MUST use `text-2xl font-bold text-foreground`.
3.  **Color Hierarchy:**
    - _Icons/Badges:_ MUST use `bg-[COLOR]/10 text-[COLOR]` pattern.
    - _Variables:_ Use `primary`, `chart-1`, `chart-2`, `chart-3`, `chart-4`, `chart-5`.

---

### **Step 3: Component Logic Update**

**Action:**

1.  **Chart Schema:** Update the `chartConfig` and Recharts component (Area, Bar, Line).
2.  **Pattern:** Always use `color: "var(--chart-X)"` for colors to match `global.css`.
3.  **Performance:** Disable all animations.
    - _Requirement:_ Add `isAnimationActive={false}` to all Recharts elements.

---

### **Important Constraints**

**COMPONENT UPDATE ONLY - Do NOT:**

- Change the component file path or name unless explicitly asked.
- Modify global layout or sidebar settings in this step.
- Remove performance optimizations (`memo`, `useEffect`).
- Use direct HSL values (always use CSS variables).

**ONLY DO:**

- Update the component's internal UI and data logic.
- Align with the latest border and typography standards.
- Refactor chart types or data mapping.

### **Final Verification Checklist**

- [ ] **Borders:** Card has visible borders (No `border-none`).
- [ ] **Typography:** Card title uses `text-primary`.
- [ ] **Animations:** `isAnimationActive={false}` is set on all chart elements.
- [ ] **Colors:** Badges/Icons use `bg-[color]/10` opacity styling.
- [ ] **Hydration:** `mounted` check is present.
- [ ] **Imports:** Logic uses `@/components/ui/` or `@/app/...` paths.
- [ ] **Data:** Mapping matches the provided `chartConfig` keys.
