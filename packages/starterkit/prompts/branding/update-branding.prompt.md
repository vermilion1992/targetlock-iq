<!-- DESCRIPTION: Complete Application Rebrand
This prompt rebrands TailwindAdmin Pro by updating the project name, package names, company references, metadata, and logo files. Changes ONLY branding elements - NO color changes, NO styling updates, NO theme modifications. -->

<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->

You are a Senior Frontend Developer for a Next.js admin dashboard. Your task is to completely rebrand TailwindAdmin Pro from **{{OLD_BRAND}}** to **{{NEW_BRAND}}** with NO errors. Update configuration files, text references, metadata, and logo assets only. DO NOT change colors, themes, styles, or component logic.

**INPUT VARIABLES:**

- **Old Brand:** `{{OLD_BRAND}}` (e.g., ADMINPro)
- **New Brand:** `{{NEW_BRAND}}` (e.g., My Dashboard)
- **Old Brand Lower:** `{{OLD_BRAND_LOWER}}` (e.g., admin-pro)
- **New Brand Lower:** `{{NEW_BRAND_LOWER}}` (e.g., my-dashboard)
- **Old Company Name:** `{{OLD_COMPANY_NAME}}` (e.g., WrapPixel)
- **New Company Name:** `{{NEW_COMPANY_NAME}}` (e.g., MyCompany)
- **New Package Name:** `{{NEW_PACKAGE_NAME}}` (e.g., my-dashboard-pro)

---

### **Step 1: Global Text Replacement**

**Action:**

1.  **Case Sensitive Search:** Search for `{{OLD_BRAND}}` and replace with `{{NEW_BRAND}}` in all text files (excluding `node_modules`).
2.  **Lowercase Search:** Search for `{{OLD_BRAND_LOWER}}` (lowercase) and replace with `{{NEW_BRAND_LOWER}}` (lowercase).
    - _Constraint:_ Do NOT replace external library names (e.g., `shadcn-ui` if it is a third-party dependency) unless you are sure it is an internal package.
    - _Constraint:_ Check URLs carefully. Update links to documentation or repositories if they should point to the new brand, but keep them if they are historical references.

---

## Step 2: Update Configuration Files

**Target File:** `package.json`
**Action:**

1. Update `"name"` property
2. Update `"description"`

```json
{
  "name": "{{NEW_PACKAGE_NAME}}",
  "description": "{{NEW_BRAND}} - Modern Next.js Admin Dashboard"
}
```

## Step 3: Update HTML Metadata

**Target File:** `app/layout.tsx`
**Action:**

Update metadata object:

```tsx
export const metadata: Metadata = {
  title: "{{NEW_BRAND}} - Modern Admin Dashboard",
  description:
    "{{NEW_BRAND}} is a modern admin dashboard built with Next.js and shadcn/ui",
};
```

**Target Directory:** `app/(dashboard-layout)/layout/shared/logo/`
**Action:**

Update all logo component files:

**File: `logo.tsx`**

```tsx
// Before:
<Image src={'/images/logos/logoicon.svg'} alt="logo" width={40} height={40} />

// After:
<Image src={'/images/logos/logoicon.svg'} alt="{{NEW_BRAND}}" width={40} height={40} />
```

**File: `full-logo.tsx`**

```tsx
// Before:
<Image src={'/images/logos/darklogo.svg'} alt='logo' width={110} height={36} ... />
<Image src={'/images/logos/whitelogo.svg'} alt='logo' width={110} height={36} ... />

// After:
<Image src={'/images/logos/darklogo.svg'} alt='{{NEW_BRAND}}' width={110} height={36} ... />
<Image src={'/images/logos/whitelogo.svg'} alt='{{NEW_BRAND}}' width={110} height={36} ... />
```

---

### IMPORTANT - DO NOT CHANGE These:

** Third-Party Library Names:**

- External package names: `shadcn-ui`, `next`, `react`, `tailwind`, `typescript`
- External UI libraries: `base-ui`,
- Never change: `@radix-ui/*`, `@react-*`, `@nextjs/*`

Example - DO NOT CHANGE:

```json
{
  "dependencies": {
    "shadcn-ui": "^1.0.0",
    "next": "15.0.0",
    "@base-ui/react": "1.0"
  }
}
```

** External Documentation URLs:**

- Links to npm registry
- Links to official library documentation
- Links to third-party services
- Historical references or external resources

Example - DO NOT CHANGE:

```md
// Keep these URLs unchanged

- [shadcn/ui Docs](https://ui.shadcn.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [npm package registry](https://www.npmjs.com/package/shadcn-ui)
```

** Code Identifiers:**

- Variable names
- Function names
- Class names
- Import paths
- File/folder names

Example - DO NOT CHANGE:

```tsx
//  Keep code identifiers unchanged
import { shadcnButton } from "@/components/ui/button";
const AdminDashboard = () => {};
export default AdminDashboard;
```

---

### DO CHANGE These:

**User-Facing Text:**

- Page titles and headings
- Button labels and descriptions
- Welcome messages
- Navigation labels
- Help text and tooltips

Example - DO CHANGE:

```tsx
//  Change user-facing text
export const metadata = {
  title: "{{NEW_BRAND}} - Admin Dashboard"
  description: "{{NEW_BRAND}} is a modern dashboard",
};

// In components:
<h3>Welcome to {{NEW_BRAND}}</h3>
<p>New to {{NEW_BRAND}}</p>
<p> Join {{NEW_BRAND}} </p>

```

**Internal URLs (Brand-Specific):**

- Internal documentation links
- Company/brand repository links
- Support URLs for YOUR brand

Example - DO CHANGE URLs:

```md
// Change if it's YOUR brand's URL

- [{{NEW_BRAND}} Support](https://support.{{NEW_BRAND}} .com)
- [{{COMPANY_NAME}} Website](https://{{NEW_BRAND}} .com)

// Do NOT change external service URLs

- [Report issues](https://github.com/shadcn/ui/issues)
```

---

### Quick Checklist

| What                                         | Change? | Example                            |
| -------------------------------------------- | ------- | ---------------------------------- |
| `shadcn-ui`, `next`, `react` in dependencies | NO      |
| Page title & metadata                        | YES     | `"{{NEW_BRAND}} Dashboard"`        |
| External npm links                           | NO      | Keep `https://ui.shadcn.com`       |
| Welcome text                                 | YES     | `"Welcome to {{NEW_BRAND}}"`       |
| Your brand links                             | YES     | Change to new brand domain         |
| Variable/function names                      | NO      | Keep code as is                    |
| Logo files                                   | YES     | Replace in `/public/images/logos/` |
| Copyright text                               | YES     | `&copy; 2026 {{COMPANY_NAME}}`     |
| alt text for images                          | YES     | `alt="{{NEW_BRAND}} Logo"`         |
| Import statements                            | NO      | Keep `import React from 'react'`   |

---

## Step 4: Update Footer & Component Text

**Target File:** `app/(dashboard-layout)/layout/footer/page.tsx`
**Action:**

Update copyright text and links:

```tsx
<p className="text-sm text-muted-foreground">
  © 2026 by{" "}
  <Link
    href="https://www.{{NEW_COMPANY_NAME_LOWER}}.com/"
    target="_blank"
    className="hover:text-primary text-muted-foreground"
  >
    {{ NEW_COMPANY_NAME }}
  </Link>
  , creating a better web for you.
</p>
```

**Target Directory:** `app/(dashboard-layout)/layout/shared/`
**Action:**

Search for hardcoded brand text:

- Replace any "ADMINPro", "admin-pro", or "WrapPixel" references.

**Target Directory:** `utils/languages/`
**Action:**

- Search for brand names in `en.json`, `fr.json`, `ch.json`, `ar.json` and replace if found.

**Target Directory:** `app/(dashboard-layout)/`
**Action:**

Search for hardcoded text:

- Welcome messages → `"Welcome to {{NEW_BRAND}}"`
- New to → `"New to {{NEW_BRAND}}"`
- Page titles → Update with `{{NEW_BRAND}}`

---

## Step 5: Replace Logo Files

**Target Directory:** `public/images/logos/`
**Action:**

Replace these logo files (keep same file names and formats):

- `logoicon.svg` → New brand icon logo
- `darklogo.svg` → New brand full logo (dark mode)
- `whitelogo.svg` → New brand full logo (light mode)
- `darklogo2.svg` → (Optional) secondary dark logo

**Target Directory:** `public/`
**Action:**

Replace favicon file:

- `favicon.ico` → New brand favicon

**Important:**

- Keep same file names exactly (referenced in `logo.tsx` and `full-logo.tsx`)
- Maintain same dimensions
- Favicon: Standard favicon format (ICO, `.ico` extension)

---

## Step 6: Verify All Changes

**Files to Check:**

- [ ] `package.json` - Name updated
- [ ] `app/layout.tsx` - Metadata updated
- [ ] `app/(dashboard-layout)/layout/shared/logo/logo.tsx` - Logo alt text updated
- [ ] `app/(dashboard-layout)/layout/shared/logo/full-logo.tsx` - Logo alt text updated
- [ ] `app/components/shared/` - Footer copyright updated
- [ ] `public/images/logos/` - New logo files replaced
- [ ] `public/` - Favicon updated

**Browser Verification:**

- [ ] Tab title shows `{{NEW_BRAND}}`
- [ ] Logo displays correctly (icon and full logo)
- [ ] Footer shows `{{COMPANY_NAME}}`
- [ ] No "{{OLD_BRAND}}" in UI
- [ ] No broken image links
- [ ] All alt text updated to new brand

**Command Workflow:**

```bash
# Test in development
npm run dev

# Check for lint errors
npm run lint

# Build for production
npm run build
```

---

## Final Verification Checklist

- [ ] Package name: `{{NEW_PACKAGE_NAME}}`
- [ ] Browser tab title: `{{NEW_BRAND}} - Admin Dashboard`
- [ ] No "{{OLD_BRAND}}" appears in UI
- [ ] Logo replaced in `/public/images/logos/`
- [ ] Favicon updated
- [ ] Footer: `{{COMPANY_NAME}}`
- [ ] README updated
- [ ] No broken image links
- [ ] All user-facing text updated
- [ ] Development server runs without errors
- [ ] Production build succeeds

---

## Important Constraints

**BRANDING ONLY - Do NOT:**

- Change color themes or CSS variables (use "Change Theme" prompt)
- Modify component logic
- Change file structure or folder names
- Update code variable names
- Modify dependencies

  **ONLY DO:**

- Update text strings and metadata
- Replace logo files
- Update configuration values
- Change user-facing labels
