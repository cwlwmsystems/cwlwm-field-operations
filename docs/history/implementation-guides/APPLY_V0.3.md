# Apply v0.3 to an existing v0.2 checkout

1. Stop `npm run dev` if it is running.
2. Make sure your v0.2 working tree is committed.
3. Copy the contents of this update package into the root of your existing
   `cwlwm-field-operations` project, allowing these files to replace the v0.2 versions.
4. Run:

```powershell
npm run dev
```

5. Test:
   - `/territories`
   - `/territories/terr_north`
   - `/locations`
   - `/locations/loc_1`

6. Add an interaction on `/locations/loc_1`.
7. Refresh the browser. The new mock interaction should remain because v0.3
   stores locally-added mock interactions in browser `localStorage`.
8. When satisfied:

```powershell
git status
git add .
git commit -m "Add Territory Operations workflow v0.3"
```

No Supabase connection is required for this milestone.
