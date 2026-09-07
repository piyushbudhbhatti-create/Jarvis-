# JARVIS V10 — Wake Word Mode

## Wake phrase
While the JARVIS page is open and wake mode is enabled:

- Say: "Jarvis"
- JARVIS replies: "Yes, Dev?"
- Then speak your command

You can also say the command in one sentence:
- "Jarvis, open YouTube"
- "Jarvis, add task finish my presentation"

## Important limitation
A normal browser/PWA cannot reliably keep an always-on microphone running after the app is closed or in the background. True system-wide wake-word detection requires a native Android app/service with microphone and background permissions.

This version provides foreground wake-word listening.
