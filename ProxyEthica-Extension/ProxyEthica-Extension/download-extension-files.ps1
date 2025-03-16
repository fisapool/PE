# Download all extension files

# Create directory structure
New-Item -ItemType Directory -Force -Path ".\ProxyEthica-Extension"
New-Item -ItemType Directory -Force -Path ".\ProxyEthica-Extension\icons"
Set-Location ".\ProxyEthica-Extension"

# Function to download file
function Download-File {
    param (
        [string],
        [string]
    )
    
    Write-Host "Downloading ..."
    Invoke-WebRequest -Uri $Url -OutFile $OutputFile
    Write-Host """ downloaded successfully."
}

# URLs for each file (replace with your actual file URLs or use GitHub raw URLs)
# For example: https://raw.githubusercontent.com/yourusername/yourrepo/master/filename.ext
Download-File -Url "URL_TO_MANIFEST_JSON" -OutputFile "manifest.json"
Download-File -Url "URL_TO_POPUP_HTML" -OutputFile "popup.html"
Download-File -Url "URL_TO_POPUP_JS" -OutputFile "popup.js"
Download-File -Url "URL_TO_STYLES_CSS" -OutputFile "styles.css"
Download-File -Url "URL_TO_BACKGROUND_JS" -OutputFile "background.js"
Download-File -Url "URL_TO_SDK_JS" -OutputFile "proxy-client-sdk.js"

# Download icons (replace with actual icon URLs)
Download-File -Url "URL_TO_ICON16" -OutputFile "icons\icon16.png"
Download-File -Url "URL_TO_ICON48" -OutputFile "icons\icon48.png"
Download-File -Url "URL_TO_ICON128" -OutputFile "icons\icon128.png"

Write-Host "All files downloaded. Extension is ready to be loaded in Chrome."
