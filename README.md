# WhatsApp AI Customer Bot

A production-oriented starter for WhatsApp Cloud API + AI customer support.

## What it does
- Receives WhatsApp text messages through Meta webhook.
- Maintains per-customer conversation history.
- Generates Hindi/Hinglish AI replies.
- Sends replies through WhatsApp Cloud API.
- Stores recent conversations locally.
- Includes protected admin status/conversation endpoints.

## Required setup
1. Install Node.js 20+.
2. Copy `.env.example` to `.env`.
3. Add your Meta WhatsApp Cloud API credentials.
4. Add your OpenAI API key.
5. Set a strong `ADMIN_KEY`.
6. Run:
   `npm install`
   `npm start`
7. Deploy to a public HTTPS host.
8. In Meta Developer, configure webhook:
   `https://YOUR-DOMAIN/webhook`
   Verify token must exactly match `WHATSAPP_VERIFY_TOKEN`.
9. Subscribe the WhatsApp message webhook field.

## Important
The bot cannot be connected to a WhatsApp account without valid Meta credentials and a publicly reachable HTTPS webhook. Never paste API tokens into chat or commit `.env` to Git.

## Production recommendations
For higher traffic, replace local JSON storage with PostgreSQL/Redis, add signature verification, rate limits, structured logging, queue/retry handling, and an authenticated web admin dashboard.
