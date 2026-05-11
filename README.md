# PLDI — Compta Kajabi

Système de réconciliation comptable pour suivi des ventes et plans de paiement vendus sur Kajabi.

## Objectif

Centraliser, normaliser et présenter en temps réel :

- Les ventes (one-shot, payment plans, subscriptions)
- L'avancement de chaque plan de paiement (échéancier projeté vs réel)
- Les impayés et leur cycle (`in_retry` → `late` → `missed`)
- Le chiffre d'affaires **provisoire** et **finalisé** par mois (compta stable pour clôture)

Source de données : **Kajabi uniquement** (pas d'accès direct Stripe/PayPal).

## Architecture cible

```
Kajabi
 ├─ Webhook: Cart Purchase ─────┐
 ├─ Webhook: Payment Succeeded ─┤
 └─ API publique (Pro tier) ────┤
                                ▼
                  Supabase Edge Function
                                │
                                ▼
                  Supabase Postgres
                  ├─ raw.*   (vérité brute, immuable)
                  └─ app.*   (modèle métier normalisé)
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
   Cron quotidien        Dashboard Next.js       Alertes
   (détection            (MRR, impayés,          (email/Slack)
   impayés + recon)      cohortes, par offre)
```

## Stack

- **Database** : Supabase (Postgres)
- **Backend** : Supabase Edge Functions (Deno / TypeScript)
- **Scripts** : Node.js / TypeScript
- **Frontend** : Next.js (à venir)

## Structure du repo

```
.
├── scripts/             # Scripts de backfill, maintenance, one-shots
├── supabase/
│   ├── migrations/      # Migrations SQL versionnées (miroir du MCP)
│   └── functions/       # Edge functions (webhooks, crons)
├── web/                 # Frontend dashboard (à venir)
└── docs/                # Documentation projet et décisions
```

## Phases

- **Phase 0** — Discovery & setup *(en cours)*
- **Phase 1** — Backfill historique (CSV + API Kajabi → `raw` → `app`)
- **Phase 2** — Pipeline temps réel via webhooks Kajabi
- **Phase 3** — Dashboard de pilotage
- **Phase 4** — Commissions closers (plus tard)

## Sécurité

- **Aucun secret en clair dans le repo.** Toujours.
- Credentials Kajabi stockés dans **Supabase Vault** (`vault.secrets`).
- `.env.example` fournit le template ; le `.env` réel n'est jamais commité.

## Conventions

- Migrations Supabase versionnées et numérotées (`YYYYMMDDHHMM_description.sql`).
- Scripts de backfill **idempotents** (rejouables sans dupliquer).
- Données brutes (`raw.*`) **immuables** ; toute logique métier vit dans `app.*` ou les vues.
