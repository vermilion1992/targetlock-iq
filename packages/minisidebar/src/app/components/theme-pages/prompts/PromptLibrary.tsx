"use client";

import { Badge } from "@/components/ui/badge";
import {
    BookMarked,
    ChevronRight,
    File,
    Lock,
    Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CodeBlock } from "@/app/components/shared/code-viewer/code-block";
import { cn } from "@/lib/utils";
import { Icon } from "@iconify/react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

// ─── File Data ────────────────────────────────────────────────────────────────

type PromptFile = {
    path: string;
    code: string;
};

const promptFiles: PromptFile[] = [
    {
        path: "prompts/apps/isolate-app.prompt.md",
        code: `<!-- DESCRIPTION: Isolate a Single Application Module
This prompt cleans up the codebase by removing all application modules except for the one specified by {{KEEP_APP_NAME}}. This includes deleting page routes, components, contexts, and API handlers for the unused apps. -->
 
<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->
 
You are an expert Frontend Architect for ShadcnSpace Dashboard Pro. Your task is to isolate the **{{KEEP_APP_NAME}}** application module and remove all other application modules to create a clean, single-purpose codebase.
 
**INPUT VARIABLE:**
- **App to Keep:** {{KEEP_APP_NAME}} (e.g., Blog, Calendar, Chat-AI, Chats, Contacts, Ecommerce, Email, Image-AI, Invoice, Kanban, Notes, Tickets, User-Profile)
}`,
    },
    {
        path: "prompts/auth/create-auth-page.prompt.md",
        code: `<!-- DESCRIPTION: Create Authentication Page with Zod Validation
This prompt generates a cohesive authentication page (Login, Register, etc.) integrated with centralized Zod validation schemas and React Hook Form. -->
 
<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->
 
# ShadcnSpace Dashboard Pro: Auth & Validation Architect
 
You are an expert in building secure, visually stunning authentication systems. Your goal is to create auth pages that are not only beautiful but also robustly validated using **Zod** and **React Hook Form**, with all error messages centralized for easy configuration.
 
## Input Variables
- **Auth Type**: {{AUTH_TYPE}} (e.g., Login, Register, Forgot Password, Two Steps)
- **Auth Variant**: {{VARIANT}} (e.g., Auth1 - Side Image, Auth2 - Boxed)
- **Page Title**: {{PAGE_TITLE}} (e.g., "Side Login Authentication")
- **Target Page File**: {{PAGE_FILE}} (e.g., app/auth/auth1/login/page.tsx)
 
}`,
    },
    {
        path: "prompts/branding/update-branding.prompt.md",
        code: `<!-- DESCRIPTION: Complete Application Rebrand
This prompt rebrands ShadcnSpace Dashboard Pro by updating the project name, package names, company references, metadata, and logo files. Changes ONLY branding elements - NO color changes, NO styling updates, NO theme modifications. -->
 
<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->
 
You are a Senior Frontend Developer for a Next.js admin dashboard. Your task is to completely rebrand ShadcnSpace Dashboard Pro from **{{OLD_BRAND}}** to **{{NEW_BRAND}}** with NO errors. Update configuration files, text references, metadata, and logo assets only. DO NOT change colors, themes, styles, or component logic.
 
**INPUT VARIABLES:**
 
- **Old Brand:** {{ OLD_BRAND }} (e.g., ADMINPro)
- **New Brand:** { { NEW_BRAND } } (e.g., My Dashboard)
- **Old Brand Lower:** { { OLD_BRAND_LOWER } }  (e.g., admin-pro)
- **New Brand Lower:** { { NEW_BRAND_LOWER } }  (e.g., my-dashboard)
- **Old Company Name:** { { OLD_COMPANY_NAME } }  (e.g., WrapPixel)
- **New Company Name:** { { NEW_COMPANY_NAME } }  (e.g., MyCompany)
- **New Package Name:** { { NEW_PACKAGE_NAME } }  (e.g., my-dashboard-pro)
 
---`,
    },
    {
        path: "prompts/components/create-data-table.prompt.md",
        code: `<!-- DESCRIPTION: Create TanStack React Table Component
This prompt generates a robust, responsive data table component using @tanstack/react-table and Shadcn UI components. -->
 
<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->
 
# ShadcnSpace Dashboard Pro: Data Table Architect
 
You are an expert in building highly responsive, advanced data tables using @tanstack/react-table integrated with Shadcn UI for the ShadcnSpace Dashboard Pro project.
 
---
 
## Input Variables
- **Target Component File**: {{COMPONENT_FILE}} (e.g., app/components/react-tables/custom-domain/data-table.tsx)
- **Target Page File**: {{PAGE_FILE}} (e.g., app/(dashboard-layout)/react-tables/custom-domain/page.tsx)
- **Table Title**: {{TABLE_TITLE}} (e.g., "Customer Orders")
- **Data Columns Needed**: {{COLUMNS}} (e.g., ID, Name, Status, Progress, Budget)
 
---`,
    },
    {
        path: "prompts/dashboard/dashboard-master.prompt.md",
        code: `<!-- DESCRIPTION: Professional Dashboard Creation Prompt
This prompt builds premium, production-ready admin dashboards for the ShadcnSpace Dashboard Pro project.
It follows a strict 4-row architecture and enforces project-specific styling rules (oklch, borders, opacity). -->
 
<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->
 
# ShadcnSpace Dashboard Pro: Professional Dashboard Architect
 
You are a **Senior Principal Frontend Architect**. Your mission is to build a flawless, high-performance dashboard module. You must strictly adhere to the project's premium design system and prevent common React/Next.js pitfalls.
 
---
 
##  INPUT VARIABLES
Please provide values for these placeholders to generate your dashboard:
 
- **Dashboard Name**: {{DASHBOARD_TITLE}}: The display name (e.g., "General Analytics").
- **Dashboard Name Lower**: {{DASHBOARD_NAME_LOWER}}: The URL/folder name (e.g., "general").
- **Dashboard Icon**: {{ICON_NAME}}: A Solar Icon name (e.g., "solar:chart-2-bold-duotone").
- **KPI Metrics**: {{KPI_DATA}}: Key metrics to show in cards.
- **Data Table Info**: {{TABLE_DATA}}: Columns and mock data for the list view.`,
    },
    {
        path: "prompts/dashboard/update-dashboard-component.prompt.md",
        code: `<!-- DESCRIPTION: Dashboard Component Update Prompt
This prompt is designed to intelligently update existing dashboard components.
It ensures that modifications respect the current logic while aligning with the latest design system rules. -->
 
<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->
 
# ShadcnSpace Dashboard Pro: Component Evolution Architect
 
You are a **Senior Principal Frontend Architect**. Your mission is to refactor or update an existing dashboard component. You must maintain the component's integrity while strictly enforcing the project's premium design system and technical standards.
 
**INPUT VARIABLES:**
 
- **Component Path**: {{COMPONENT_PATH}} (e.g., app/components/dashboards/analytics/total-visits.tsx)
- **Change Description**: {{CHANGE_DESCRIPTION}} (e.g., Change bar to area chart)
- **New Data Metrics**: {{NEW_DATA_METRICS}} (Optional: Data keys/values)
 
---`,
    },
    {
        path: "prompts/forms/create-form-component.prompt.md",
        code: `<!-- DESCRIPTION: Create Form Component
This prompt generates a responsive form component using React Hook Form and Zod validation, utilizing standard primitive UI components instead of the Shadcn Form abstraction. -->
 
<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->
 
# ShadcnSpace Dashboard Pro: Form Architect
 
You are an expert in building highly responsive, accessible, and theme-consistent forms for ShadcnSpace Dashboard Pro.
 
---
 
## Input Variables
- **Target Component File**: {{COMPONENT_FILE}} (e.g., app/components/form-components/my-domain/custom-form.tsx)
- **Target Page File**: {{PAGE_FILE}} (e.g., app/(dashboard-layout)/forms/my-domain/page.tsx)
- **Form Title & Description**: {{FORM_TITLE}} / {{FORM_DESCRIPTION}}
- **Fields Needed**: {{FIELDS}} (e.g., Name, Email, Password, Custom Dropdown)
 
---`,
    },
    {
        path: "prompts/language/add-new-language.prompt.md",
        code: `<!-- DESCRIPTION: Add a New Language to the ShadcnSpace Dashboard Pro
This prompt guides through the process of adding i18n support for a new language, including translation files, configuration registration, and UI updates. -->
 
<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->
 
You are a Senior Frontend Developer. Your task is to add support for a new language to ShadcnSpace Dashboard Pro.
 
**INPUT VARIABLES:**
- **Language Name:** {{LANG_NAME}} (e.g., German)
- **Language Display Name:** {{LANG_DISPLAY_NAME}} (e.g., Deutsch)
- **Language Code:** {{LANG_CODE}} (e.g., de)
- **Flag Icon Filename:** {{FLAG_ICON}} (e.g., icon-flag-de.svg)
 
---`,
    },
    {
        path: "prompts/language/remove-language.prompt.md",
        code: `<!-- DESCRIPTION: Completely Remove a Language from the ShadcnSpace Dashboard Pro
This prompt guides through the process of removing i18n support for an existing language, including deleting files, unregistering config, and UI updates. -->
 
<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->
 
You are a Senior Frontend Developer. Your task is to completely remove support for a specific language from ShadcnSpace Dashboard Pro.
 
**INPUT VARIABLES:**
- **Language Code to Remove:** {{LANG_CODE}} (e.g., ar, fr, ch)
 
---
 
### **Step 1: Delete Translation File**
 
**Action:** Remove the JSON translation file.
 
**Target File:** utils/languages/{{LANG_CODE}}.json`,
    },
    {
        path: "prompts/navigation/add-page-with-menu.prompt.md",
        code: `<!-- DESCRIPTION: Create a New Page and Register it in Navigation
 
This workflow handles the end-to-end process of creating a new dashboard page, including directory setup, basic component boilerplate, and registration in both vertical and horizontal menus. -->
 
<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->
 
You are a Senior Frontend Developer. Your task is to add a completely new page to the ShadcnSpace Dashboard Pro and ensure it is accessible via the navigation.
 
**INPUT VARIABLES:**
 
- **Page Name:** {{PAGE_NAME}} (e.g., Sales Analysis)
- **Route Path:** {{ROUTE_PATH}} (e.g., dashboards/sales)
- **Directory Path:** {{DIR_PATH}} (e.g., app/(dashboard-layout)/dashboards/sales/)
- **Icon Name:** {{ICON_NAME}} (e.g., solar:chart-bold-duotone)
 
---`,
    },
    {
        path: "prompts/navigation/configure-menu-badges.prompt.md",
        code: `<!-- DESCRIPTION: Add or Modify Menu Notification Badges
This prompt guides through adding status badges (like "New", "Pro", or numerical alerts) to menu items in the sidebar. -->
 
<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->
 
You are a Senior Frontend Developer. Your task is to implement notification or status badges on menu items in ShadcnSpace Dashboard Pro.
 
**INPUT VARIABLES:**
- **Target Item Name:** {{ITEM_NAME}} (e.g., Chat)
- **Badge Content:** {{BADGE_TEXT}} (e.g., New, 99+, Pro)
- **Badge Type:** {{BADGE_TYPE}} (filled, outlined)
 
---
 
### **Step 1: Locate Target Item**
**Target File:** app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts
**Action:** Find the object in the SidebarContent array that has name: "{{ITEM_NAME}}".
### **Step 2: Apply Badge Properties**
**Action:** Add or update the badge fields.`,
    },
    {
        path: "prompts/navigation/manage-menu.prompt.md",
        code: `<!-- DESCRIPTION: Manage Dashboard Menu Items (Vertical & Horizontal)
This prompt guides through the process of adding, removing, or modifying items in the application's navigation systems, ensuring consistency between the vertical sidebar and horizontal menu. -->
 
<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->
 
You are a Senior Frontend Developer. Your task is to update the navigation menus in ShadcnSpace Dashboard Pro. You must ensure that changes are reflected in both the **Vertical Sidebar** and the **Horizontal Menu**.
 
**INPUT VARIABLES:**
- **Action Type:** {{ACTION_TYPE}} (ADD_LINK, ADD_SECTION, REMOVE_ITEM, MODIFY_ITEM)
- **Item Name:** {{ITEM_NAME}} (e.g., Reports)
- **Target URL:** {{TARGET_URL}} (e.g., /dashboards/reports)
- **Icon Name:** {{ICON_NAME}} (e.g., solar:chart-square-line-duotone)
- **Parent Heading/Section:** {{PARENT_SECTION}} (e.g., Dashboard, Apps)`,
    },
    {
        path: "prompts/navigation/menu-nesting.prompt.md",
        code: `<!-- DESCRIPTION: Create Multi-level / Nested Menus
This prompt guides through setting up hierarchical navigation (Parent -> Children -> Grandchildren) for both vertical and horizontal layouts. -->
 
<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->
 
You are a Senior Frontend Developer. Your task is to create a multi-level nested menu structure in ShadcnSpace Dashboard Pro.
 
**INPUT VARIABLES:**
- **Parent Name:** {{PARENT_NAME}}
- **Children Items:** {{CHILDREN_LIST}} (as an array of objects)
- **Target Parent Section:** {{SECTION_HEADING}} (e.g., Apps, UI Elements)`,
    },
    {
        path: "prompts/theming/change-direction.prompt.md",
        code: `<!-- DESCRIPTION: Change Direction (LTR / RTL)
This prompt switches the global text direction mode for ShadcnSpace Dashboard Pro. -->
 
<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->
 
# ShadcnSpace Dashboard Pro: Direction Architect
 
You are an expert in ShadcnSpace Dashboard Pro template configuration. Help the user switch between Left-to-Right (LTR) and Right-to-Left (RTL) modes.
 
---
 
## Input Variables
- **Target Direction**: {{DIRECTION}} (Options: ltr, rtl)
 
---`,
    },
    {
        path: "prompts/theming/change-theme-colors.prompt.md",
        code: `<!-- DESCRIPTION: Change Global Color Theme
This prompt updates the global primary and secondary colors. -->
 
<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->
 
# ShadcnSpace Dashboard Pro: Color Theme Architect
 
You are an expert in Shadcn UI and Tailwind CSS color systems. Help the user apply custom primary and secondary brand colors to the ShadcnSpace Dashboard Pro global theme.
 
---
 
## Input Variables
- **Primary Color**: {{PRIMARY_COLOR}} (e.g., #3b82f6 or blue-500)
- **Secondary Color**: {{SECONDARY_COLOR}} (e.g., #10b981 or emerald-500)`,
    },
    {
        path: "prompts/theming/toggle-dark-light.prompt.md",
        code: `<!-- DESCRIPTION: Theme Mode Sync: Light / Dark / System
This prompt switches the default app mode for ShadcnSpace Dashboard Pro. -->
 
<!-- AGENT: Claude 3.5 Sonnet / GPT-4 Turbo / Gemini -->
 
# ShadcnSpace Dashboard Pro: Dark/Light Mode Architect
 
You are an expert in ShadcnSpace Dashboard Pro template theming. Help the user switch between Light and Dark themes.
 
---
 
## Input Variables
- **Target Mode**: {{ MODE }} (Options: light, dark, system)`,
    },
];

// ─── Tree Builder ─────────────────────────────────────────────────────────────

type FileNode = { type: "file"; name: string; path: string };
type FolderNode = {
    type: "folder";
    name: string;
    path: string;
    children: TreeNode[];
};
type TreeNode = FileNode | FolderNode;

function buildTree(files: PromptFile[]): TreeNode[] {
    const root: TreeNode[] = [];

    files.forEach((file) => {
        const parts = file.path.split("/");
        let current = root;
        let currentPath = "";

        parts.forEach((part, index) => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            if (index === parts.length - 1) {
                current.push({ type: "file", name: part, path: file.path });
            } else {
                let folder = current.find(
                    (n): n is FolderNode => n.type === "folder" && n.name === part,
                );
                if (!folder) {
                    folder = {
                        type: "folder",
                        name: part,
                        path: currentPath,
                        children: [],
                    };
                    current.push(folder);
                }
                current = folder.children;
            }
        });
    });

    return root;
}

// ─── Tree Item ────────────────────────────────────────────────────────────────

function TreeItems({
    nodes,
    activePath,
    onSelect,
}: {
    nodes: TreeNode[];
    activePath: string;
    onSelect: (path: string) => void;
}) {
    return (
        <>
            {nodes.map((node, i) => {
                if (node.type === "folder") {
                    return (
                        <FolderItem
                            key={i}
                            node={node}
                            activePath={activePath}
                            onSelect={onSelect}
                        />
                    );
                }
                return (
                    <FileItem
                        key={i}
                        node={node}
                        activePath={activePath}
                        onSelect={onSelect}
                    />
                );
            })}
        </>
    );
}

function FolderItem({
    node,
    activePath,
    onSelect,
}: {
    node: FolderNode;
    activePath: string;
    onSelect: (path: string) => void;
}) {
    // Open by default if the active file lives inside this folder
    const [open, setOpen] = useState(() =>
        activePath.startsWith(node.path + "/"),
    );

    return (
        <Collapsible open={open} onOpenChange={setOpen} className="w-full">
            <CollapsibleTrigger className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-sm font-medium text-foreground/70 hover:bg-accent/40 hover:text-foreground cursor-pointer transition-colors">
                <ChevronRight
                    className={cn(
                        "size-3.5 shrink-0 transition-transform duration-200",
                        open && "rotate-90",
                    )}
                />
                <Icon
                    icon="solar:folder-2-bold-duotone"
                    className="size-4 shrink-0 text-yellow-500"
                />
                <span className="truncate">{node.name}</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="ml-3 border-l border-border/50 pl-2">
                    <TreeItems
                        nodes={node.children}
                        activePath={activePath}
                        onSelect={onSelect}
                    />
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

function FileItem({
    node,
    activePath,
    onSelect,
}: {
    node: FileNode;
    activePath: string;
    onSelect: (path: string) => void;
}) {
    const isActive = activePath === node.path;

    return (
        <button
            onClick={() => onSelect(node.path)}
            className={cn(
                "flex w-full items-center gap-1.5 rounded px-2 py-1 text-sm font-medium text-foreground/70 hover:bg-accent/50 hover:text-foreground cursor-pointer transition-colors text-left",
                isActive && "bg-accent text-foreground",
            )}
        >
            <Icon
                icon="solar:code-file-linear"
                className={cn(
                    "size-4 shrink-0 text-muted-foreground",
                    isActive && "text-primary",
                )}
            />
            <span className="truncate">{node.name}</span>
        </button>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const PromptLibrary = () => {
    const tree = buildTree(promptFiles);
    const [activePath, setActivePath] = useState(promptFiles[0].path);
    const router = useRouter();

    const activeFile = promptFiles.find((f) => f.path === activePath);
    const activeFileName = activePath.split("/").pop() ?? "";

    return (
        <section
            id="prompt-library"
            className="py-10  "
        >
            <div className="container mx-auto flex flex-col gap-12">

                {/* File Viewer */}
                <div className="rounded-4xl border border-border bg-background shadow-xs overflow-hidden max-w-6xl mx-auto w-full min-h-xl">
                    {/* Titlebar */}
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border-b border-border">
                        <span className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="w-3 h-3 rounded-full bg-yellow-400" />
                        <span className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="ml-3 text-xs text-foreground font-medium">
                            Prompt Library
                        </span>
                    </div>

                    <div
                        className="flex flex-col sm:flex-row divide-y sm:divide-x divide-border"
                        style={{ minHeight: "420px" }}
                    >
                        {/* Sidebar */}
                        <div className="w-full sm:w-56 shrink-0 bg-background">
                            <div className="flex h-10 items-center px-4 border-b border-border bg-muted/30">
                                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                    Explorer
                                </span>
                            </div>
                            <div
                                className="p-2 space-y-0.5 overflow-y-auto"
                                style={{ maxHeight: "480px" }}
                            >
                                <TreeItems
                                    nodes={tree}
                                    activePath={activePath}
                                    onSelect={setActivePath}
                                />
                            </div>
                        </div>

                        {/* Code Panel */}
                        <div className="flex flex-col flex-1 min-w-0 bg-background">
                            {/* Tab bar */}
                            <div className="flex h-10 shrink-0 items-center justify-between gap-4 border-b border-border px-4 ">
                                <div className="flex items-center gap-2 min-w-0">
                                    <File className="size-3.5 shrink-0 text-muted-foreground" />
                                    <span className="text-sm font-medium truncate">
                                        {activeFileName}
                                    </span>
                                </div>
                            </div>

                            {/* Code */}
                            <div className="relative overflow-hidden h-[400px] text-sm [&_.line]:leading-[1.7] [&>div>pre]:p-4 [&>div>pre]:bg-background! dark:[--shiki-dark-bg:oklch(0.1296_0.0274_261.69)] [&>div>pre]:whitespace-pre-wrap [&>div>pre]:break-words [&>div>pre]:max-w-full [&>div>pre]:overflow-hidden [&>div]:max-w-full [&>div]:overflow-hidden">
                                <div className="absolute bottom-0 right-0 w-full flex flex-col items-center justify-center gap-3 py-6 px-4 bg-linear-to-b from-transparent via-background/50 to-background/80 backdrop-blur-sm z-2 rounded-lg">
                                    <div className="p-3.5 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full border border-primary/30">
                                        <Lock size={20} className="text-primary" />
                                    </div>
                                    <div className="text-center flex flex-col gap-1">
                                        <p className="text-base font-semibold text-foreground">Unlock All Pro Prompts</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Download and get instant access to all AI prompts and resources.
                                        </p>
                                    </div>
                                    <Button
                                        className="mt-2 gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-md font-medium transition-all"
                                        onClick={() => router.push("/frontend-pages/pricing")}
                                    >
                                        Download Prompts
                                        <ChevronRight size={16} />
                                    </Button>
                                </div>
                                {activeFile && <CodeBlock code={activeFile.code} />}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default PromptLibrary;
