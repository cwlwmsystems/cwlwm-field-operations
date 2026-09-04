# Apply Phase 4
1. Confirm `git status` is clean.
2. Stop Next.js.
3. Copy this update over project root.
4. Keep `NEXT_PUBLIC_USE_MOCK_DATA=true`.
5. Run `npm run dev`.
6. Test Save Progress from `/sales/new/<location uuid>`.
7. Refresh and resume.
8. Submit an order.
9. Verify Supabase `sales_attempts`, `orders`, and `lifecycle_events`.
10. Test `/admin/sales-review`.
11. Sign out/in and verify persistence.
12. Commit only after all checks pass:

```powershell
git status
git add .
git commit -m "Move sales to Supabase v1.0 phase 4"
git push
```
