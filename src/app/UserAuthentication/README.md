# UserAuthentication Module

This folder contains all authentication-related code for the application.

## Structure

```
UserAuthentication/
├── _components/          # Internal components
│   └── AuthGuard.tsx    # Route protection component
├── dashboard/           # Dashboard page (shows login prompt)
│   └── page.tsx
├── login/               # Login page
│   └── page.tsx
├── store/               # Authentication store (Zustand)
│   └── authStore.ts
└── README.md            # This file
```

## Files

- **AuthGuard.tsx**: Protects routes and redirects unauthenticated users to dashboard
- **dashboard/page.tsx**: Shows "Please login to continue" message for unauthenticated users
- **login/page.tsx**: Login form with username/password authentication
- **store/authStore.ts**: Zustand store managing authentication state

## Usage

- Login route: `/UserAuthentication/login`
- Dashboard route: `/UserAuthentication/dashboard`

## Dependencies

- Uses `ALLOWED_USERS` from `@/Shared/constant` for user validation
- Stores authentication state in localStorage via Zustand persist middleware

## To Remove Authentication

If you need to remove authentication in the future:
1. Delete this entire `UserAuthentication` folder
2. Remove `AuthGuard` import from `src/app/layout.tsx`
3. Remove `useAuthStore` imports from components that use it
4. Update routes in `src/app/page.tsx` to remove authentication checks

