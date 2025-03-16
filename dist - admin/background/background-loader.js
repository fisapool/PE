// This file loads our scripts in the correct order
// First load the proxy service
importScripts('proxy-service.js');
// Then load the background script that uses it
importScripts('background.js');

console.log('ProxyEthica background loader initialized'); 