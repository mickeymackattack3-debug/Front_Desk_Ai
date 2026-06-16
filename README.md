# FrontDesk AI

AI-powered 24/7 sales assistant for local businesses. Instantly captures, qualifies, and converts leads via web chat.

## Architecture

- **`backend/`** — Node.js Fastify API server (port 3000). Handles conversations, lead capture, booking logic. Uses SQLite for storage.
- **`widget/`** — Embeddable chat widget (vanilla JS, built with Vite). 11 kB bundle.
- **`dashboard/`** — Business owner dashboard (React SPA). View leads, conversations, bookings.
- **`database/`** — Shared team-db schema and client.

## Quick Start

```bash
# Install dependencies
cd backend && npm install
cd ../widget && npm install && npm run build
cd ../dashboard && npm install && npm run build

# Start the server
cd ../backend && node src/index.js
```

Server runs on `http://0.0.0.0:3000`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/conversations` | Start a new chat conversation |
| POST | `/api/message` | Send a message in a conversation |
| GET | `/api/conversations/:id/messages` | Get conversation history |
| GET | `/api/businesses` | List businesses |
| GET | `/api/businesses/:id/stats` | Dashboard stats |
| GET | `/api/businesses/:id/leads` | Get leads |
| GET | `/api/businesses/:id/bookings` | Get bookings |
| PATCH | `/api/leads/:id` | Update lead status |
| PATCH | `/api/bookings/:id` | Update booking status |

## Embeddable Widget

Add to any website:

```html
<script src="https://your-server.com/widget/widget.js"
  data-fdai-business-id="demo-001"
  data-fdai-api-url="https://your-server.com"
  data-fdai-color="#4F46E5"
  data-fdai-title="Chat with us"
  data-fdai-subtitle="We reply in minutes"></script>
```