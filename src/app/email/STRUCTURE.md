# 📧 Email Module - File Structure

## 🗂️ Complete Directory Tree

```
email/
├── 📄 README.md                    # Module documentation
├── 📄 STRUCTURE.md                 # This file - structure overview
│
├── 📁 _components/                 # All reusable components (underscore = internal)
│   ├── 📁 shared/                 # Shared across multiple pages
│   │   ├── AttachmentPreview.tsx  # Attachment preview modal & badge
│   │   └── index.ts               # Exports: AttachmentBadge, AttachmentPreviewModal
│   │
│   ├── 📁 inbox/                  # Inbox-specific components
│   │   ├── EmailList.tsx          # Email list container (loading/error states)
│   │   ├── EmailListItem.tsx      # Individual email row (Gmail style)
│   │   ├── InboxFilters.tsx       # Filter controls (search, dates, etc.)
│   │   ├── ReadingPane.tsx        # Email content viewer with HTML rendering
│   │   └── index.ts               # Exports all inbox components
│   │
│   └── index.ts                   # Main export (re-exports shared & inbox)
│
├── 📁 _hooks/                      # Custom React hooks (future use)
│   └── (empty - ready for hooks like useInboxEmails, useEmailFilters)
│
├── 📁 _utils/                      # Email-specific utilities (future use)
│   └── (empty - ready for formatters, validators, etc.)
│
├── 📁 inbox/                       # Inbox page route
│   └── page.tsx                    # Main inbox page (uses components)
│
├── 📁 sent/                        # Sent emails page route
│   └── page.tsx                    # Sent emails page
│
├── 📁 compose/                     # Compose email page route
│   └── page.tsx                    # Compose email page
│
├── 📄 Email.tsx                    # Main workspace layout (sidebar + content)
├── 📄 layout.tsx                   # Next.js layout wrapper
└── 📄 page.tsx                     # Email index (redirects to /inbox)
```

## 🎯 Import Patterns

### ✅ Recommended Imports

```typescript
// Import from specific feature folder
import { EmailList, InboxFilters, ReadingPane } from '@/app/email/_components/inbox';
import { AttachmentPreviewModal } from '@/app/email/_components/shared';

// Or use main index (if you need multiple)
import { EmailList, AttachmentPreviewModal } from '@/app/email/_components';
```

### 📦 Component Organization

| Component | Location | Used By | Purpose |
|-----------|----------|---------|---------|
| `AttachmentPreview` | `_components/shared/` | Inbox, Sent, Compose | Preview attachments |
| `EmailList` | `_components/inbox/` | Inbox page | List container |
| `EmailListItem` | `_components/inbox/` | EmailList | Individual email row |
| `InboxFilters` | `_components/inbox/` | Inbox page | Filter controls |
| `ReadingPane` | `_components/inbox/` | Inbox page | Email content viewer |

## 🔑 Key Principles

1. **Underscore Prefix (`_`)** = Internal/private modules
   - `_components`, `_hooks`, `_utils` are internal to the email module
   - Not meant to be imported from outside the email module

2. **Feature-Based Organization**
   - Components grouped by feature (inbox, sent, shared)
   - Easy to find and maintain related code

3. **Index Files**
   - Each folder has an `index.ts` for clean imports
   - Reduces import path complexity

4. **Separation of Concerns**
   - Pages handle state and data fetching
   - Components handle UI rendering
   - Utils handle business logic

## 🚀 Adding New Components

### For Inbox:
1. Create file in `_components/inbox/`
2. Export from `_components/inbox/index.ts`
3. Import in inbox page: `import { NewComponent } from '@/app/email/_components/inbox'`

### For Shared (used by multiple pages):
1. Create file in `_components/shared/`
2. Export from `_components/shared/index.ts`
3. Import: `import { NewComponent } from '@/app/email/_components/shared'`

## 📝 Naming Conventions

- **Components**: PascalCase (e.g., `EmailListItem.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useInboxEmails.ts`)
- **Utils**: camelCase (e.g., `formatters.ts`)
- **Pages**: lowercase (e.g., `page.tsx`)

## 🔄 Migration Notes

- Old path: `@/app/email/components/AttachmentPreview`
- New path: `@/app/email/_components/shared/AttachmentPreview`
- Or use: `@/app/email/_components/shared` (via index)

