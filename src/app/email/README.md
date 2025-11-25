# Email Module Structure

This module handles all email-related functionality including inbox, sent emails, and compose.

## 📁 Directory Structure

```
email/
├── _components/          # Reusable components
│   ├── shared/          # Components used by multiple pages
│   │   ├── AttachmentPreview.tsx
│   │   └── index.ts
│   ├── inbox/           # Inbox-specific components
│   │   ├── EmailList.tsx
│   │   ├── EmailListItem.tsx
│   │   ├── InboxFilters.tsx
│   │   ├── ReadingPane.tsx
│   │   └── index.ts
│   └── index.ts         # Main export file
├── _hooks/              # Custom React hooks
│   └── useInboxEmails.ts
├── _utils/              # Email utilities
│   └── formatters.ts
├── compose/             # Compose email page
│   └── page.tsx
├── inbox/               # Inbox page
│   └── page.tsx
├── sent/                # Sent emails page
│   └── page.tsx
├── Email.tsx            # Main email workspace layout
├── layout.tsx           # Next.js layout wrapper
└── page.tsx             # Email index (redirects to inbox)
```

## 🎯 Component Organization

### Shared Components (`_components/shared/`)
Components used across multiple email pages:
- **AttachmentPreview**: Modal for previewing attachments

### Inbox Components (`_components/inbox/`)
Components specific to the inbox view:
- **EmailList**: Container for email list with loading/error states
- **EmailListItem**: Individual email row in Gmail style
- **InboxFilters**: Filter controls (search, date, etc.)
- **ReadingPane**: Email content viewer with HTML rendering

## 🔄 Data Flow

1. **Page Component** (inbox/page.tsx)
   - Manages state and data fetching
   - Coordinates between components

2. **Components**
   - Receive props from page
   - Handle UI interactions
   - Use memo for performance

3. **Hooks** (if needed)
   - Encapsulate data fetching logic
   - Reusable across pages

## 📝 Usage Example

```tsx
import { EmailList, InboxFilters, ReadingPane } from '@/app/email/_components/inbox';
import { AttachmentPreviewModal } from '@/app/email/_components/shared';
```

## 🚀 Performance Optimizations

- All components use `React.memo` to prevent unnecessary re-renders
- Components are split by responsibility for better code splitting
- Lazy loading can be added for heavy components

