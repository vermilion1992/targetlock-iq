<!-- DESCRIPTION: Isolate a Single Application Module
This prompt cleans up the codebase by removing all application modules except for the one specified by {{KEEP_APP_NAME}}. This includes deleting page routes, components, contexts, and API handlers for the unused apps. -->

<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->

You are an expert Frontend Architect for TailwindAdmin Pro. Your task is to isolate the **{{KEEP_APP_NAME}}** application module and remove all other application modules to create a clean, single-purpose codebase.

**INPUT VARIABLE:**

- **App to Keep:** `{{KEEP_APP_NAME}}` (e.g., Blog, Calendar, Chat-AI, Chats, Contacts, Ecommerce, Email, Image-AI, Invoice, Kanban, Notes, Tickets, User-Profile)

---

### **Step 1: Identify Relevant Directories**

Ensure you have mapped the `{{KEEP_APP_NAME}}` to its corresponding directory names across different layers.

| Layer          | Path                           | Mapping Example ({{KEEP_APP_NAME}}) |
| -------------- | ------------------------------ | ----------------------------------- |
| **Pages**      | `app/(dashboard-layout)/apps/` | `{{KEEP_APP_NAME}}`                 |
| **Components** | `app/components/apps/`         | `{{KEEP_APP_NAME}}`                 |
| **Context**    | `app/context/`                 | `{{KEEP_APP_NAME}}-context`         |
| **API**        | `app/api/`                     | `{{KEEP_APP_NAME}}`                 |

_Note: For "User-Profile", paths may vary between `user-profile`, `userprofile`, and `userdata-context`._

### **Step 2: Delete Unused Application Modules**

**Action:** Delete the directories for all apps **EXCEPT** the one corresponding to `{{KEEP_APP_NAME}}` in these locations:

1.  **Page Routes:** `app/(dashboard-layout)/apps/`
2.  **UI Components:** `app/components/apps/`
3.  **Context Providers:** `app/context/`
    - _Constraint:_ DO NOT delete `config.ts`, `customizer-context`, or other shared contexts not tied to a specific app.
4.  **API Routes:** `app/api/`
    - _Constraint:_ DO NOT delete `global-fetcher.ts`, `code/`, or shared utilities.

### **Step 3: Cleanup Navigation & Layouts**

**Action:** Remove references to the deleted apps from the following files to prevent broken links and runtime errors.

1.  **Vertical Sidebar:** `app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts`
    - Locate the "Apps" or relevant section and remove all items except `{{KEEP_APP_NAME}}`.
2.  **Horizontal Menu:** `app/(dashboard-layout)/layout/horizontal/menudata.ts`
    - Remove all app-specific menu links except for the retained one.
3.  **Header Data:** `app/(dashboard-layout)/layout/shared/header/data.ts`
    - Remove search entries and dropdown items related to deleted apps.

### **Step 4: Cleanup Global References & Imports**

**Action:** Perform a global search for the names of the deleted applications (e.g., "Invoice", "Kanban", "Chat") to find and remove:

1.  **Imports:** Remove unused imports in any remaining files.
2.  **Dashboard Widgets:** If the main dashboard page (`app/(dashboard-layout)/page.tsx` or `dashboards/`) uses components from deleted apps (e.g., "Recently Added Products" from Ecommerce), remove those widgets.

### **Step 5: Verification**

1.  **Build Check:** Run `npm run build` or `npm run dev` to ensure no module resolution errors exist.
2.  **Link Check:** Verify that the sidebar and navigation only show the retained app and standard dashboard pages.
3.  **Dead Code:** Ensure `app/context/` and `app/api/` are lean and only contain shared logic and the retained app's logic.

---

### **Important Constraints:**

- **DO NOT** delete dashboard variants in `app/(dashboard-layout)/dashboards/` unless they are explicitly part of an app module.
- **DO NOT** delete shared UI components in `components/ui/` or `app/components/shared/`.
- **DO NOT** modify the theme configuration or global styles in `app/globals.css`.
