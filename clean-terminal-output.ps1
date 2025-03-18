# Script to clean up terminal output from PowerShell scripts
# Following PowerShell best practices with approved verbs and no aliases

function Remove-TerminalOutput {
    param (
        [Parameter(Mandatory = $true)]
        [string]$ScriptPath,
        
        [Parameter(Mandatory = $false)]
        [string]$OutputPath
    )
    
    if (-not $OutputPath) {
        $OutputPath = "$ScriptPath.cleaned.ps1"
    }
    
    if (-not (Test-Path -Path $ScriptPath)) {
        Write-Error "Script not found: $ScriptPath"
        return
    }
    
    Write-Output "Cleaning terminal output from: $ScriptPath"
    
    $lines = Get-Content -Path $ScriptPath
    $cleanedLines = @()
    $insideTerminalBlock = $false
    
    foreach ($line in $lines) {
        # Skip lines that look like terminal prompts or table output
        if ($line -match "^PS \w:.*>" -or    # PowerShell prompt
            $line -match "^\s*PS \w:.*>" -or # Indented PowerShell prompt
            $line -match "^\s*\| .*\|$" -or  # Table border line
            $line -match "^\s*\|[-]+\|[-]+\|$" -or # Table separator line
            $line -match "^\s*\[\w+\]" -or   # Command output indicators
            $line -match "^\s*--" -or        # Command output separator
            $line -match "^\s*Command completed\." -or
            ($line -match "^[\s\-=]+$" -and $line.Length -gt 20)) { # Long separator lines
            # Skip these lines as they're likely terminal output
            continue
        }
        
        # Check for the beginning of a terminal output block
        if ($line -match "^Command output:$" -or 
            $line -match "^Exit code: \d+$" -or
            $line -match "^Starting command execution" -or
            $line -match "^```$") {
            $insideTerminalBlock = !$insideTerminalBlock
            continue
        }
        
        # If we're inside a terminal output block, skip the line
        if ($insideTerminalBlock) {
            continue
        }
        
        # If it's not terminal output, keep the line
        $cleanedLines += $line
    }
    
    # Save the cleaned content
    Set-Content -Path $OutputPath -Value $cleanedLines
    Write-Output "Cleaned script saved to: $OutputPath"
}

function Remove-MarkdownFormatting {
    param (
        [Parameter(Mandatory = $true)]
        [string]$ScriptPath,
        
        [Parameter(Mandatory = $false)]
        [string]$OutputPath
    )
    
    if (-not $OutputPath) {
        $OutputPath = "$ScriptPath.cleaned.ps1"
    }
    
    if (-not (Test-Path -Path $ScriptPath)) {
        Write-Error "Script not found: $ScriptPath"
        return
    }
    
    Write-Output "Removing Markdown formatting from: $ScriptPath"
    
    $content = Get-Content -Path $ScriptPath -Raw
    
    # Remove markdown code blocks
    $content = $content -replace '```powershell\r?\n', ''
    $content = $content -replace '```ps1\r?\n', ''
    $content = $content -replace '```\r?\n', ''
    $content = $content -replace '```', ''
    
    # Remove Markdown table formatting
    $content = $content -replace '\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|', '$1 $2 $3'
    $content = $content -replace '\|[-]+\|[-]+\|[-]+\|', ''
    
    # Save the cleaned content
    Set-Content -Path $OutputPath -Value $content
    Write-Output "Markdown formatting removed, saved to: $OutputPath"
}

function Fix-PowerShellTableData {
    param (
        [Parameter(Mandatory = $true)]
        [string]$ScriptPath,
        
        [Parameter(Mandatory = $false)]
        [string]$OutputPath
    )
    
    if (-not $OutputPath) {
        $OutputPath = "$ScriptPath.fixed.ps1"
    }
    
    if (-not (Test-Path -Path $ScriptPath)) {
        Write-Error "Script not found: $ScriptPath"
        return
    }
    
    Write-Output "Converting Markdown table to PowerShell hashtable array in: $ScriptPath"
    
    $lines = Get-Content -Path $ScriptPath
    $inTable = $false
    $headers = @()
    $tableData = @()
    $outputLines = @()
    
    foreach ($line in $lines) {
        # Detect table header
        if ($line -match '^\s*\|\s*(\w+)\s*\|\s*(\w+)\s*\|\s*(.+?)\s*\|') {
            $headers = @($Matches[1], $Matches[2], $Matches[3])
            $inTable = $true
            # Add header comment to script
            $outputLines += "# Project Status Data ($($headers -join ', '))"
            $outputLines += '$projectComponents = @('
            continue
        }
        
        # Skip table formatting lines
        if ($line -match '^\s*\|\s*[-]+\s*\|\s*[-]+\s*\|\s*[-]+\s*\|') {
            continue
        }
        
        # Process table data rows
        if ($inTable -and $line -match '^\s*\|\s*(.+?)\s*\|\s*(\d+%?)\s*\|\s*(.+?)\s*\|') {
            $name = $Matches[1].Trim()
            $status = $Matches[2].Trim().TrimEnd('%')
            $details = $Matches[3].Trim()
            
            $tableData += "    @{Name=`"$name`"; Status=$status; Details=`"$details`"}"
            continue
        }
        
        # End of table
        if ($inTable -and -not ($line -match '^\s*\|')) {
            $inTable = $false
            # Add closing bracket for array
            $outputLines += $tableData
            $outputLines += ')'
            $outputLines += ''
        }
        
        # If not in table, keep original line
        if (-not $inTable) {
            $outputLines += $line
        }
    }
    
    # Handle case where table is at the end of the file
    if ($inTable) {
        $outputLines += $tableData
        $outputLines += ')'
    }
    
    # Save the fixed content
    Set-Content -Path $OutputPath -Value $outputLines
    Write-Output "Table data converted to PowerShell hashtable, saved to: $OutputPath"
}

# Main script execution
Write-Output "Terminal Output Cleanup Tool"
Write-Output "==========================="

# Check command-line arguments
if ($args.Count -ge 1) {
    $scriptFile = $args[0]
    
    if (-not (Test-Path -Path $scriptFile)) {
        Write-Error "Script file not found: $scriptFile"
        exit 1
    }
    
    $operation = if ($args.Count -ge 2) { $args[1] } else { "all" }
    
    switch ($operation) {
        "terminal" {
            Remove-TerminalOutput -ScriptPath $scriptFile
        }
        "markdown" {
            Remove-MarkdownFormatting -ScriptPath $scriptFile
        }
        "table" {
            Fix-PowerShellTableData -ScriptPath $scriptFile
        }
        "all" {
            $tempFile1 = "$scriptFile.temp1"
            $tempFile2 = "$scriptFile.temp2"
            Remove-TerminalOutput -ScriptPath $scriptFile -OutputPath $tempFile1
            Remove-MarkdownFormatting -ScriptPath $tempFile1 -OutputPath $tempFile2
            Fix-PowerShellTableData -ScriptPath $tempFile2 -OutputPath "$scriptFile.cleaned.ps1"
            Remove-Item -Path $tempFile1 -Force
            Remove-Item -Path $tempFile2 -Force
            Write-Output "All cleaning operations completed, saved to: $scriptFile.cleaned.ps1"
        }
        default {
            Write-Output "Unknown operation: $operation"
            Write-Output "Valid operations: terminal, markdown, table, all"
        }
    }
} else {
    Write-Output "Usage: .\clean-terminal-output.ps1 <path-to-script> [operation]"
    Write-Output "Operations:"
    Write-Output "  - terminal: Remove terminal prompts and command output"
    Write-Output "  - markdown: Remove Markdown formatting"
    Write-Output "  - table: Convert Markdown tables to PowerShell hashtables"
    Write-Output "  - all: Apply all cleaning operations (default)"
    
    Write-Output ""
    Write-Output "Examples:"
    Write-Output "  .\clean-terminal-output.ps1 script-with-terminal-output.ps1             # Apply all cleaning"
    Write-Output "  .\clean-terminal-output.ps1 script-with-tables.ps1 table               # Only fix tables"
} 