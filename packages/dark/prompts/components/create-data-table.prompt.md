<!-- DESCRIPTION: Create TanStack React Table Component
This prompt generates a robust, responsive data table component using @tanstack/react-table and Shadcn UI components. -->

<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->

# TailwindAdmin Pro: Data Table Architect

You are an expert in building highly responsive, advanced data tables using `@tanstack/react-table` integrated with Shadcn UI for the TailwindAdmin Pro project.

---

## Input Variables

- **Target Component File**: `{{COMPONENT_FILE}}` (e.g., `app/components/react-tables/custom-domain/data-table.tsx`)
- **Target Page File**: `{{PAGE_FILE}}` (e.g., `app/(dashboard-layout)/react-tables/custom-domain/page.tsx`)
- **Table Title**: `{{TABLE_TITLE}}` (e.g., "Customer Orders")
- **Data Columns Needed**: `{{COLUMNS}}` (e.g., ID, Name, Status, Progress, Budget)

---

## Architecture & Tech Stack Rules

1. **Separation of Concerns (IMPORTANT)**:
   - The reusable **Table Component** MUST be created inside `app/components/react-tables/...`.
   - The **Page Route** that renders the table MUST be created inside `app/(dashboard-layout)/react-tables/...`.
2. **TanStack React Table**:
   - Import necessary hooks and models: `createColumnHelper`, `useReactTable`, `getCoreRowModel`, `flexRender` from `@tanstack/react-table`.
   - Strongly type the row data interface and pass it to `createColumnHelper<YourType>()`.
3. **Shadcn UI & Styling rules**:
   - Wrap the entire table in Shadcn UI `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`.
   - The table elements (`<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`) should be elegantly styled using Tailwind classes for borders, padding, and text alignment.
4. **Colorization & Components (Badges / Progress)**:
   - If utilizing a `Badge` or `Progress` component within a column cell, you MUST use the project's color variables: `chart-1`, `chart-2`, `chart-3`, `chart-4`, `chart-5`, `primary`, `secondary`, or `destructive`.
   - The Badge background color must be 10% opacity, and the text color must match the specific chart tone.
   - Example Badge implementation: `<Badge className="bg-chart-1/10 text-chart-1 hover:bg-chart-1/10 px-2 py-1 rounded-sm border-none shadow-none">Active</Badge>`
5. **TypeScript formatting**:
   - Resolve all TypeScript type errors. Specify exact types for component props. Avoid implicit `any`.

---

## Implementation Steps

### 1. Define Data and Column Types

Create the TypeScript interface for your table row data based on `{{COLUMNS}}`.
Create mock data conforming exactly to this type.

### 2. Configure Column Helper

Use the `@tanstack/react-table` column helper. When defining cells for "Status", "Progress", or similar data points, implement Shadcn badges and apply the 10% opacity colors rule.

```tsx
const columnHelper = createColumnHelper<DataType>();

const generateColumns = () => [
  columnHelper.accessor("status", {
    header: () => <span>Status</span>,
    cell: (info) => (
      <Badge className="bg-chart-2/10 text-chart-2 hover:bg-chart-2/10 border-none shadow-none">
        {info.getValue()}
      </Badge>
    ),
  }),
  // Add other columns here based on {{COLUMNS}}
];
```

### 3. Build the UI

Render the structure using Shadcn `Card` and standard HTML table formatting dynamically via `getCoreRowModel()`.

### 4. Update Navigation Menus (DO NOT CREATE NEW HEADINGS)

Once the page route is created, you MUST register it inside the existing "React Tables" or "Tables" categories in the navigation.
Ensure `uniqueId()` from `lodash` is used for the `id` field.

**A. Vertical Sidebar (`app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts`)**
Find the `items` array where `name: "React Tables"` (or similar parent) exists. Add the new route to its `items` array.

```typescript
{
  id: uniqueId(),
  name: "{{TABLE_TITLE}}",
  url: "{{PAGE_FILE_ROUTE}}", // e.g., "/react-tables/custom-domain"
}
```

**B. Horizontal Menu (`app/(dashboard-layout)/layout/horizontal/menudata.ts`)**
Find the `children` array where `title: 'React Tables'` exists. Keep this exactly in sync with the vertical sidebar.

```typescript
{
  id: uniqueId(),
  title: "{{TABLE_TITLE}}",
  href: "{{PAGE_FILE_ROUTE}}",
}
```

---

## Checklist

- [ ] Strict types defined for TanStack Table rows.
- [ ] Table encapsulated securely within Shadcn `<Card>` elements.
- [ ] Any `Badge` generated utilizes `bg-chart-[n]/10 text-chart-[n]` styling.
- [ ] Added to `sidebaritems.ts` under React Tables.
- [ ] Added to `menudata.ts` under React Tables.
