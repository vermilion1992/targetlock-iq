<!-- DESCRIPTION: Create Form Component
This prompt generates a responsive form component using React Hook Form and Zod validation, utilizing standard primitive UI components instead of the Shadcn Form abstraction. -->

<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->

# TailwindAdmin Pro: Form Architect

You are an expert in building highly responsive, accessible, and theme-consistent forms for TailwindAdmin Pro.

---

## Input Variables

- **Target Component File**: `{{COMPONENT_FILE}}` (e.g., `app/components/form-components/my-domain/custom-form.tsx`)
- **Target Page File**: `{{PAGE_FILE}}` (e.g., `app/(dashboard-layout)/forms/my-domain/page.tsx`)
- **Form Title & Description**: `{{FORM_TITLE}}` / `{{FORM_DESCRIPTION}}`
- **Fields Needed**: `{{FIELDS}}` (e.g., Name, Email, Password, Custom Dropdown)

---

## Architecture & Tech Stack Rules

1. **Separation of Concerns (IMPORTANT)**:
   - The reusable **Form UI Component** MUST be created inside `app/components/form-components/...`.
   - The **Page Route** that renders the form MUST be created inside `app/(dashboard-layout)/forms/...`.
2. **Standard React Hook Form (NO UI/FORM WRAPPER)**:
   - **DO NOT** import from `@/components/ui/form`. (This project does not use Shadcn's `<Form>` wrapper or `<FormField>`).
   - Use standard `useForm` hook (`const { register, handleSubmit, formState: { errors } } = useForm(...)`).
   - Use standard UI components: `<Input>`, `<Label>`, `<Textarea>`, `<Select>`, etc.
3. **Validation & TypeScript**:
   - Use **React Hook Form** combined with **Zod** (`@hookform/resolvers/zod`). Ensure schemas are strictly typed.
   - Resolve all TypeScript type errors. Do NOT use `any` or leave implicit `any` types. Specify exact types for component props and event handlers.
4. **Theme & Styling**:
   - Wrap the entire form in a Shadcn `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`.
   - Primary actions (Submit button) must use standard `<Button type="submit">` (which uses the project's `--primary` OKLCH variable).
5. **Responsiveness**: Use Tailwind CSS grids configuration.
   - Mobile: 1 column (`grid-cols-1`).
   - Tablet/Desktop: 2 columns for smaller fields (`md:grid-cols-2`), 1 column for large fields (Textareas, Submit buttons).

---

## Implementation Steps

### 1. Define the Schema

Define a strict Zod schema outside the component based on the `{{FIELDS}}` requested. Include specific error messages.

### 2. Setup the Form Hook

Initialize `useForm<z.infer<typeof formSchema>>` with the `zodResolver`.

### 3. Build the UI

Construct the form layout. Ensure every field is wired properly using `register`:

```tsx
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Inside the component return:
<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
  <div>
    <Label htmlFor="fieldName">Field Label</Label>
    <Input id="fieldName" {...register("fieldName")} />
    {errors.fieldName && (
      <span className="text-destructive text-sm">
        {errors.fieldName.message}
      </span>
    )}
  </div>
</form>;
```

### 4. Submission Handler

Create an `onSubmit(values: z.infer<typeof formSchema>)` function. Simulate an API call (e.g., `console.log(values)`). Ensure the function is strongly typed to avoid TypeScript errors.

### 5. Update Navigation Menus (DO NOT CREATE NEW HEADINGS)

Once the page route is created, you MUST register it inside the existing "Form layouts" categories in the navigation.
Ensure `uniqueId()` from `lodash` is used for the `id` field.

**A. Vertical Sidebar (`app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts`)**
Find the `items` array where `name: "Form layouts"` exists (inside UI ELEMENTS or a similar heading). Add the new route to its `items` array.

```typescript
{
  id: uniqueId(),
  name: "{{FORM_TITLE}}",
  url: "{{PAGE_FILE_ROUTE}}", // e.g., "/forms/contact"
}
```

**B. Horizontal Menu (`app/(dashboard-layout)/layout/horizontal/menudata.ts`)**
Find the `children` array where `title: 'Form layouts'` or `Forms` exists. Keep this exactly in sync with the vertical sidebar.

```typescript
{
  id: uniqueId(),
  title: "{{FORM_TITLE}}",
  href: "{{PAGE_FILE_ROUTE}}",
}
```

---

## Checklist

- [ ] Schema defined using Zod.
- [ ] Pure `react-hook-form` components used instead of Shadcn `ui/form`.
- [ ] TypeScript type errors resolved (No `any` types).
- [ ] Added to `sidebaritems.ts` inside the existing "Form layouts" item.
- [ ] Added to `menudata.ts` inside the existing "Form layouts" / "Forms" item.
