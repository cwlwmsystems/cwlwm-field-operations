# Phase 9 build-fix package

This package incorporates the production-build fixes identified during Phase 9:

- invoice detail uses a narrowed `currentBatch`
- finance list gets currency from `finance.settings`
- invoice Blob export converts `Uint8Array` to `ArrayBuffer`
- sales `submitOrder` explicitly returns `DemoOrder` and narrows order/review statuses
- package version updated to `1.0.0-phase9`
- CSS `align-items:end` warning changed to `flex-end`

Run:

```powershell
npm run build
```
