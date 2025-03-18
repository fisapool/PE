# ProxyEthica Extension Restructuring Script

# Create directory structure if it doesn't exist
function New-DirectoryStructure {
    $directories = @(
        "src/components",
        "src/services",
        "src/utils",
        "src/background",
        "src/popup"
    )
    
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            Write-Output "Creating directory: $dir"
            New-Item -Path $dir -ItemType Directory -Force | Out-Null
        }
    }
}

# Move files to appropriate locations
function Move-FilesToStructure {
    # Background script files
    if (Test-Path "background.js") {
        Write-Output "Moving background.js to src/background/"
        Move-Item -Path "background.js" -Destination "src/background/index.js" -Force
    }
    
    # Popup files
    if (Test-Path "popup.js") {
        Write-Output "Moving popup.js to src/popup/"
        Move-Item -Path "popup.js" -Destination "src/popup/index.js" -Force
    }
    if (Test-Path "popup.html") {
        Write-Output "Moving popup.html to src/popup/"
        Move-Item -Path "popup.html" -Destination "src/popup/index.html" -Force
    }
    
    # Service files
    $serviceFiles = @(
        "proxy-service.js",
        "firebase-auth-service.js",
        "firebase-db.js",
        "credit-service.js"
    )
    
    foreach ($file in $serviceFiles) {
        if (Test-Path $file) {
            Write-Output "Moving $file to src/services/"
            $newFileName = $file -replace "-", ""
            Move-Item -Path $file -Destination "src/services/$newFileName" -Force
        }
    }
    
    # Utility files
    $utilFiles = @(
        "firebase-config.js",
        "redirect.js"
    )
    
    foreach ($file in $utilFiles) {
        if (Test-Path $file) {
            Write-Output "Moving $file to src/utils/"
            Move-Item -Path $file -Destination "src/utils/" -Force
        }
    }
}

# Update import paths in files
function Update-ImportPaths {
    $files = Get-ChildItem -Path "src" -Recurse -Include "*.js"
    
    foreach ($file in $files) {
        $content = Get-Content -Path $file.FullName -Raw
        
        # Update relative imports - fixed regex patterns with proper escaping
        $content = $content -replace 'import (.+) from ["'']\.\/([^"'']+)["'']', 'import $1 from "../$2"'
        $content = $content -replace 'import (.+) from ["'']\.\.\/([^"'']+)["'']', 'import $1 from "../../$2"'
        
        # Update service imports
        $content = $content -replace 'import (.+) from ["''](?:\.\/|\.\.\/)?proxy-service\.js["'']', 'import $1 from "../services/proxyservice.js"'
        $content = $content -replace 'import (.+) from ["''](?:\.\/|\.\.\/)?firebase-auth-service\.js["'']', 'import $1 from "../services/firebaseauthservice.js"'
        
        Set-Content -Path $file.FullName -Value $content
    }
}

# Update manifest.json
function Update-Manifest {
    if (Test-Path "manifest.json") {
        $manifest = Get-Content -Path "manifest.json" -Raw | ConvertFrom-Json
        
        if ($manifest.background -and $manifest.background.scripts) {
            $manifest.background.scripts = @("src/background/index.js")
        }
        
        if ($manifest.browser_action -and $manifest.browser_action.default_popup) {
            $manifest.browser_action.default_popup = "src/popup/index.html"
        }
        
        $manifest | ConvertTo-Json -Depth 10 | Set-Content -Path "manifest.json"
    }
}

# Main execution
Write-Output "Starting ProxyEthica extension restructuring..."
New-DirectoryStructure
Move-FilesToStructure
Update-ImportPaths
Update-Manifest
Write-Output "Restructuring complete!"
