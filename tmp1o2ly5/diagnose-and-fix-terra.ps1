# Terra Code Windows Fix Script
Write-Host "=== Terra Code Windows Diagnostic & Fix Script ===" -ForegroundColor Green

# Get npm paths
$npmPrefix = npm config get prefix
$terraPackagePath = "$npmPrefix\node_modules\@terra-code\terra-code"
$terraJsPath = "$terraPackagePath\terra.js"

Write-Host "Npm prefix: $npmPrefix" -ForegroundColor Yellow
Write-Host "Terra package path: $terraPackagePath" -ForegroundColor Yellow

# Check if terra.js exists
if (Test-Path $terraJsPath) {
    Write-Host "SUCCESS: terra.js found at: $terraJsPath" -ForegroundColor Green
    $terraSize = (Get-Item $terraJsPath).Length / 1MB
    Write-Host "   Size: $([math]::Round($terraSize, 2)) MB" -ForegroundColor Cyan
} else {
    Write-Host "ERROR: terra.js NOT found at: $terraJsPath" -ForegroundColor Red
    Write-Host "   Package may not be installed correctly" -ForegroundColor Red
    exit 1
}

# Check for existing terra commands in npm directory
$terraFiles = Get-ChildItem $npmPrefix -Name "*terra*"
if ($terraFiles) {
    Write-Host "Existing terra files in npm directory:" -ForegroundColor Yellow
    $terraFiles | ForEach-Object { Write-Host "   $_" -ForegroundColor Cyan }
} else {
    Write-Host "ERROR: No terra command wrappers found in npm directory" -ForegroundColor Red
}

# Check if npm bin is in PATH
$pathEntries = $env:PATH -split ';'
$npmInPath = $pathEntries | Where-Object { $_ -eq $npmPrefix }
if ($npmInPath) {
    Write-Host "SUCCESS: npm directory is in PATH" -ForegroundColor Green
} else {
    Write-Host "ERROR: npm directory is NOT in PATH" -ForegroundColor Red
    Write-Host "   Adding npm directory to PATH..." -ForegroundColor Yellow
    $env:PATH += ";$npmPrefix"
    Write-Host "SUCCESS: Added to current session PATH" -ForegroundColor Green
}

# Test if terra command works now
Write-Host "Testing terra command..." -ForegroundColor Yellow
try {
    $terraResult = & terra --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: terra command works!" -ForegroundColor Green
        Write-Host "   Version: $terraResult" -ForegroundColor Cyan
    } else {
        throw "Command failed"
    }
} catch {
    Write-Host "ERROR: terra command still not working" -ForegroundColor Red
    
    # Try running terra.js directly
    Write-Host "Testing direct execution..." -ForegroundColor Yellow
    try {
        $directResult = & node $terraJsPath --version 2>&1
        Write-Host "SUCCESS: Direct execution works!" -ForegroundColor Green
        Write-Host "   Output: $directResult" -ForegroundColor Cyan
        
        # Create manual terra.cmd wrapper
        Write-Host "Creating terra.cmd wrapper..." -ForegroundColor Yellow
        $cmdContent = "@echo off`nnode `"$terraJsPath`" %*"
        $cmdPath = "$npmPrefix\terra.cmd"
        $cmdContent | Out-File -FilePath $cmdPath -Encoding ASCII
        Write-Host "SUCCESS: Created: $cmdPath" -ForegroundColor Green
        
        # Test the wrapper
        Write-Host "Testing terra.cmd wrapper..." -ForegroundColor Yellow
        try {
            $wrapperResult = & "$cmdPath" --version 2>&1
            Write-Host "SUCCESS: terra.cmd wrapper works!" -ForegroundColor Green
            Write-Host "   Output: $wrapperResult" -ForegroundColor Cyan
        } catch {
            Write-Host "ERROR: terra.cmd wrapper failed" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "ERROR: Direct execution failed: $_" -ForegroundColor Red
    }
}

# Final instructions
Write-Host "=== SUMMARY ===" -ForegroundColor Green
Write-Host "1. Try running: terra --version" -ForegroundColor Cyan
Write-Host "2. If that doesn't work, try: terra.cmd --version" -ForegroundColor Cyan
Write-Host "3. If still not working, run directly: node `"$terraJsPath`"" -ForegroundColor Cyan
Write-Host "4. You may need to restart PowerShell for PATH changes to take effect" -ForegroundColor Yellow

Write-Host "Script completed!" -ForegroundColor Green 