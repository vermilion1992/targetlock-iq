<!-- DESCRIPTION: Manage Dashboard Menu Items (Vertical & Horizontal)
This prompt guides through the process of adding, removing, or modifying items in the application's navigation systems, ensuring consistency between the vertical sidebar and horizontal menu. -->

<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->

You are a Senior Frontend Developer. Your task is to update the navigation menus in TailwindAdmin Pro. You must ensure that changes are reflected in both the **Vertical Sidebar** and the **Horizontal Menu**.

**INPUT VARIABLES:**

- **Action Type:** `{{ACTION_TYPE}}` (ADD_LINK, ADD_SECTION, REMOVE_ITEM, MODIFY_ITEM)
- **Item Name:** `{{ITEM_NAME}}` (e.g., Reports)
- **Target URL:** `{{TARGET_URL}}` (e.g., /dashboards/reports)
- **Icon Name:** `{{ICON_NAME}}` (e.g., solar:chart-square-line-duotone)
- **Parent Heading/Section:** `{{PARENT_SECTION}}` (e.g., Dashboard, Apps)

---

### **Step 1: Update Vertical Sidebar**

**Target File:** `app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts`

**Draft the change:**

1.  Find the `SidebarContent` array.
2.  If adding a **Section**, create a new object with `heading` and an empty `items` array.
3.  If adding a **Link**, find the correct `heading` section and push a new item to its `items` array.
4.  Each item must have a `uniqueId()` for the `id` field.

```typescript
// Example Link Addition:
{
  id: uniqueId(),
  name: "{{ITEM_NAME}}",
  icon: "{{ICON_NAME}}",
  url: "{{TARGET_URL}}",
},
```

### **Step 2: Update Horizontal Menu**

**Target File:** `app/(dashboard-layout)/layout/horizontal/menudata.ts`

**Draft the change:**

1.  Find the `Menuitems` array.
2.  Maintain the same hierarchy as the vertical sidebar.
3.  Horizontal items use `title` instead of `name`, and `href` instead of `url`.
4.  Nested items use a `children` array.

```typescript
// Example Link Addition:
{
  id: uniqueId(),
  title: "{{ITEM_NAME}}",
  icon: "{{ICON_NAME}}",
  href: "{{TARGET_URL}}",
},
```

### **Step 3: Icon Consistency**

**Action:** Verify the icon name.

1.  This project primarily uses **Solar Icons** from Iconify (format: `solar:[icon-name]-[style]`).
2.  Ensure the icon exists and is visually consistent with the surrounding menu items.

### **Step 4: Role-Based Access (Optional)**

If the item should be restricted to specific roles, coordinate with the `CASL` implementation in `app/theme-pages/casl/` or wrap the menu item logic with visibility checks if applicable (refer to `AGENTS.md` for RBAC patterns).

### **Step 5: Verification**

1.  **Vertical Mode:** Switch the dashboard to vertical mode and verify the new item appears under the correct heading.
2.  **Horizontal Mode:** Switch to horizontal mode and verify the item appears in the top navigation bar.
3.  **Active State:** Clicking the link should apply the "active" styling (handled automatically by the router, but verify the URL matches).
