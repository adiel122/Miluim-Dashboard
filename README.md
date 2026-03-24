# Miluim Dashboard

**מילואים סיפוח** — a reserve-duty matchmaking dashboard: connecting reserve soldiers with units (open roles), with admin moderation, Hebrew UI, and right-to-left (RTL) layout.

## Tech stack

| Layer | Choice |
|--------|--------|
| Framework | [Next.js 14](https://nextjs.org/) (App Router), React 18, TypeScript |
| Styling | [Tailwind CSS](https://tailwindcss.com/) 3.x, [shadcn](https://ui.shadcn.com/) / Base UI components |
| Forms & validation | [react-hook-form](https://react-hook-form.com/), [Zod](https://zod.dev/), [@hookform/resolvers](https://github.com/react-hook-form/resolvers) |
| Backend & auth | [Supabase](https://supabase.com/) (PostgreSQL, Auth, RLS) — wired in `lib/supabase/` |
| Hosting | Designed for [Vercel](https://vercel.com/) |

## Features

- **Hebrew / RTL**: `lang="he"`, `dir="rtl"`, Rubik font with Hebrew subset.
- **Profiles**: `first_name`, `last_name`, `military_id` (7 digits, stored as text), `phone` (Israeli 10 digits with leading `0`), `rank` (closed IDF rank list), `military_role`.
- **Listings**: title, description, rank/profession/location, `status`: `pending` → `approved` / `closed`.
- **Listing submission form**: client form with Zod validation and shadcn-style inputs.
- **Admin route** (`/admin`): placeholder for protected dashboard (approve/edit/delete, user management).

## Getting started

### Prerequisites

- Node.js 18+
- npm
- A [Supabase](https://supabase.com/) project (optional until you connect env vars)

### Install

```bash
git clone git@github.com:adiel122/Miluim-Dashboard.git
cd Miluim-Dashboard
npm install
```

### Environment

Copy `.env.example` to `.env.local` and fill in your project values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous (public) key |

### Database

In the Supabase SQL editor, run:

`supabase/schema.sql`

This creates `profiles` (linked to `auth.users`), `listings`, enums, indexes, and baseline Row Level Security policies. Adjust policies when you add an admin role or service-role operations.

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
npm start
```

## Project structure

```
app/                    # App Router pages & layouts
  admin/                # Admin placeholder
components/
  forms/                # e.g. listing submission form
  ui/                   # Shared UI primitives
lib/
  constants/            # IDF ranks, role suggestions
  supabase/             # Browser & server Supabase clients
  validations/          # Zod schemas
supabase/
  schema.sql            # PostgreSQL schema for Supabase
```

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Import the project in Vercel.
3. Set the same environment variables as in `.env.local`.
4. Deploy. Run `supabase/schema.sql` on your Supabase project before relying on app features that read/write those tables.

## Notes

- **Package name**: the npm package is `miluim` (lowercase) due to npm naming rules; the repository display name may differ.
- **Tailwind**: this repo targets Tailwind 3; shadcn v4 Tailwind v4-only CSS imports were removed from `globals.css` so builds stay compatible. You may migrate to Tailwind 4 later if you want the full shadcn v4 CSS pipeline.
- **Secrets**: never commit `.env` or `.env*.local` (see `.gitignore`).

## License

Private / all rights reserved unless you add an explicit license file.
