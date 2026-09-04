# Corrected Cwlwm Logo Hotfix

This fixes the earlier logo patch, which did not replace the actual current `<div className="brand-mark">C</div>` markup.

Changes:
- replaces the `C` with the Cwlwm knot
- creates a 1024×1024 transparent logo from the supplied original asset
- removes the white background
- enlarges the sidebar logo
- keeps desktop and mobile sizing responsive

Apply the ZIP over the project root, then run:

```powershell
npm run build
npm run dev
```
