// Check that your background script is properly initializing
// Look for errors in event listeners or API connections 

console.log('ProxyEthica background script initialized');

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Background script received message:', request);
  
  if (request.action === 'startProxy') {
    console.log('Starting proxy service...');
    // Implement proxy start logic
    sendResponse({status: 'started'});
  } else if (request.action === 'stopProxy') {
    console.log('Stopping proxy service...');
    // Implement proxy stop logic
    sendResponse({status: 'stopped'});
  }
  
  return true; // Keep the message channel open for async response
}); 