# WhatsApp Edge Function

Set these Supabase Edge Function secrets:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`

The access token must stay server-side. Never put it in `config.js`.

Deploy:
```bash
supabase functions deploy send-whatsapp
```

The frontend calls this function after generating a private signed invoice URL.
