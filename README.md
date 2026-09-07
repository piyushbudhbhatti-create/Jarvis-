# JARVIS PWA V1

A phone-first Progressive Web App version of JARVIS.

## What works immediately
- Installable home-screen app
- JARVIS-style interface
- Text commands
- Voice input (browser support required)
- Text-to-speech responses
- Local task storage
- Local project storage
- Local conversation history
- Offline shell via Service Worker

## AI connection
The app is intentionally NOT given an OpenAI API key in the browser.

Configure a secure backend endpoint in Settings:

Example:
https://your-server.example.com/command

Expected request:
POST /command
{ "command": "..." }

Expected response:
{ "response": "..." }

## Test on your phone
For a quick local test, host these files on any HTTPS/static host.

Then open the site in Chrome and choose:
Menu → Install app / Add to Home screen

## Important
For microphone, notifications, and installability, HTTPS is normally required.
