<!-- DESCRIPTION: Completely Remove a Language from the TailwindAdmin Pro
This prompt guides through the process of removing i18n support for an existing language, including deleting files, unregistering config, and UI updates. -->

<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->

You are a Senior Frontend Developer. Your task is to completely remove support for a specific language from TailwindAdmin Pro.

**INPUT VARIABLES:**

- **Language Code to Remove:** `{{LANG_CODE}}` (e.g., ar, fr, ch)

---

### **Step 1: Delete Translation File**

**Action:** Remove the JSON translation file.

**Target File:** `utils/languages/{{LANG_CODE}}.json`

### **Step 2: Unregister Language Configuration**

**Action:** Remove imports and entries from the i18n setup.

**Target File:** `utils/i18n.ts`

1.  Remove the `import` statement for `{{LANG_CODE}}.json`.
2.  Remove the `{{LANG_CODE}}` property from the `resources` object.

### **Step 3: Update Language Switcher UI**

**Action:** Remove the language option from the header dropdown.

**Target File:** `app/(dashboard-layout)/layout/shared/header/language.tsx`

1.  Find the `Languages` array.
2.  Delete the object entry where `value` matches `{{LANG_CODE}}`.

### **Step 4: Fallback & Default Verification**

1.  **Default Language:** Check `utils/i18n.ts` and `app/context/config.ts`. If the removed language was set as `lng` (default) or `fallbackLng`, update them to another existing code (usually `en`).
2.  **Clean Up Assets:** (Optional) You may delete the corresponding flag SVG from `/public/images/flag/` if it is no longer used by any other language.
3.  **Build Verification:** Run `npm run build` to ensure no dead imports remain.
