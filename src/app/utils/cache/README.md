# Email Cache System - Easy Explanation

## Overview

We have **two cache systems** working together to make email loading fast:

1. **emailStorageCache.ts** - Stores individual emails by ID (main cache)
2. **emailCache.ts** - Stores filtered email lists (legacy, for backward compatibility)

## How It Works (Simple Explanation)

### The Problem
- Backend is slow: 2 seconds per email
- Loading 10 emails = 18+ seconds
- Every time user navigates, we fetch same emails again

### The Solution: Email Storage Cache

**Key Concept:** "Once an email is fetched, we store it. Next time we need it, we use the stored version instead of calling the API."

### Step-by-Step Flow

1. **User opens inbox (Page 1)**
   - Frontend needs 10 emails
   - Checks cache: "Do we have these 10 emails?"
   - If NO → Fetch from API (takes 18 seconds)
   - If YES → Use cache (instant!)

2. **After fetching from API**
   - Store all 10 emails in cache
   - Each email stored by its ID
   - Cache lasts 5 minutes

3. **User navigates to Page 2**
   - Frontend needs emails 11-20
   - Checks cache: "Do we have these?"
   - If some are cached → Use those
   - Only fetch missing ones from API
   - Much faster!

4. **User goes back to Page 1**
   - All emails already in cache
   - **No API call needed** - instant load!

5. **Background Prefetching**
   - While user is on Page 1, we load Page 2 in background
   - When user clicks "Next", emails are already cached
   - Navigation feels instant!

## File Structure

```
emailStorageCache.ts
├── getCachedEmail(id)          → Get one email from cache
├── getCachedEmails(ids)        → Get multiple emails from cache
├── setCachedEmail(id, email)   → Store one email in cache
├── setCachedEmails(emails)     → Store multiple emails in cache
├── checkCachedEmailIds(ids)    → Check which emails are cached
└── clearEmailStorageCache()     → Clear all cached emails
```

## Benefits

✅ **Faster Loading**: Once fetched, emails load instantly from cache  
✅ **Fewer API Calls**: Don't fetch same email twice  
✅ **Better UX**: Navigation feels instant  
✅ **Progressive Loading**: Only fetch what's needed initially  

## Example Scenario

**First Visit:**
- User opens inbox → Fetches 10 emails (18 seconds)
- Emails stored in cache

**Second Visit (within 5 minutes):**
- User opens inbox → All 10 emails from cache (instant!)
- No API call needed

**Navigation:**
- User clicks "Next Page" → Needs emails 11-20
- If prefetched in background → Instant!
- If not prefetched → Fetches only missing ones

## Cache Duration

- **TTL (Time To Live)**: 5 minutes
- After 5 minutes, cache expires and emails are fetched fresh
- This ensures users see recent emails

## Easy to Explain to Seniors

**Simple Version:**
> "We store each email after fetching it. When the user needs the same email again, we use the stored version instead of asking the server again. This makes everything much faster."

**Technical Version:**
> "We implemented a client-side cache using localStorage that stores emails by their unique ID. When loading emails, we first check the cache. If emails exist and are still valid (within 5-minute TTL), we use cached data. Only missing emails are fetched from the API, significantly reducing load times and API calls."

