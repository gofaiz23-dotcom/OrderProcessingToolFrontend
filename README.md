This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=https://orderprocessingtoolbackend.onrender.com/api/v1

# Allowed Users Configuration (REQUIRED - JSON array)
# Format: JSON array of user objects with: id, username, password, email, name
# Example:
NEXT_PUBLIC_ALLOWED_USERS=[{"id":"1","username":"ishan","password":"Is123","email":"ishan@gmail.com","name":"Administrator"},{"id":"2","username":"usman","password":"Us23","email":"usman@gmail.com","name":"Administrator"}]

# Upload Path Configuration
NEXT_PUBLIC_UPLOAD_PATH=FhsOrdersMedia
```

**Important:** `NEXT_PUBLIC_ALLOWED_USERS` is **REQUIRED**. If not set or invalid, no users will be able to login. Make sure to set this environment variable in both development and production environments.

**Note:** If your passwords contain special characters like `#`, `!`, or `@`, they need to be URL-encoded in the `.env.local` file. See `PASSWORD_REFERENCE.md` for details and a list of actual passwords.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
