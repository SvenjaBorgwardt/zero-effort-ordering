# UTE - Unkomplizierte Theken-Eingabe

**An AI-powered point-of-sale system for bakeries that understands natural conversation.**

Built at the BAKO Hackathon (March 2025). UTE lets bakery staff take orders by simply talking to customers - no tapping, no searching, no scrolling. The register listens and does the rest.

**[Live Demo](https://zero-effort-ordering.vercel.app)**

## What it does

UTE turns the sales conversation into the input method. While the cashier talks to the customer, the system:

- Recognizes products and quantities from speech in real-time
- Identifies regular customers by name and recalls their preferences
- Detects allergens mentioned in conversation and blocks affected products (EU LMIV compliant)
- Picks up on dietary needs like "vegan", "organic", or "regional" and filters accordingly
- Suggests complementary products (cross-selling)
- Detects payment method ("cash" / "card") from speech

## How it works

UTE uses a two-pass architecture for speed and accuracy:

**Pass 1 (instant, <200ms):** Browser Speech API provides real-time transcription. Products appear in the order list while the customer is still speaking.

**Pass 2 (background, ~2s):** Mistral Voxtral re-transcribes the audio for higher accuracy, then Mistral Large parses the corrected text - filtering out small talk and extracting only actual order items.

Product matching uses Fuse.js for fuzzy search, handling plural forms, compound words, and dialect variations common in German bakery language.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Radix UI |
| Backend | Express.js, Node.js |
| AI | Mistral Large (parsing), Voxtral (transcription) |
| Database | Supabase (PostgreSQL) |
| Matching | Fuse.js (fuzzy search) |
| Audio | Web Audio API, Browser Speech API |
| Hosting | Vercel (serverless) |

## Key numbers

- 40+ products in the catalog
- 16 EU-standard allergen codes with full sub-group support
- 33+ recognized allergen phrases in German
- Real-time recognition under 200ms
- Works offline via fallback system (the register never stops)

## Built by

Svenja Borgwardt - built with Claude (Anthropic) and Mistral AI.

## License

MIT
