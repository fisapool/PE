# PE - Residential Proxy Extension

A browser extension for managing and utilizing residential proxies.

## Features

- Configure and connect to multiple proxy servers
- Support for various server types (including SSE)
- Secure connection handling
- Input validation for proxy endpoints

## Installation

1. Clone this repository
2. Install dependencies with `npm install`
3. Build the extension with `npm run build`
4. Load the extension in your browser:
   - Chrome: Go to `chrome://extensions/`, enable Developer mode, and click "Load unpacked"
   - Firefox: Go to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", and select the manifest.json file

## Usage Guidelines

This extension should be used responsibly and in accordance with:
- Terms of service for websites you access
- Local laws and regulations
- Proxy provider policies

## Development

- Use `npm run dev` for development build with hot-reloading
- Run tests with `npm test`

## Security Notice

This extension implements several security features:
- No credentials are stored in code
- All connections use HTTPS by default
- Input validation for all proxy endpoints
- Rate limiting to prevent abuse

# ProxyEthica

ProxyEthica is a comprehensive residential proxy management system designed for ethical data collection. It provides secure, compliant, and bandwidth-efficient proxy connections with built-in fallback mechanisms and monitoring.

## Features

- 🔒 **Secure Proxy Management**: No hardcoded credentials, HTTPS enforcement
- 🔄 **Automatic Rotation**: IP rotation with randomized delays and rate limit respect
- 🌐 **Multiple Fallbacks**: Protocol fallbacks (HTTPS/HTTP/SOCKS5) and provider-level fallbacks
- 📊 **Bandwidth Tracking**: Monitor and limit data usage per session
- 🤖 **Ethical Compliance**: Robots.txt parsing and respect
- 🛡️ **DNS Leak Prevention**: Protects against DNS-based identity leaks
- 📱 **Web Dashboard**: Manage proxy sessions through a user-friendly interface

## Project Structure 

# ProxyEthica Firebase Integration

This document outlines the Firebase integration for the ProxyEthica Chrome extension.

## Architecture

The extension uses Firebase for:
- User authentication
- Storing proxy session data
- Tracking bandwidth contributions
- Managing user credits
- Offline support

## Firebase Services Used

- **Authentication**: Email/password authentication
- **Firestore**: NoSQL database for storing user data
- **Analytics**: Optional tracking of usage patterns
- **Hosting**: Hosting the dashboard web app

## Collections Structure

1. **users**: User profiles and credit balances
   - `userId`: (document ID)
   - `email`: User's email
   - `credits`: Available proxy credits
   - `contribution`: Object containing bandwidth contribution stats

2. **apiKeys**: Secure storage of API keys
   - `userId`: (document ID)
   - `key`: The API key
   - `createdAt`: Creation timestamp

3. **proxySessions**: Records of proxy sessions
   - `userId`: User who created the session
   - `ip`: Proxy IP address
   - `country`: Country of the proxy
   - `createdAt`: Start time
   - `active`: Whether session is active

4. **contributions**: Records of bandwidth contributions
   - `userId`: Contributing user
   - `timestamp`: When contribution occurred
   - `bandwidthBytes`: Amount contributed
   - `creditsEarned`: Credits earned

## Security Rules

The Firestore security rules enforce:
- Users can only read/write their own data
- API keys are read-only by the owning user
- Contribution records cannot be modified after creation

## Error Handling

All Firebase operations use try/catch blocks and proper error handling.
The `firebase-error-handler.js` utility provides user-friendly error messages.

## Offline Support

The extension uses Firestore offline persistence to function even when
offline, syncing when connection is restored.

## Integration Points

- **Authentication**: Login/signup in popup.html
- **Profile Management**: Settings page
- **Proxy Usage**: Background script for tracking
- **Bandwidth Contribution**: Background script for recording # PE - Residential Proxy Extension
