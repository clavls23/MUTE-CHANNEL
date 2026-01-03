# MUTE CHANNEL Bot

Auto server-mutes members when they join a specific voice channel, and (optionally) auto-unmutes them when they leave.

## Requirements
- Node.js 18+
- Discord bot permissions: **Mute Members**
- Bot role must be above members it moderates

## Setup
1. Install deps:
   ```bash
   npm install
Create .env from .env.example and fill:

DISCORD_TOKEN

TARGET_VOICE_CHANNEL_ID

Run:

npm start

Environment variables

DISCORD_TOKEN (required)

TARGET_VOICE_CHANNEL_ID (required)

AUTO_UNMUTE_ON_LEAVE (optional, default true)

EXEMPT_ROLE_IDS (optional, comma-separated role IDs)
