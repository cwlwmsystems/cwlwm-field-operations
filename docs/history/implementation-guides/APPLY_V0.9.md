# Apply Cwlwm Field Operations v0.9

Use this update on top of your committed, working v0.8 checkout.

## Apply

```powershell
git status
```

Confirm the working tree is clean, stop the dev server with `Ctrl+C`, copy this ZIP into the project root, then run:

```powershell
npm run dev
```

## Test

Open `/reports`. Confirm the overview metrics render. Then verify `/reports/reps`, `/reports/territories`, `/reports/scheduling`, `/reports/lifecycle`, and `/reports/finance`. Create or modify an operational record and confirm the corresponding report changes after navigation/refresh.

## Commit

```powershell
git status
git add .
git commit -m "Add Reporting and Analytics workflow v0.9"
```

## Production note

The local prototype computes analytics in the browser. When Supabase is connected, use secured organization-scoped views or aggregate tables for higher-volume reporting.
