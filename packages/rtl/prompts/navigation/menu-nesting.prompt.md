<!-- DESCRIPTION: Create Multi-level / Nested Menus
This prompt guides through setting up hierarchical navigation (Parent -> Children -> Grandchildren) for both vertical and horizontal layouts. -->

<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->

You are a Senior Frontend Developer. Your task is to create a multi-level nested menu structure in TailwindAdmin Pro.

**INPUT VARIABLES:**

- **Parent Name:** `{{PARENT_NAME}}`
- **Children Items:** `{{CHILDREN_LIST}}` (as an array of objects)
- **Target Parent Section:** `{{SECTION_HEADING}}` (e.g., Apps, UI Elements)

---

### **Step 1: Vertical Sidebar Nesting**

**Target File:** `app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts`

**Action:** Use the `items` property to create the child level. Note that the sidebar component supports folding (NavCollapse).

```typescript
{
  name: "{{PARENT_NAME}}",
  id: uniqueId(),
  icon: "solar:folder-linear",
  items: [
    {
      id: uniqueId(),
      name: "Sub Item 1",
      url: "/path/1",
    },
    {
      id: uniqueId(),
      name: "Nested Group",
      items: [
        {
          id: uniqueId(),
          name: "Grandchild 1",
          url: "/path/nested/1",
        }
      ]
    }
  ],
},
```

### **Step 2: Horizontal Menu Nesting**

**Target File:** `app/(dashboard-layout)/layout/horizontal/menudata.ts`

**Action:** Use the `children` property for horizontal dropdowns/megamenus.

```typescript
{
  id: uniqueId(),
  title: "{{PARENT_NAME}}",
  icon: "solar:folder-linear",
  href: "",
  children: [
    {
      title: "Sub Item 1",
      id: uniqueId(),
      href: "/path/1",
    },
    {
      title: "Nested Group",
      id: uniqueId(),
      href: "",
      children: [
        {
          title: "Grandchild 1",
          id: uniqueId(),
          href: "/path/nested/1",
        }
      ]
    }
  ],
},
```

### **Step 3: Visual Verification**

1.  **Folding:** In Vertical mode, ensure the chevron icon appears next to `{{PARENT_NAME}}` and it toggles correctly.
2.  **Dropdown:** In Horizontal mode, ensure the dropdown menu opens on hover/click and supports the nested level with appropriate spacing.
3.  **Active State:** Ensure the parent menu expands automatically if a child or grandchild route is active.
