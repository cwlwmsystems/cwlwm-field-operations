# Apply Cwlwm Field Operations v0.7

Use this update on top of your committed, working v0.6 checkout.

## 1. Stop the dev server

Press `Ctrl+C`.

## 2. Confirm v0.6 is committed

```powershell
git status
```

Your working tree should be clean.

## 3. Apply the update

Copy everything from this ZIP into the root of your existing
`cwlwm-field-operations` project and allow Windows to replace matching files.

## 4. Start the app

```powershell
npm run dev
```

No Supabase connection is required.

## 5. Confirm local-data migration

Open:

```text
http://localhost:3000/lifecycle
```

Orders created in v0.5/v0.6 should automatically show a **Submitted** lifecycle stage.

v0.7 stores local state under:

```text
cwlwm-platform-data:v0.7
```

It automatically upgrades v0.6, v0.5, or v0.4 data when needed.

## 6. Test lifecycle configuration

Open:

```text
http://localhost:3000/admin/lifecycle
```

Test:

1. Review the synthetic `Demo CRM` integration.
2. Create another integration.
3. Create/edit a lifecycle stage.
4. Create a status mapping such as:
   - External status: `PROVISIONED`
   - Lifecycle stage: `Activated`
5. Confirm mappings persist after refresh.

## 7. Test one order

Open `/lifecycle`, then open one order.

### Manual lifecycle test

1. Select `Accepted`.
2. Enter an optional note.
3. Click **Record stage**.
4. Confirm the timeline updates.

### External mapping test

1. Select `Demo CRM`.
2. Enter an external order ID, for example `CRM-10001`.
3. Save the external ID.
4. Enter external status `INSTALLED`.
5. Click **Process simulated event**.
6. Confirm the current lifecycle becomes `Installed`.

## 8. Test unmapped status handling

On the same order enter:

```text
UNKNOWN_STATUS
```

and process it.

The app should NOT silently change the lifecycle.

Instead it should create an **unmapped status** exception.

Open:

```text
/lifecycle/exceptions
```

and resolve or dismiss the exception.

## 9. Test duplicate-event design

Synthetic simulator events receive unique event IDs. The underlying local store
also checks an external event ID before adding an integration lifecycle event.

The production database should enforce this with a unique constraint as well.

## 10. Commit after verification

```powershell
git status
git add .
git commit -m "Add Lifecycle and Integrations workflow v0.7"
```

## Production note

The local integration simulator is intentionally not a real CRM connector.
When Supabase and external credentials are available, the same concepts will
move to authenticated connector/webhook ingestion backed by:

- `integrations`
- `lifecycle_stages`
- `external_records`
- `order_lifecycle_events`

Unknown or invalid external states should continue to fail safely into the
exception queue rather than silently mutating orders.
