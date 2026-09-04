Write-Host "=== Phase 9 production scan ===" -ForegroundColor Cyan

Write-Host "`nTracked env files:"
git ls-files | Select-String "\.env"

Write-Host "`nService-role references:"
git grep -n "service_role" -- . ':!docs' 2>$null

Write-Host "`nActive mock/store imports:"
git grep -n -E 'lib/mock|lib/store/platformStore|NEXT_PUBLIC_USE_MOCK_DATA|localStorage' -- app components lib ':!lib/mock/**' ':!lib/store/platformStore.tsx' 2>$null

Write-Host "`nGit status:"
git status --short

Write-Host "`nRun production build next:" -ForegroundColor Yellow
Write-Host "npm run build"
