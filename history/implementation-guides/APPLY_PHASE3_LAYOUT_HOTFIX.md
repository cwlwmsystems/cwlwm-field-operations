# Phase 3 Layout Hotfix

This fixes the malformed provider nesting in `app/layout.tsx`.

## Apply

1. Stop Next.js with `Ctrl+C`.
2. Copy this package into the project root and replace `app/layout.tsx`.
3. Restart:

```powershell
npm run dev
```

Correct provider nesting is:

```tsx
<AuthProvider>
  <PlatformStoreProvider>
    <SupabaseConfigProvider>
      <SupabaseTerritoryOpsProvider>
        {children}
      </SupabaseTerritoryOpsProvider>
    </SupabaseConfigProvider>
  </PlatformStoreProvider>
</AuthProvider>
```
