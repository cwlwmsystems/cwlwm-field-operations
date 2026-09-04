# Apply v1.0 App Integration — Phase 3

Apply on top of your committed, working Phase 2 project.

## 1. Confirm Git is clean

```powershell
git status
```

## 2. Stop Next.js

Press `Ctrl+C`.

## 3. Apply update

Copy all files from this ZIP into the project root and replace matching files.

## 4. Keep mock mode enabled

```env
NEXT_PUBLIC_USE_MOCK_DATA=true
```

This remains intentional for Sales and downstream transactional modules.

## 5. Start

```powershell
npm run dev
```

## 6. Test territories

Open:

```text
/territories
```

Open a territory. Confirm its Supabase reps and locations appear.

## 7. Test a field interaction

Open a location.

Record a disposition such as:

```text
Not Home
```

Save it.

Then:

1. Confirm the timeline updates.
2. Refresh the browser.
3. Confirm the interaction remains.
4. Open Supabase Table Editor → `location_interactions`.
5. Confirm the new row exists.
6. Open `locations`.
7. Confirm `current_disposition_id` matches the chosen disposition.

## 8. Test a follow-up disposition

Use `Interested`.

Enter a note and follow-up time.

Confirm:

- the note persists
- `follow_up_needed` is true
- `follow_up_at` is populated
- the timeline survives refresh

## 9. Test sign-out persistence

Sign out, sign back in, return to the location, and verify its interaction timeline reloads from Supabase.

## 10. Verify sales remains intact

Click **Start Sale** from the location.

The existing sales workflow should still open. Its transaction remains local until Phase 4.

## 11. Commit after verification

```powershell
git status
git add .
git commit -m "Move territory operations to Supabase v1.0 phase 3"
git push
```

Do not commit `.env.local`.
