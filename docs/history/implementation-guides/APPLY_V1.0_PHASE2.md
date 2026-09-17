# Apply v1.0 App Integration — Phase 2

Apply on top of your committed, working Phase 1 project.

## 1. Confirm clean Git state

```powershell
git status
```

## 2. Stop Next.js

Press `Ctrl+C`.

## 3. Copy this update into the project root

Allow replacement of matching files.

## 4. Keep mock mode enabled

```env
NEXT_PUBLIC_USE_MOCK_DATA=true
```

This is intentional.

## 5. Start

```powershell
npm run dev
```

## 6. Test Supabase configuration

Open:

```text
/admin/teams
```

Create a team. Refresh. Confirm it remains.

Then test:

- `/admin/markets`
- `/admin/territories`
- `/admin/representatives`
- `/admin/dispositions`
- `/admin/locations`
- `/admin/organization`

Every save should persist in Supabase.

## 7. Verify in Supabase

Use Table Editor to confirm rows appear in:

- teams
- markets
- territories
- representatives
- representative_territories
- interaction_dispositions
- locations

## 8. Verify compatibility bridge

Open:

- `/territories`
- `/representatives`
- `/locations`

The configuration loaded from Supabase should also be visible to the existing operational UI.

## 9. Sign-out persistence test

Sign out, sign back in, and confirm the same configuration reloads.

## 10. Commit after verification

```powershell
git status
git add .
git commit -m "Move admin configuration to Supabase v1.0 phase 2"
git push
```

Do not commit `.env.local`.
