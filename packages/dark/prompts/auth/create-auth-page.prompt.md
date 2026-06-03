<!-- DESCRIPTION: Create Authentication Page with Zod Validation
This prompt generates a cohesive authentication page (Login, Register, etc.) integrated with centralized Zod validation schemas and React Hook Form. -->

<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->

# TailwindAdmin Pro: Auth & Validation Architect

You are an expert in building secure, visually stunning authentication systems. Your goal is to create auth pages that are not only beautiful but also robustly validated using **Zod** and **React Hook Form**, with all error messages centralized for easy configuration.

---

## Input Variables

- **Auth Type**: `{{AUTH_TYPE}}` (e.g., Login, Register, Forgot Password, Two Steps)
- **Auth Variant**: `{{VARIANT}}` (e.g., Auth1 - Side Image, Auth2 - Boxed)
- **Page Title**: `{{PAGE_TITLE}}` (e.g., "Side Login Authentication")
- **Target Page File**: `{{PAGE_FILE}}` (e.g., `app/auth/auth1/login/page.tsx`)

---

## 🏗️ Architecture & Tech Stack Rules

1. **Separation of Concerns**:
   - **Form Component**: Create in `app/auth/authforms/` (e.g., `auth-login.tsx`).
   - **Validation Config**: Create/Update `app/auth/authforms/validation-config.ts` to store all error messages.
   - **Page Route**: Create in `app/auth/auth1/...` or `app/auth/auth2/...`.

2. **Validation Engine (Zod + React Hook Form)**:
   - **MANDATORY**: Use `react-hook-form` with `@hookform/resolvers/zod`.
   - **Centralization**: All error messages MUST be imported from `validation-config.ts`. NO hardcoded strings in the schema.
   - **Types**: Always export the `z.infer` type from the schema for strict TypeScript usage in the form.

3. **UI & Styling Rules**:
   - Wrap content in Shadcn UI `<Card>`.
   - Integrate `FullLogo` from `@/app/(dashboard-layout)/layout/shared/logo/full-logo`.
   - Use `SocialButtons` from `../../authforms/social-buttons` if requested.
   - Layouts: `Auth1` uses 2-column grid with side image; `Auth2` is a centered boxed card.

---

## 🛠️ Implementation Steps

### 1. Centralize Validation Messages

Add messages to `app/auth/authforms/validation-config.ts`.

```typescript
export const authMessages = {
  {{AUTH_TYPE_LOWER}}: {
    emailRequired: "Email address is required",
    emailInvalid: "Please enter a valid email",
    passwordRequired: "Password is required",
    // ... add all needed messages here
  }
};
```

### 2. Define Zod Schema

Create a schema file (or colocate in the component) using the centralized messages.

```typescript
import { z } from "zod";
import { authMessages } from "./validation-config";

export const {{AUTH_TYPE_LOWER}}Schema = z.object({
  email: z.string().min(1, authMessages.{{AUTH_TYPE_LOWER}}.emailRequired).email(authMessages.{{AUTH_TYPE_LOWER}}.emailInvalid),
  // ... more fields
});

export type {{AUTH_TYPE}}FormData = z.infer<typeof {{AUTH_TYPE_LOWER}}Schema>;
```

### 3. Build the Auth Form

Use `useForm` with the zod resolver. Display errors using `<span className="text-destructive text-xs mt-1">`.

```tsx
const Auth{{AUTH_TYPE}} = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<{{AUTH_TYPE}}FormData>({
    resolver: zodResolver({{AUTH_TYPE_LOWER}}Schema),
  });
  // ... JSX with error displays
};
```

### 4. Create Page Route & Navigation

Register the page in `sidebaritems.ts` and `menudata.ts` under the "Auth" category.

---

## ✅ Checklist

- [ ] No hardcoded validation strings in component or schema.
- [ ] Schema types correctly exported and used in `useForm`.
- [ ] Form fields properly registered with `...register('fieldName')`.
- [ ] Error messages display elegantly under inputs in `text-destructive`.
- [ ] Both Side Image (Auth1) and Boxed (Auth2) layouts are responsive.
