# Zanzibar Guide

AI travel assistant demo for Zanzibar (chat, map, trip wizard, bookings).

## Local development

MongoDB must be running locally. With Docker installed, start the database first:

```bash
cp .env.example .env   # add OPENAI_API_KEY and GEMINI_API_KEY
npx pnpm@10.4.1 install
docker compose up -d mongo
npx pnpm@10.4.1 exec vite --host 127.0.0.1 --port 3000
```

Open http://127.0.0.1:3000/

Tourism Markdown files in `Tourism Data/Tourism MD Files` are indexed into the MongoDB-backed knowledge base at startup. In Docker, rebuild the app image after changing those source files.

## Production (Docker)

Requires Docker. Put secrets in `.env` (never commit it).

```bash
docker compose up --build -d
```

App: http://localhost:3000/  
Health: http://localhost:3000/api/health

Stop: `docker compose down`

MongoDB stores application state in the `mongo-data` volume. Uploaded brochure files live in the `zanzibar-data` volume. Existing JSON records in `zanzibar-data` are imported into MongoDB the first time each store is initialized.

## Production notes

- Set both `OPENAI_API_KEY` and `GEMINI_API_KEY` in `.env` with `AI_PROVIDER=auto` to route simple questions to Gemini and complex planning questions to OpenAI. Concurrent requests are sent to the provider with fewer in-flight requests; failed requests fall back to the other provider, then Ollama. Set `AI_PROVIDER=openai` or `AI_PROVIDER=gemini` to pin a provider.
- Payments, WhatsApp, and Mapbox stay optional stubs until those keys are set.
- Put TLS in front (Cloudflare, nginx, or a load balancer). Set `ENABLE_HSTS=1` only when serving HTTPS.
