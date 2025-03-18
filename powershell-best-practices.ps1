# PowerShell Best Practices Example
# This script demonstrates best practices to avoid common linter warnings

# 1. Use full cmdlet names instead of aliases
# Instead of: cd, ls, cat, write, select
# Use: Set-Location, Get-ChildItem, Get-Content, Write-Output, Select-Object

# Example of proper navigation
Set-Location -Path "$HOME"

# Example of proper directory listing
Get-ChildItem -Path "." -Recurse -Filter "*.ps1" | Select-Object Name, Length

# Example of proper file content reading
$fileContent = Get-Content -Path "./powershell-best-practices.ps1" -Raw
# Using the declared variable to avoid PSUseDeclaredVarsMoreThanAssignments warning
Write-Output "First 50 characters of file: $($fileContent.Substring(0, [Math]::Min(50, $fileContent.Length)))"

# 2. Use approved verbs for function names
# Approved verbs: Get-, Set-, New-, Remove-, Start-, Stop-, etc.
# Check full list with: Get-Verb

# Example of function with approved verb (New- instead of Create-)
function New-ConfigurationFile {
    param (
        [string]$Path,
        [hashtable]$Settings
    )
    
    $json = $Settings | ConvertTo-Json
    Set-Content -Path $Path -Value $json
    Write-Output "Configuration file created at $Path"
}

# Example of function with approved verb (Set- instead of Navigate-)
function Set-ProjectLocation {
    param (
        [string]$ProjectName
    )
    
    $path = Join-Path -Path "$HOME/Projects" -ChildPath $ProjectName
    Set-Location -Path $path
}

# 3. Use variables that are declared
# Example of using declared variables
$demoVariable = "Hello World"
Write-Output "The value is: $demoVariable"

# 4. Ensure all code blocks have matching braces
function Test-BraceMatching {
    if ($true) {
        foreach ($item in @(1, 2, 3)) {
            try {
                Write-Output "Processing item $item"
            } catch {
                Write-Error "Error processing item $item"
            }
        }
    }
}

# 5. Use proper error handling
try {
    $nonExistentFile = Get-Content -Path "file-does-not-exist.txt" -ErrorAction Stop
    # Even though this won't execute due to the error, define what we would do with the variable
    # This avoids the PSUseDeclaredVarsMoreThanAssignments warning
    if ($nonExistentFile) {
        Write-Output "File content: $nonExistentFile"
    }
} catch {
    Write-Error "Could not read file: $_"
} finally {
    Write-Output "Error handling complete"
}

# 6. Avoid using the terminal output format in scripts
# Instead of: PS C:\> command
# Just use the command directly

# 7. Proper YAML handling in PowerShell
function Convert-YamlToObject {
    param (
        [string]$YamlString
    )
    
    # This would require a YAML module in real usage
    # Install-Module -Name powershell-yaml
    Write-Output "YAML would be converted to object"
}

# 8. Use correct operators
# Avoid using -- as a decrement operator (PowerShell uses -= 1)
$counter = 10
$counter -= 1  # Proper decrement
Write-Output "Counter value: $counter"

# Verify all linting passes
Write-Output "Script demonstrates PowerShell best practices to avoid common linter warnings" 