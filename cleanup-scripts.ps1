# Script to clean up PowerShell files and fix common linting errors
# Following PowerShell best practices with approved verbs and no aliases

# Function to replace PowerShell aliases with full cmdlet names
function Update-ScriptAliases {
    param (
        [Parameter(Mandatory = $true)]
        [string]$ScriptPath
    )
    
    if (-not (Test-Path -Path $ScriptPath)) {
        Write-Error "Script not found: $ScriptPath"
        return
    }
    
    Write-Output "Updating aliases in: $ScriptPath"
    
    $content = Get-Content -Path $ScriptPath -Raw
    
    # Define a mapping of common aliases to their full cmdlet names
    $aliasMapping = @{
        'cd'      = 'Set-Location'
        'ls'      = 'Get-ChildItem'
        'dir'     = 'Get-ChildItem'
        'cat'     = 'Get-Content'
        'type'    = 'Get-Content'
        'echo'    = 'Write-Output'
        'write'   = 'Write-Output'
        'select'  = 'Select-Object'
        'sort'    = 'Sort-Object'
        'where'   = 'Where-Object'
        'group'   = 'Group-Object'
        'ft'      = 'Format-Table'
        'fl'      = 'Format-List'
        'gm'      = 'Get-Member'
        'clc'     = 'Clear-Content'
        'clear'   = 'Clear-Host'
        'cp'      = 'Copy-Item'
        'mv'      = 'Move-Item'
        'rm'      = 'Remove-Item'
        'del'     = 'Remove-Item'
        'ps'      = 'Get-Process'
        'kill'    = 'Stop-Process'
        'sleep'   = 'Start-Sleep'
        'iwr'     = 'Invoke-WebRequest'
        'curl'    = 'Invoke-WebRequest'
        'wget'    = 'Invoke-WebRequest'
    }
    
    # Replace aliases with full cmdlet names
    foreach ($alias in $aliasMapping.Keys) {
        $pattern = "\b$alias\b"
        $replacement = $aliasMapping[$alias]
        $content = $content -replace $pattern, $replacement
    }
    
    # Remove "PS C:\>" prompts that might be in the script
    $content = $content -replace "PS [A-Z]:\\.*>", ""
    
    # Save the updated content
    Set-Content -Path "$ScriptPath.fixed" -Value $content
    Write-Output "Updated script saved to: $ScriptPath.fixed"
}

# Function to fix unapproved verbs in function names
function Update-FunctionVerbs {
    param (
        [Parameter(Mandatory = $true)]
        [string]$ScriptPath
    )
    
    if (-not (Test-Path -Path $ScriptPath)) {
        Write-Error "Script not found: $ScriptPath"
        return
    }
    
    Write-Output "Updating function verbs in: $ScriptPath"
    
    $content = Get-Content -Path $ScriptPath -Raw
    
    # Define a mapping of common unapproved verbs to approved alternatives
    $verbMapping = @{
        'Create-'     = 'New-'
        'Build-'      = 'New-'
        'Generate-'   = 'New-'
        'Navigate-'   = 'Set-'
        'Launch-'     = 'Start-'
        'Delete-'     = 'Remove-'
        'Kill-'       = 'Stop-'
        'Terminate-'  = 'Stop-'
        'Enumerate-'  = 'Get-'
        'List-'       = 'Get-'
        'Query-'      = 'Search-'
        'Change-'     = 'Set-'
        'Modify-'     = 'Set-'
        'Alter-'      = 'Set-'
        'Execute-'    = 'Invoke-'
        'Run-'        = 'Invoke-'
        'Perform-'    = 'Invoke-'
    }
    
    # Replace unapproved function verbs with approved alternatives
    foreach ($verb in $verbMapping.Keys) {
        $pattern = "function\s+$verb"
        $replacement = "function $($verbMapping[$verb])"
        $content = $content -replace $pattern, $replacement
    }
    
    # Save the updated content
    Set-Content -Path "$ScriptPath.fixed" -Value $content
    Write-Output "Updated script saved to: $ScriptPath.fixed"
}

# Function to fix YAML content accidentally pasted into PowerShell scripts
function Remove-YamlContent {
    param (
        [Parameter(Mandatory = $true)]
        [string]$ScriptPath
    )
    
    if (-not (Test-Path -Path $ScriptPath)) {
        Write-Error "Script not found: $ScriptPath"
        return
    }
    
    Write-Output "Removing YAML content from: $ScriptPath"
    
    $lines = Get-Content -Path $ScriptPath
    $cleanedLines = @()
    $inYamlBlock = $false
    
    foreach ($line in $lines) {
        # Skip lines that look like YAML content
        if ($line -match "^\s*-\s+url:" -or 
            $line -match "^\s*secure:" -or 
            $line -match "^\s*script:" -or
            $line -match "^\s*handlers:" -or
            $line -match "^\s*upload:" -or
            $line -match "^\s*static_dir:" -or
            $line -match "^\s*static_files:") {
            # This looks like YAML content, skip it
            continue
        }
        
        $cleanedLines += $line
    }
    
    # Save the cleaned content
    Set-Content -Path "$ScriptPath.fixed" -Value $cleanedLines
    Write-Output "Cleaned script saved to: $ScriptPath.fixed"
}

# Main script execution
Write-Output "PowerShell Script Cleanup Tool"
Write-Output "============================"

# Check command-line arguments
if ($args.Count -ge 1) {
    $scriptFile = $args[0]
    
    if (-not (Test-Path -Path $scriptFile)) {
        Write-Error "Script file not found: $scriptFile"
        exit 1
    }
    
    $operation = if ($args.Count -ge 2) { $args[1] } else { "all" }
    
    switch ($operation) {
        "aliases" {
            Update-ScriptAliases -ScriptPath $scriptFile
        }
        "verbs" {
            Update-FunctionVerbs -ScriptPath $scriptFile
        }
        "yaml" {
            Remove-YamlContent -ScriptPath $scriptFile
        }
        "all" {
            $tempFile = "$scriptFile.temp"
            Update-ScriptAliases -ScriptPath $scriptFile
            Rename-Item -Path "$scriptFile.fixed" -NewName $tempFile
            Update-FunctionVerbs -ScriptPath $tempFile
            Rename-Item -Path "$tempFile.fixed" -NewName $tempFile
            Remove-YamlContent -ScriptPath $tempFile
            Move-Item -Path "$tempFile.fixed" -Destination "$scriptFile.fixed" -Force
            Remove-Item -Path $tempFile -Force
            Write-Output "All fixes have been applied to: $scriptFile.fixed"
        }
        default {
            Write-Output "Unknown operation: $operation"
            Write-Output "Valid operations: aliases, verbs, yaml, all"
        }
    }
} else {
    Write-Output "Usage: .\cleanup-scripts.ps1 <path-to-script> [operation]"
    Write-Output "Operations:"
    Write-Output "  - aliases: Replace PowerShell aliases with full cmdlet names"
    Write-Output "  - verbs: Fix unapproved verbs in function names"
    Write-Output "  - yaml: Remove YAML content from PowerShell scripts"
    Write-Output "  - all: Apply all fixes (default)"
    
    Write-Output ""
    Write-Output "Examples:"
    Write-Output "  .\cleanup-scripts.ps1 myscript.ps1             # Apply all fixes"
    Write-Output "  .\cleanup-scripts.ps1 myscript.ps1 aliases     # Fix aliases only"
} 