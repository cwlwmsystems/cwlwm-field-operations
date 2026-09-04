# Apply v1.0 App Integration — Phase 1

Apply this update on top of your committed working v0.9 project.

## 1. Confirm your repository is clean

```powershell
git status
```

## 2. Stop Next.js

Press `Ctrl+C`.

## 3. Copy this update into the project root

Allow Windows to replace matching files.

## 4. Check `.env.local`

It should contain real project values plus:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_USE_MOCK_DATA=true
```

Do not put a service-role key here.

## 5. Install dependencies if needed

Your existing package already declares Supabase dependencies. If npm reports missing packages:

```powershell
npm install
```

## 6. Start

```powershell
npm run dev
```

## 7. Test login

Open:

```text
http://localhost:3000/login
```

Sign in with the Supabase Auth user you created.

A successful login should take you to:

```text
/connection
```

You should see:

- authenticated user/email
- Supabase user UUID
- Northstar Field Services
- organization owner
- mock operational data

## 8. Verify existing app

Open:

- `/dashboard`
- `/territories`
- `/sales`
- `/scheduling`
- `/lifecycle`
- `/finance`
- `/reports`

The existing local functionality should still work.

## 9. Verify session

Refresh the browser. You should remain signed in.

## 10. Verify sign-out

Click **Sign out**. Then attempt to open `/dashboard`.

You should be redirected to `/login`.

## 11. Commit only after verification

```powershell
git status
git add .
git commit -m "Add Supabase auth and organization context v1.0 phase 1"
git push
```

Do not commit `.env.local`.
