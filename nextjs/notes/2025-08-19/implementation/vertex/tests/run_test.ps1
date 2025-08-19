# PowerShell script to run GCP Setup Test with proper environment
# This script ensures the .env file is loaded correctly

Write-Host "🔍 GCP Setup Test Runner" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

# Define the path to your .env file
$envPath = "C:\Users\ktrua\OneDrive\Desktop\Code-tutorials\adk-fullstack-deploy-tutorial\app\.env"

# Check if .env file exists
if (Test-Path $envPath) {
    Write-Host "✓ Found .env file at: $envPath" -ForegroundColor Green
    
    # Read and set environment variables from .env file
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remove quotes if present
            $value = $value -replace '^["'']|["'']$', ''
            
            # Set the environment variable for this PowerShell session
            [System.Environment]::SetEnvironmentVariable($name, $value, [System.EnvironmentVariableTarget]::Process)
            Write-Host "  Set $name" -ForegroundColor Gray
        }
    }
    Write-Host "✓ Environment variables loaded" -ForegroundColor Green
} else {
    Write-Host "✗ .env file not found at: $envPath" -ForegroundColor Red
    exit 1
}

# Navigate to the test directory
$testDir = "C:\Users\ktrua\OneDrive\Desktop\Code-tutorials\adk-fullstack-deploy-tutorial\nextjs\notes\2025-08-19\implementation\vertex"
Set-Location $testDir
Write-Host "✓ Changed to test directory: $testDir" -ForegroundColor Green

# Check if Python is available
if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "✓ Python is available" -ForegroundColor Green
} else {
    Write-Host "✗ Python is not available" -ForegroundColor Red
    exit 1
}

# Install requirements if needed
Write-Host "`nInstalling requirements..." -ForegroundColor Yellow
python -m pip install -q -r test_requirements.txt
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Requirements installed" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install requirements" -ForegroundColor Red
    Write-Host "  Try: pip install python-dotenv" -ForegroundColor Yellow
}

# Run the test script
Write-Host "`n🚀 Running GCP Setup Test..." -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
python test_gcp_setup.py

# Check exit code
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Test completed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Test failed. Please review the errors above." -ForegroundColor Red
}
