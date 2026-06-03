<!-- DESCRIPTION: Create a New Page and Register it in Navigation

This workflow handles the end-to-end process of creating a new dashboard page, including directory setup, basic component boilerplate, and registration in both vertical and horizontal menus. -->

<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->

You are a Senior Frontend Developer. Your task is to add a completely new page to the TailwindAdmin Pro and ensure it is accessible via the navigation.

**INPUT VARIABLES:**

- **Page Name:** `{{PAGE_NAME}}` (e.g., Sales Analysis)

- **Route Path:** `{{ROUTE_PATH}}` (e.g., dashboards/sales)

- **Directory Path:** `{{DIR_PATH}}` (e.g., app/(dashboard-layout)/dashboards/sales/)

- **Icon Name:** `{{ICON_NAME}}` (e.g., solar:chart-bold-duotone)

---

### **Step 1: Create the Page Directory & File**

**Target File:** `{{DIR_PATH}}page.tsx`

**Action:** Create the directory if it doesn't exist and write the page boilerplate.

```tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "{{PAGE_NAME}} - Admin Dashboard",

  description: "{{PAGE_NAME}} page description",
};

const Page = () => {
  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12">
        <h1 className="text-2xl font-bold">{{ PAGE_NAME }}</h1>

        <p className="text-muted-foreground mt-1">
          Welcome to the {{ PAGE_NAME }} module.
        </p>

        {/* Add widgets here */}
      </div>
    </div>
  );
};

export default Page;
```

### **Step 2: Register in Vertical Sidebar**

**Target File:** `app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts`

**Action:** Add the item to the correct section (e.g., "Dashboard" or "Apps").

```typescript

{

  id: uniqueId(),

  name: "{{PAGE_NAME}}",

  icon: "{{ICON_NAME}}",

  url: "/{{ROUTE_PATH}}",

},

```

### **Step 3: Register in Horizontal Menu**

**Target File:** `app/(dashboard-layout)/layout/horizontal/menudata.ts`

**Action:** Add the item to the corresponding title/section.

```typescript

{

  id: uniqueId(),

  title: "{{PAGE_NAME}}",

  icon: "{{ICON_NAME}}",

  href: "/{{ROUTE_PATH}}",

},

```

### **Step 4: Verify Assets & Routing**

1.  **Icon:** Ensure `{{ICON_NAME}}` exists in the Iconify library (Solar preferred).

2.  **Navigation:** Verify the sidebar link highlights when active and matches the route path exactly.

3.  **Metadata:** Ensure the browser tab title reflects the new page name.
