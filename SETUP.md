# Mission Control — Setup Guide

## Requirements

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- OpenClaw installed and running

## First-Time Setup

### 1. Clone & install

```bash
git clone https://github.com/bellaclawd/mission-control.git
cd mission-control
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

| Variable | Description |
|---|---|
| `OPENCLAW_HOME` | Path to your `.openclaw` folder e.g. `/Users/yourname/.openclaw` |
| `OPENCLAW_GATEWAY_HOST` | Usually `127.0.0.1` |
| `OPENCLAW_GATEWAY_PORT` | Usually `18789` |
| `OPENCLAW_GATEWAY_TOKEN` | Run `openclaw config get auth.token` to get this |
| `NEXT_PUBLIC_GATEWAY_HOST` | Same as `OPENCLAW_GATEWAY_HOST` (or LAN IP for remote access) |
| `NEXT_PUBLIC_GATEWAY_PORT` | Same as `OPENCLAW_GATEWAY_PORT` |
| `NEXT_PUBLIC_GATEWAY_TOKEN` | Same as `OPENCLAW_GATEWAY_TOKEN` |
| `MC_ALLOWED_HOSTS` | `localhost,127.0.0.1` (add your LAN IP if needed) |
| `API_KEY` | Leave blank — auto-generated on first run |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |

All other keys (OpenAI, Gemini, Firecrawl, etc.) are optional.

### 3. Build & run

```bash
pnpm build
pnpm start
```

Open [http://localhost:3000](http://localhost:3000)

On first run, Mission Control will:
- Create the `.data/` directory with a fresh SQLite database
- Auto-generate an `API_KEY` if you left it blank
- Walk you through the setup wizard

### 4. (Optional) Run as a background service on macOS

Create a LaunchAgent plist at `~/Library/LaunchAgents/claw.mission-control.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>claw.mission-control</string>
  <key>ProgramArguments</key>
  <array>
    <string>/opt/homebrew/bin/pnpm</string>
    <string>start</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/path/to/mission-control</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/mission-control.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/mission-control.err</string>
</dict>
</plist>
```

Then load it:

```bash
launchctl load ~/Library/LaunchAgents/claw.mission-control.plist
```

## What's NOT in this repo

These are intentionally excluded:

| Excluded | Why |
|---|---|
| `.env` / `.env.local` | Contains API keys and secrets |
| `.data/` | Your database — local to your machine |
| `node_modules/` | Install with `pnpm install` |
| `.next/` | Build with `pnpm build` |

## Updating

```bash
git pull
pnpm install
pnpm build
# restart the service
```
