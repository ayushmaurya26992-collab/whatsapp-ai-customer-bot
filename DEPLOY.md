# Fast deployment checklist

## Render / Railway / VPS
- Build command: `npm install`
- Start command: `npm start`
- Environment variables: copy values from `.env.example`
- Public URL must use HTTPS.

## Meta webhook values
Callback URL:
`https://YOUR-DOMAIN/webhook`

Verify token:
same exact value as `WHATSAPP_VERIFY_TOKEN`

Then subscribe to the WhatsApp `messages` webhook.

## Test
Send a WhatsApp text to the connected business number.
Check server logs for webhook/send errors.
