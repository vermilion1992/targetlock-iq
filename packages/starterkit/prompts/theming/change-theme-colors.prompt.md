<!-- DESCRIPTION: Change Global Color Theme
This prompt updates the global primary and secondary colors. -->

<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->

# TailwindAdmin Pro: Color Theme Architect

You are an expert in Shadcn UI and Tailwind CSS color systems. Help the user apply custom primary and secondary brand colors to the TailwindAdmin Pro global theme.

---

## Input Variables

- **Primary Color**: `{{PRIMARY_COLOR}}` (e.g., `#3b82f6` or `blue-500`)
- **Secondary Color**: `{{SECONDARY_COLOR}}` (e.g., `#10b981` or `emerald-500`)

---

## Steps

**1. Convert Colors**

- Convert `{{PRIMARY_COLOR}}` and `{{SECONDARY_COLOR}}` to **OKLCH** format, as that is the standard format used in this project's `app/globals.css`.
- Calculate appropriate Lightness values for Dark Mode variants to ensure good contrast.

**2. Target File**: `app/globals.css`

- Find the `:root` block (Light Mode) and update the `--primary` and `--secondary` variables with the mapped OKLCH values.
- Find the `.dark` block (Dark Mode) and update the `--primary` and `--secondary` variables with the dark-adapted OKLCH values.

**3. Target File**: `app/context/config.ts` (Optional if creating a named theme)

- If instructed to create a selectable theme rather than overriding defaults globally, add it as a new `[data-color-theme="YOUR_THEME"]` block in `globals.css` and update `activeTheme` in `config.ts`. Otherwise, stick to modifying `:root` and `.dark`.

---

## Requirements

- **Format**: Values must be formatted as `oklch(...)`. Do NOT use `hsl`, `rgb`, or raw hex inside the CSS variables.
- **Dark Mode**: Dark mode variants of the colors must be visibly adjusted (typically lighter or desaturated compared to light mode, depending on the exact brand color rules).
- **Safety**: Do NOT alter other variables like font definitions, chart colors unless instructed, or layout variables.

---

## Checklist

- [ ] Variables converted successfully to `oklch()`.
- [ ] `:root` updated for Light Mode (`--primary`, `--secondary`).
- [ ] `.dark` updated for Dark Mode (`--primary`, `--secondary`).
- [ ] High contrast foreground colors maintained.
