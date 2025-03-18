# YAML Validation Script for ProxyEthica
# This script follows PowerShell best practices (no aliases)

# Function to check YAML files for duplicate keys
function Test-YamlForDuplicateKeys {
    param (
        [Parameter(Mandatory = $true)]
        [string]$YamlFilePath
    )
    
    if (-not (Test-Path -Path $YamlFilePath)) {
        Write-Error "File not found: $YamlFilePath"
        return $false
    }
    
    $content = Get-Content -Path $YamlFilePath -Raw
    $lines = Get-Content -Path $YamlFilePath
    $lineCount = $lines.Count
    
    Write-Output "Analyzing YAML file: $YamlFilePath ($lineCount lines)"
    Write-Output "File size: $($content.Length) bytes"
    
    # Simple parsing to find duplicate keys at the same level
    $urlPatterns = @{}
    $lineNumber = 0
    $inHandlersSection = $false
    
    foreach ($line in $lines) {
        $lineNumber++
        
        # Track if we're in the handlers section
        if ($line -match "^\s*handlers:") {
            $inHandlersSection = $true
            continue
        }
        
        # If line starts with a different root key, we're out of handlers
        if ($inHandlersSection -and $line -match "^\s*\w+:" -and $line -notmatch "^\s*-") {
            $inHandlersSection = $false
        }
        
        # Looking for URL patterns in handlers section
        if ($inHandlersSection -and $line -match "^\s*-\s*url:\s*(.+)$") {
            $urlPattern = $Matches[1].Trim()
            
            if ($urlPatterns.ContainsKey($urlPattern)) {
                Write-Output "WARNING: Duplicate URL pattern found: $urlPattern"
                Write-Output "  - First occurrence: Line $($urlPatterns[$urlPattern])"
                Write-Output "  - Duplicate: Line $lineNumber"
                return $false
            } else {
                $urlPatterns[$urlPattern] = $lineNumber
            }
        }
    }
    
    Write-Output "No duplicate keys found in YAML file."
    return $true
}

# Function to fix duplicate keys in a YAML file
function Repair-YamlDuplicateKeys {
    param (
        [Parameter(Mandatory = $true)]
        [string]$YamlFilePath,
        
        [Parameter(Mandatory = $false)]
        [string]$OutputPath
    )
    
    if (-not $OutputPath) {
        $OutputPath = "$YamlFilePath.fixed"
    }
    
    if (-not (Test-Path -Path $YamlFilePath)) {
        Write-Error "File not found: $YamlFilePath"
        return
    }
    
    $lines = Get-Content -Path $YamlFilePath
    $lineCount = $lines.Count
    
    Write-Output "Fixing YAML file: $YamlFilePath ($lineCount lines)"
    
    # Track URL patterns to detect duplicates
    $urlPatterns = @{}
    $outputLines = @()
    $lineNumber = 0
    $inHandlersSection = $false
    $skipNextLines = $false
    $skipCount = 0
    
    foreach ($line in $lines) {
        $lineNumber++
        
        # Track if we're in the handlers section
        if ($line -match "^\s*handlers:") {
            $inHandlersSection = $true
            $outputLines += $line
            continue
        }
        
        # If we're skipping a block, count down
        if ($skipNextLines) {
            $skipCount--
            if ($skipCount -le 0) {
                $skipNextLines = $false
            }
            continue
        }
        
        # If line starts with a different root key, we're out of handlers
        if ($inHandlersSection -and $line -match "^\s*\w+:" -and $line -notmatch "^\s*-") {
            $inHandlersSection = $false
        }
        
        # Looking for URL patterns in handlers section
        if ($inHandlersSection -and $line -match "^\s*-\s*url:\s*(.+)$") {
            $urlPattern = $Matches[1].Trim()
            
            if ($urlPatterns.ContainsKey($urlPattern)) {
                Write-Output "Removing duplicate URL pattern: $urlPattern at line $lineNumber"
                $skipNextLines = $true
                $skipCount = 2  # Skip this line and the next two (url, secure, script)
                continue
            } else {
                $urlPatterns[$urlPattern] = $lineNumber
                $outputLines += $line
            }
        } else {
            $outputLines += $line
        }
    }
    
    Set-Content -Path $OutputPath -Value $outputLines
    Write-Output "Fixed YAML file written to: $OutputPath"
}

# Main script execution
Write-Output "YAML Validation Tool"
Write-Output "===================="

# Check command-line arguments
if ($args.Count -ge 1) {
    $yamlFile = $args[0]
    
    if (Test-YamlForDuplicateKeys -YamlFilePath $yamlFile) {
        Write-Output "YAML file is valid."
    } else {
        Write-Output "YAML file contains duplicate keys. Fixing..."
        Repair-YamlDuplicateKeys -YamlFilePath $yamlFile -OutputPath "$yamlFile.fixed"
        Write-Output "Please review the fixed file and replace the original if satisfied."
    }
} else {
    Write-Output "Usage: .\validate-yaml.ps1 <path-to-yaml-file>"
    
    # Default behavior - check all YAML files in the project
    $yamlFiles = Get-ChildItem -Path "." -Recurse -Include "*.yaml", "*.yml"
    
    if ($yamlFiles.Count -eq 0) {
        Write-Output "No YAML files found in the current directory."
    } else {
        foreach ($file in $yamlFiles) {
            Write-Output ""
            Write-Output "Checking file: $($file.FullName)"
            Test-YamlForDuplicateKeys -YamlFilePath $file.FullName
        }
    }
} 