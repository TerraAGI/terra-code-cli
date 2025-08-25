# Check what's actually in the npm package
$npmPrefix = npm config get prefix
$terraPackagePath = "$npmPrefix\node_modules\@terra-code\terra-code"

Write-Host "=== Checking Terra Code Package Contents ===" -ForegroundColor Green
Write-Host "Package path: $terraPackagePath" -ForegroundColor Yellow

if (Test-Path $terraPackagePath) {
    Write-Host "Package directory exists!" -ForegroundColor Green
    
    Write-Host "`nContents of package directory:" -ForegroundColor Yellow
    Get-ChildItem $terraPackagePath | Format-Table Name, Length, LastWriteTime
    
    Write-Host "`nLooking for terra.js files:" -ForegroundColor Yellow
    Get-ChildItem $terraPackagePath -Recurse -Name "*terra*" | ForEach-Object { 
        Write-Host "  $_" -ForegroundColor Cyan 
    }
    
    Write-Host "`nChecking package.json:" -ForegroundColor Yellow
    $packageJsonPath = "$terraPackagePath\package.json"
    if (Test-Path $packageJsonPath) {
        $packageJson = Get-Content $packageJsonPath | ConvertFrom-Json
        Write-Host "  name: $($packageJson.name)" -ForegroundColor Cyan
        Write-Host "  version: $($packageJson.version)" -ForegroundColor Cyan
        Write-Host "  main: $($packageJson.main)" -ForegroundColor Cyan
        Write-Host "  bin: $($packageJson.bin | ConvertTo-Json -Compress)" -ForegroundColor Cyan
    }
    
    Write-Host "`nChecking dist directory:" -ForegroundColor Yellow
    $distPath = "$terraPackagePath\dist"
    if (Test-Path $distPath) {
        Write-Host "  dist directory exists!" -ForegroundColor Green
        Get-ChildItem $distPath -Name "*terra*" | ForEach-Object { 
            Write-Host "    dist\$_" -ForegroundColor Cyan 
        }
    } else {
        Write-Host "  dist directory does NOT exist!" -ForegroundColor Red
    }
    
} else {
    Write-Host "ERROR: Package directory does not exist!" -ForegroundColor Red
} 