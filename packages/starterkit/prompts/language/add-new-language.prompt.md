<!-- DESCRIPTION: Add a New Language to the TailwindAdmin Pro
This prompt guides through the process of adding i18n support for a new language, including translation files, configuration registration, and UI updates. -->

<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->

You are a Senior Frontend Developer. Your task is to add support for a new language to TailwindAdmin Pro.

**INPUT VARIABLES:**

- **Language Name:** `{{LANG_NAME}}` (e.g., German)
- **Language Display Name:** `{{LANG_DISPLAY_NAME}}` (e.g., Deutsch)
- **Language Code:** `{{LANG_CODE}}` (e.g., de)
- **Flag Icon Filename:** `{{FLAG_ICON}}` (e.g., icon-flag-de.svg)

---

### **Step 1: Create Translation File**

**Action:** Create a new JSON file in `utils/languages/` with the essential translation keys.

**Target File:** `utils/languages/{{LANG_CODE}}.json`

_Tip: You should translate the values from `utils/languages/en.json` to `{{LANG_NAME}}`._

### **Step 2: Register Language Configuration**

**Action:** Update the i18n configuration to recognize the new language.

**Target File:** `utils/i18n.ts`

1.  Import the new JSON file.
2.  Add it to the `resources` object.

```typescript
// Example:
import {{LANG_NAME_LOWER}} from "./languages/{{LANG_CODE}}.json";

const resources = {
  // ... existing
  {{LANG_CODE}}: {
    translation: {{LANG_NAME_LOWER}},
  },
};
```

### **Step 3: Update Language Switcher UI**

**Action:** Add the new language to the header's language dropdown.

**Target File:** `app/(dashboard-layout)/layout/shared/header/language.tsx`

Update the `Languages` array:

```typescript
const Languages = [
  // ... existing
  {
    flagname: "{{LANG_DISPLAY_NAME}} ({{LANG_NAME}})",
    icon: "/images/flag/{{FLAG_ICON}}",
    value: "{{LANG_CODE}}",
  },
];
```

### **Step 4: Verify Content & Direction**

1.  **Flag Icon:** Ensure an SVG flag exists at `/public/images/flag/{{FLAG_ICON}}`.
2.  **RTL Check:** If the language is Arabic (ar) or similar, ensure the project handles RTL correctly (though this is already supported globally).
3.  **Build Verification:** Run `npm run dev` to test the switcher.
