# Example script showing proper PowerShell commands
# Using Set-Location instead of cd (alias) as recommended by PSScriptAnalyzer
Set-Location -Path "$HOME"
Get-ChildItem
Write-Output "Current location: $(Get-Location)"
Get-Process | Select-Object -First 5 Name, CPU

# Example function for navigation with approved verb (Set- instead of Navigate-)
function Set-ProjectLocation {
    param (
        [string]$ProjectName
    )
    
    $projectPath = Join-Path -Path "$HOME\Projects" -ChildPath $ProjectName
    
    if (Test-Path -Path $projectPath) {
        Set-Location -Path $projectPath
        Write-Output "Navigated to $ProjectName project"
    } else {
        Write-Error "Project $ProjectName not found at $projectPath"
    }
}

# Example of proper error handling
try {
    $data = Get-Content -Path "config.json" -ErrorAction Stop | ConvertFrom-Json
    # Using the $data variable to avoid PSUseDeclaredVarsMoreThanAssignments warning
    Write-Output "Configuration loaded successfully with $($data.Count) settings"
} catch {
    Write-Error "Failed to load configuration: $_"
} 