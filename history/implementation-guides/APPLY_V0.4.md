# Apply Cwlwm Field Operations v0.4

Use this package on top of your committed, working v0.3 checkout.

## 1. Stop the dev server

Press `Ctrl+C` in the terminal running Next.js.

## 2. Confirm v0.3 is committed

```powershell
git status
```

Your working tree should be clean before applying v0.4.

## 3. Copy this update into the project root

Copy all files/folders from this ZIP into your existing:

```text
cwlwm-field-operations
```

Allow Windows to replace the existing v0.3 files.

## 4. Start the app

```powershell
npm run dev
```

No Supabase project is required.

## 5. Test the admin workflow

Open:

```text
http://localhost:3000/admin
```

Then test:

1. Create a new team.
2. Create a new market.
3. Create a territory and assign the new team.
4. Add a representative and assign the representative to the territory.
5. Create/edit a disposition.
6. Add a location assigned to the territory.
7. Visit `/territories` and confirm the new territory appears.
8. Open the territory and confirm the rep/location appear.
9. Open the location and record an interaction.
10. Refresh and confirm local configuration persists.

## 6. Test CSV import

Admin → Locations / Import accepts CSV headers such as:

```csv
external_id,address,city,state,postal_code,territory
DEMO-20001,10 Test Street,Exampleton,PA,16901,North District
```

## 7. Commit when verified

```powershell
git status
git add .
git commit -m "Add Admin and Configuration workflow v0.4"
```

## Local persistence

v0.4 configuration is saved under:

```text
cwlwm-platform-data:v0.4
```

in browser localStorage.

The Admin overview contains a **Reset Demo Data** button if you need to return to the synthetic defaults.
