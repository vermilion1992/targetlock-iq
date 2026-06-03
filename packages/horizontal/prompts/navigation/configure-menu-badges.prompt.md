<!-- DESCRIPTION: Add or Modify Menu Notification Badges
This prompt guides through adding status badges (like "New", "Pro", or numerical alerts) to menu items in the sidebar. -->

<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->

You are a Senior Frontend Developer. Your task is to implement notification or status badges on menu items in TailwindAdmin Pro.

**INPUT VARIABLES:**

- **Target Item Name:** `{{ITEM_NAME}}` (e.g., Chat)
- **Badge Content:** `{{BADGE_TEXT}}` (e.g., New, 99+, Pro)
- **Badge Type:** `{{BADGE_TYPE}}` (filled, outlined)

---

### **Step 1: Locate Target Item**

**Target File:** `app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts`

**Action:** Find the object in the `SidebarContent` array that has `name: "{{ITEM_NAME}}"`.

### **Step 2: Apply Badge Properties**

**Action:** Add or update the badge fields.

```typescript
// Required format:
{
  id: uniqueId(),
  name: "{{ITEM_NAME}}",
  // ... other props
  badge: true,
  badgeType: "{{BADGE_TYPE}}", // e.g., "filled"
  badgeContent: "{{BADGE_TEXT}}", // e.g., "New"
},
```

### **Step 3: Verify Visuals**

1.  **Rendering:** Check if the badge appears to the right of the menu name in the sidebar.
2.  **Coloring:** Note that badge colors are usually controlled by the `badgeContent` or default primary styling in the sidebar component. If a specific color is needed, refer to the `badgeType` handling in the sidebar logic.
3.  **Mini Sidebar:** Ensure the badge doesn't break the layout when the sidebar is collapsed (it should typically be hidden or optimized for icon-only mode).
