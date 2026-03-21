# GPU Node

Share your GPU compute — AI inference and 3D rendering — with trusted users at electricity cost. Self-hostable, fully automated billing, deployable in under an hour.

## What it does

| Service      | API                               | Billed by          |
| ------------ | --------------------------------- | ------------------ |
| AI Inference | OpenAI-compatible chat API        | Per million tokens |
| 3D Rendering | Blender job queue + file delivery | Per render-minute  |

Costs are derived from your actual electricity rate and GPU wattage — no margins, no markups.

## How it works

Your PC runs a FastAPI proxy behind a Cloudflare Tunnel. A React frontend on Vercel handles the UI. A Postgres database (Neon/Supabase free tier) and Cloudflare R2 handle persistence. Stripe handles billing.

```
Vercel (always on)          Your PC (via Cloudflare Tunnel)
──────────────────          ────────────────────────────────
React frontend    ────────► FastAPI proxy ──► Ollama
                            Job worker   ──► Blender CLI
Neon / Supabase             Cloudflare R2
  users, ledger,              .blend files,
  jobs, invoices              rendered output
```

The frontend and database stay reachable even when your PC is off. Users can check balances and view invoices any time. Only inference and render submission need your machine up.

## Prerequisites

- **Docker + Docker Compose** (with NVIDIA Container Toolkit)
- **A Cloudflare account** (free) with a domain you control
- **A Neon or Supabase account** (free tier is fine)
- **A Stripe account** for billing
- **A Resend account** for transactional email

## Quick start

### 1. Clone and configure

```bash
git clone https://github.com/yourname/gpu-node.git
cd gpu-node
cp .env.example .env
# Edit .env — fill in DATABASE_URL, JWT_SECRET, Stripe keys, R2 credentials
```

### 2. Set up the Cloudflare Tunnel

```bash
cloudflared tunnel login
cloudflared tunnel create gpu-node
cloudflared tunnel route dns gpu-node gpu.yourdomain.com
# Copy the tunnel token into .env as TUNNEL_TOKEN
```

### 3. Start the server

```bash
docker compose up -d
```

This starts:

- `fastapi` on `localhost:8000`
- `ollama` on `localhost:11434` (internal only)
- `render-worker` polling the job queue
- `cloudflared` proxying `gpu.yourdomain.com` → FastAPI

### 4. Deploy the frontend

Connect the repo to Vercel. Set one environment variable in the Vercel dashboard:

```
NEXT_PUBLIC_API_URL=https://gpu.yourdomain.com
```

Vercel auto-detects the `frontend/` directory and deploys on push.

### 5. Point Stripe webhooks

In the Stripe dashboard, add a webhook endpoint:

```
https://your-vercel-app.vercel.app/api/webhooks/stripe
```

Events needed: `invoice.paid`, `invoice.payment_failed`, `checkout.session.completed`

---

## Configuration

All config lives in `.env`. See [ARCHITECTURE.md](./ARCHITECTURE.md#8-configuration-reference) for the full reference. Key values to set:

```env
# Your electricity rate drives all cost calculations
ELECTRICITY_RATE_KWH=0.346   # e.g. 34.6c/kWh in Wellington

# Measured GPU wattage (use a smart plug for accuracy)
GPU_INFERENCE_WATTS=150
GPU_RENDER_WATTS=300
SYSTEM_WATTS=80

# Access control
INVITE_ONLY=true
REQUIRE_APPROVAL=true
ADMIN_EMAIL=you@example.com
```

## Billing model

Costs are calculated in real time from your electricity rate and GPU wattage — no hardcoded prices. Change `ELECTRICITY_RATE_KWH` and all future usage reprices automatically.

Users run a postpaid balance. They get soft warnings at $0 and -$5, and a hard block at -$20 (configurable per user). Monthly invoices are generated automatically and charged via Stripe.

## API

The inference API is OpenAI-compatible — any client that works with OpenAI's API works here without modification.

```bash
# Chat completion
curl https://gpu.yourdomain.com/v1/inference/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "qwen2.5:14b", "messages": [{"role": "user", "content": "Hello"}]}'

# List models
curl https://gpu.yourdomain.com/v1/inference/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Render jobs, account management, and admin endpoints are documented in [ARCHITECTURE.md](./ARCHITECTURE.md#6-api-reference).

## Build order

If you're building from scratch, the recommended sequence is:

| Phase | What                                                    | Est. effort |
| ----- | ------------------------------------------------------- | ----------- |
| 1     | DB schema, FastAPI skeleton, JWT auth                   | 4–6 hrs     |
| 2     | Ollama proxy, token counting, ledger writes             | 3–4 hrs     |
| 3     | Stripe top-up, monthly invoices, webhooks               | 4–5 hrs     |
| 4     | R2 storage, render job submission, Blender worker       | 6–8 hrs     |
| 5     | Chat UI, Render UI, Account dashboard                   | 4–6 hrs     |
| 6     | Admin dashboard, email notifications, file sanitisation | 3–4 hrs     |

> Build phases 1–3 first. The billing foundation is the hardest thing to retrofit — every other feature depends on it.

## Security notes

- `.blend` files are sanitised before queuing (embedded Python scripts stripped)
- API keys are stored as bcrypt hashes only — shown once on creation
- Ollama is never exposed through the tunnel (localhost only)
- All traffic enters via Cloudflare Tunnel — no open ports required

See [ARCHITECTURE.md](./ARCHITECTURE.md#7-security) for full security details.

## License

MIT
