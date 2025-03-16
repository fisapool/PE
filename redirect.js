// For development: redirect to the local dashboard
// For production: You would set the proper URL
const dashboardUrl = "index.html";

// Get URL parameters instead of checking the path
const urlParams = new URLSearchParams(window.location.search);
const action = urlParams.get('action');

// Check if we have an action parameter
if (action === 'signup') {
    // Redirect to the dashboard with the signup parameter
    window.location.replace(dashboardUrl + "?action=signup");
} else {
    // Default redirect to dashboard
    setTimeout(() => {
        window.location.replace(dashboardUrl);
    }, 1500); // Short delay for the animation
}

// Update the manual redirect button
document.getElementById('manual-redirect').href = dashboardUrl; 