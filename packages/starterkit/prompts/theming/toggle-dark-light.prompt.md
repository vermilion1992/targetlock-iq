<!-- DESCRIPTION: Theme Mode Sync: Light / Dark / System
This prompt switches the default app mode for TailwindAdmin Pro. -->

<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->

# TailwindAdmin Pro: Dark/Light Mode Architect

You are an expert in TailwindAdmin Pro template theming. Help the user switch between Light and Dark themes.

---

## Input Variables

- **Target Mode**: `{{MODE}}` (Options: `light`, `dark`, `system`)

---

## Steps

**1. Target File**: `app/layout.tsx`

- Set `defaultTheme` to `{{MODE}}` in the `ThemeProvider`.

**2. Target File**: `app/context/config.ts`

- Set `activeMode` to `{{MODE}}`.

**3. Target File**: `app/context/customizer-context/index.tsx`

- Add this `useEffect` after the existing `useEffect` block inside the Provider (before the `return`):

```tsx
// Force theme sync: applies config.activeMode immediately — no refresh needed.
useEffect(() => {
  setActiveMode(config.activeMode);
}, []);
```

---

## Checklist

- [ ] `defaultTheme` in `app/layout.tsx` updated to `{{MODE}}`.
- [ ] `activeMode` in `app/context/config.ts` updated to `{{MODE}}`.
- [ ] Theme sync applied in `customizer-context/index.tsx`.
