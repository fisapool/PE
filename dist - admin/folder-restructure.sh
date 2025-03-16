#!/bin/bash
# Create folders
mkdir -p dist/popup dist/dashboard dist/admin dist/background dist/shared dist/icons

# Move popup files
mv dist/popup.html dist/popup/
mv dist/popup.js dist/popup/

# Move dashboard files
mv dist/dashboard.html dist/dashboard/
mv dist/dashboard.js dist/dashboard/
mv dist/login.html dist/dashboard/
mv dist/about.html dist/dashboard/

# Move admin files
mv dist/admin.html dist/admin/
mv dist/admin.js dist/admin/

# Move background files
mv dist/background.js dist/background/

# Move shared files 
mv dist/proxy-service.js dist/shared/

# Move icons (if they're not already in an icons folder)
# mv dist/*.png dist/icons/

# Update the manifest.json paths
sed -i 's/"default_popup": "popup.html"/"default_popup": "popup\/popup.html"/g' dist/manifest.json
sed -i 's/"service_worker": "background.js"/"service_worker": "background\/background.js"/g' dist/manifest.json

# Update imports and links
find dist -type f -name "*.js" -exec sed -i 's/import.*from ".\/proxy-service.js"/import ProxyService from "..\/shared\/proxy-service.js"/g' {} \;
find dist -type f -name "*.html" -exec sed -i 's/src="popup.js"/src="..\/popup\/popup.js"/g' {} \;
find dist -type f -name "*.html" -exec sed -i 's/src="dashboard.js"/src="..\/dashboard\/dashboard.js"/g' {} \;
find dist -type f -name "*.html" -exec sed -i 's/src="admin.js"/src="..\/admin\/admin.js"/g' {} \;
find dist -type f -name "*.html" -exec sed -i 's/href="about.html"/href="..\/dashboard\/about.html"/g' {} \;
find dist -type f -name "*.html" -exec sed -i 's/href="login.html"/href="..\/dashboard\/login.html"/g' {} \;
find dist -type f -name "*.html" -exec sed -i 's/href="dashboard.html"/href="..\/dashboard\/dashboard.html"/g' {} \;
find dist -type f -name "*.html" -exec sed -i 's/href="admin.html"/href="..\/admin\/admin.html"/g' {} \; 