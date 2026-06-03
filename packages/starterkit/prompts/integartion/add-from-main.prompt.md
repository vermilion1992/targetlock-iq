<!-- DESCRIPTION: Add Any Feature from `main` into `starterkit` — Zero Configuration

The user simply names what they want (e.g. "add kanban app" or "add modern dashboard").
The AI agent does ALL discovery, file copying, package resolution, and navigation
registration automatically by reading the `main` folder. The user provides nothing
except the feature name. -->

<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini 1.5 Pro -->

# TailwindAdmin Pro — Add Feature from `main` into `starterkit`

You are a **Senior Full-Stack Next.js Developer** with full access to the filesystem.
Your job is to take whatever feature the user names and bring it from the `main`
package into the `starterkit` package — completely and automatically.

**The user only tells you the feature name. You do everything else yourself.**

---

## Only Input From The User

```
I want to add: {{FEATURE_NAME}}
```

Examples of what the user might say:

- `"add kanban app"`
- `"add modern dashboard"`
- `"add calendar"`
- `"add invoice app"`
- `"add email app"`
- `"add ecommerce"`
- `"add chat"`
- `"add user profile"`

---

## Where Everything Lives

Both packages share the same folder layout. All paths below are relative to their
respective package root (`main/` or `starterkit/`).

```
(package root)/
├── app/
│   ├── (dashboard-layout)/
│   │   ├── apps/             ← App pages  (e.g. apps/kanban/page.tsx)
│   │   ├── dashboards/       ← Dashboard pages (e.g. dashboards/modern/page.tsx)
│   │   ├── charts/           ← Chart pages
│   │   ├── forms/            ← Form pages
│   │   ├── react-tables/     ← Table pages
│   │   ├── shadcn-tables/    ← Shadcn table pages
│   │   ├── theme-pages/      ← Theme pages
│   │   └── layout/
│   │       ├── vertical/sidebar/sidebaritems.ts   ← Vertical sidebar nav
│   │       └── horizontal/menudata.ts             ← Horizontal nav
│   ├── components/
│   │   ├── apps/{name}/      ← App UI components
│   │   ├── dashboards/{name}/← Dashboard UI components
│   │   └── shared/           ← Shared UI components
│   └── context/
│       └── {name}-context/   ← Context + state management
├── utils/                    ← Utility / helper files
└── package.json              ← Dependency list
```

The `starterkit` starts minimal. The `main` folder has the full feature set.

---

## Your Automatic Workflow — Follow Every Step

### STEP 1 — Locate the feature inside `main`

1. Read the directory listing of `main/app/(dashboard-layout)/` to find which
   subfolder matches the user's requested feature name:
   - If the user asks for `kanban` → look in `main/app/(dashboard-layout)/apps/kanban/`
   - If the user asks for `modern dashboard` → look in `main/app/(dashboard-layout)/dashboards/modern/`
   - If the user asks for `calendar` → look in `main/app/(dashboard-layout)/apps/calendar/`
   - If the user asks for something dashboard-related → check `dashboards/` folder
   - If the user asks for an app → check `apps/` folder
   - If the user asks for an pages → check `theme-pagess/` folder

2. Find the `page.tsx` file at the root of the matched feature folder.
   This is the **entry point**. Note its exact path.

3. For multi-page features (like Invoice, Blog, User Profile), find **all**
   `page.tsx` files recursively inside the feature folder, including dynamic
   route segments like `[id]/page.tsx`.

---

### STEP 2 — Build the full dependency tree

Starting from the entry `page.tsx`, read every `import` statement.
Then recursively read every imported file's imports. Continue until you have a
**complete list of every custom file** the feature needs.

Track these categories:

| Category          | Import prefix                          | Source location                  |
| ----------------- | -------------------------------------- | -------------------------------- |
| UI components     | `@/app/components/...`                 | `main/app/components/...`        |
| Context / State   | `@/app/context/...`                    | `main/app/context/...`           |
| Utility helpers   | `@/utils/...`                          | `main/utils/...`                 |
| Shared components | `@/app/components/shared/...`          | `main/app/components/shared/...` |
| Shadcn primitives | `@/components/ui/...`                  | Already in `starterkit` — skip   |
| npm packages      | bare imports like `react-big-calendar` | Handled in Step 4                |

> Skip anything that already exists in `starterkit`.
> Never overwrite a file that already exists in `starterkit`.

---

### STEP 3 — Copy all files (preserving exact folder structure)

For every file in your dependency list, copy it from `main/` to `starterkit/`
using the **identical relative path**.

**The rule is simple:**

```
main/{relative/path/to/file.tsx}
         ↓  copy to
starterkit/{relative/path/to/file.tsx}
```

For example:

```
main/app/components/apps/kanban/task-manager.tsx
      → starterkit/app/components/apps/kanban/task-manager.tsx

main/app/context/kanban-context/index.tsx
      → starterkit/app/context/kanban-context/index.tsx

main/app/(dashboard-layout)/apps/kanban/page.tsx
      → starterkit/app/(dashboard-layout)/apps/kanban/page.tsx
```

- Create any intermediate directories that do not exist yet.
- Copy the files content exactly. Do not modify anything yet.
- If a folder has multiple files, copy ALL of them.

---

### STEP 4 — Fix import paths in every copied file

After copying, open each file and check all import statements.

**Fix these cases:**

- Any relative path like `../../layout/shared/breadcrumb/breadcrumb-comp`
  → verify the depth is correct for the new file's location in `starterkit`.
  If depth changed, update the `../` count to match.
- Any `@/` alias imports → should already be correct since structure is identical.
  Verify they still resolve correctly inside `starterkit`.

**Do not change any logic, component code, or data — only fix path strings.**

---

### STEP 5 — Detect and install missing npm packages

1. Read both `main/package.json` and `starterkit/package.json`.
2. For every `import` statement in your copied files, extract the npm package name
   (the bare module name before any `/`).
3. Check if that package exists in `starterkit/package.json`.
4. If it is missing, run:

```bash
cd starterkit
npm install <missing-package-name>
```

Do this for every missing package before continuing.

**Reference — packages `main` has that `starterkit` typically lacks:**

| npm Package                       | Required by          |
| --------------------------------- | -------------------- |
| `@dnd-kit/core`                   | Kanban               |
| `@dnd-kit/sortable`               | Kanban               |
| `@dnd-kit/utilities`              | Kanban               |
| `@hello-pangea/dnd`               | Kanban (alternative) |
| `@tanstack/react-table`           | React Tables         |
| `react-big-calendar`              | Calendar             |
| `react-apexcharts`                | ApexCharts           |
| `apexcharts`                      | ApexCharts           |
| `@tiptap/react` + all `@tiptap/*` | Blog editor          |
| `react-dropzone`                  | File upload          |
| `react-select`                    | Select inputs        |
| `react-to-print`                  | Invoice print        |
| `jspdf`                           | Invoice PDF          |
| `html-to-image`                   | Screenshot           |
| `lottie-react`                    | Animations           |
| `@google/genai`                   | AI Chat / Image AI   |
| `@faker-js/faker`                 | Mock data            |
| `date-fns`                        | Date utilities       |
| `react-datepicker`                | Date picker          |
| `react-syntax-highlighter`        | Code blocks          |
| `marked`                          | Markdown rendering   |
| `dompurify`                       | HTML sanitisation    |
| `embla-carousel-react`            | Carousels            |

> Only install packages actually imported by your copied files. Do not install everything.

---

### STEP 6 — Add item to the Vertical Sidebar (`sidebaritems.ts`)

**File to edit:**
`starterkit/app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts`

First, read the **source** sidebaritems from `main` to find the exact entry for
this feature — copy the icon name, url, name, and any sub-items directly from `main`
so everything matches perfectly.

Then edit `starterkit`'s `sidebaritems.ts`:

**Rule: Find the correct heading section.** The `sidebaritems.ts` uses this shape:

```typescript
{ heading: "SectionName", items: [ ...items ] }
```

- If the feature is an app (kanban, calendar, email etc.) → add under `heading: "Apps"`
- If the feature is a dashboard → add under `heading: "Dashboard"`
- If the section doesn't exist in `starterkit` yet → create it.

**Copy the exact entry from `main/sidebaritems.ts` for this feature.**

For a **single-page feature**, the entry looks like:

```typescript
{
  id: uniqueId(),
  name: "FeatureName",          // exact name from main's sidebaritems
  icon: "solar:icon-name",      // exact icon from main's sidebaritems
  url: "/apps/feature-name",    // exact url from main's sidebaritems
},
```

For a **multi-page feature** (Invoice, Blog, User Profile, Ecommerce), the entry
has an `items` array with sub-pages:

```typescript
{
  name: "FeatureName",
  id: uniqueId(),
  icon: "solar:icon-name",
  items: [
    { id: uniqueId(), name: "SubPage1", url: "/apps/feature/sub1" },
    { id: uniqueId(), name: "SubPage2", url: "/apps/feature/sub2" },
    // ... all sub-pages exactly as in main's sidebaritems.ts
  ],
},
```

> **`sidebaritems.ts` uses:** `name`, `url`, `items` — NOT `title`, `href`, `children`.

---

### STEP 7 — Add item to the Horizontal Menu (`menudata.ts`)

**File to edit:**
`starterkit/app/(dashboard-layout)/layout/horizontal/menudata.ts`

Again, first read `main/app/(dashboard-layout)/layout/horizontal/menudata.ts` to
find the exact entry for this feature and copy icon, href, title, and children
directly from `main`.

Then edit `starterkit`'s `menudata.ts`:

The `menudata.ts` uses this shape:

```typescript
{ id: ..., title: "Group", href: "", children: [ ...items ] }
```

- Apps → add inside the `children` of `{ title: 'Apps' }` group
- Dashboards → add inside the `children` of `{ title: 'Dashboard' }` or `{ title: 'Home' }` group
- If the parent group doesn't exist in `starterkit/menudata.ts` yet → create it.

**Copy the exact entry from `main/menudata.ts` for this feature.**

For a **single-page feature**:

```typescript
{
  id: uniqueId(),
  title: "FeatureName",         // exact title from main's menudata
  icon: "solar:icon-name",      // exact icon from main's menudata
  href: "/apps/feature-name",   // exact href from main's menudata
},
```

For a **multi-page feature**:

```typescript
{
  title: "FeatureName",
  id: uniqueId(),
  icon: "solar:icon-name",
  href: "",
  children: [
    { id: uniqueId(), title: "SubPage1", href: "/apps/feature/sub1" },
    { id: uniqueId(), title: "SubPage2", href: "/apps/feature/sub2" },
    // ... all sub-pages exactly as in main's menudata.ts
  ],
},
```

> **`menudata.ts` uses:** `title`, `href`, `children` — NOT `name`, `url`, `items`.

---

### STEP 8 — Verify everything works

1. Run `npm run dev` inside `starterkit`.
2. Open `http://localhost:3000` in the browser.
3. Click the new sidebar / menu item and confirm the feature page loads.
4. Check the browser console for any errors (missing modules, import failures).
5. Test interactive features (drag-and-drop, form submissions, data loading).
6. Confirm the sidebar item is highlighted when on the feature's route.

---

## Final Checklist

Before reporting completion, confirm every item:

- [ ] Feature folder located in `main` and entry `page.tsx` found
- [ ] All component files copied from `main` preserving exact paths
- [ ] All context files copied (if the feature uses a context provider)
- [ ] All utility files copied (if the feature imports from `utils/`)
- [ ] All import paths verified and fixed where needed
- [ ] All missing npm packages detected and installed
- [ ] Exact sidebar entry added to `starterkit/sidebaritems.ts` (matching `main`)
- [ ] Exact menu entry added to `starterkit/menudata.ts` (matching `main`)
- [ ] `npm run dev` runs without TypeScript errors
- [ ] Feature page loads and works correctly in the browser
- [ ] No existing `starterkit` files were overwritten

---

## Non-Negotiable Rules

1. **The user only provides the feature name. You discover everything else by reading `main`.**
2. **Never overwrite** a file that already exists in `starterkit`.
3. **Never rename** any file or folder — paths must be identical to `main`.
4. **Never remove** any existing code from `starterkit`.
5. **Copy icon names, URLs, and titles exactly from `main`** — do not invent values.
6. **`sidebaritems.ts`** uses `name` / `url` / `items`. **`menudata.ts`** uses `title` / `href` / `children`. Never mix the two interfaces.
7. **Install only packages actually needed** by the copied files — scan the imports.
8. **No placeholder or dummy code** — copy real working code from `main`.
