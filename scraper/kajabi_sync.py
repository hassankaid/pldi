#!/usr/bin/env python3
"""
kajabi_sync.py  —  Récupère les transactions Kajabi (admin) -> Supabase.

CONTEXTE
--------
L'API publique Kajabi n'est plus accessible (plan Growth). Ce script lit la
liste des transactions dans l'admin Kajabi (rendu serveur, pilotée par URL) et
insère les NOUVELLES transactions dans la même table que le backfill d'origine
(`raw.kajabi_transactions`, via la fonction RPC `upsert_kajabi_transactions`).
Toutes tes vues `app.*` et ton dashboard se recalculent ensuite tout seuls.

PHILOSOPHIE v1 : simple et SANS RISQUE
--------------------------------------
- Tourne sur TA machine, avec TON navigateur Chrome et TON IP (le plus discret
  pour une session admin : ça ressemble à toi qui te connectes normalement).
- Connexion MANUELLE à chaque run (ta 2FA, à la main). Aucune 2FA automatisée.
- LECTURE SEULE : uniquement des GET, jamais un clic qui modifie quoi que ce soit.
- On n'insère QUE les transactions absentes de la base -> impossible d'écraser
  ou corrompre une ligne existante. (Remboursements / retries arrivent comme de
  nouvelles lignes, donc bien capturés.)
- Fail-closed : au moindre écran de login inattendu, erreur HTTP, CAPTCHA, ou
  changement de format -> on s'arrête net et on alerte. On ne force jamais.

USAGE
-----
    py -m pip install playwright        (une seule fois)
    py scraper\\kajabi_sync.py --dry-run         # teste sans rien écrire
    py scraper\\kajabi_sync.py                    # écrit en base

Options : --since 2026-06-01  --until 2026-07-21  --dry-run  --max-pages N
Par défaut, --since = date de la dernière transaction en base (moins 3 jours de
recouvrement de sécurité), --until = aujourd'hui.
"""

import argparse
import datetime as dt
import json
import os
import random
import re
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

SITE_ID = "162839"
BASE = "https://app.kajabi.com"
TX_PATH = f"/admin/sites/{SITE_ID}/payments/transactions"
LOGIN_MARKERS = ("/users/sign_in", "/login", "/sessions/new")
ROWS_PER_PAGE = 15

# ---------------------------------------------------------------------------
# JS d'extraction — validé sur la vraie page. Renvoie l'en-tête + une ligne par
# transaction : IDs (depuis les href), provider (depuis le <title> du <svg>),
# et le texte "montant | devise | statut | type | offre | email | date".
# ---------------------------------------------------------------------------
JS_EXTRACT = r"""
() => {
  const rows = new Map();
  for (const a of document.querySelectorAll('a[href*="/transaction/"]')) {
    const m = a.getAttribute('href').match(/charge\/(\d+)\/transaction\/(\d+)/);
    if (!m) continue;
    let box = a;
    for (let i = 0; i < 7; i++) {
      box = box.parentElement;
      if (!box) break;
      if (box.querySelector('a[href*="/contacts/"]') && box.querySelector('a[href*="/offers/"]')) break;
    }
    if (!box || rows.has(m[2])) continue;
    const offer = box.querySelector('a[href*="/offers/"]');
    const contact = box.querySelector('a[href*="/contacts/"]');
    const svg = box.querySelector('svg');
    rows.set(m[2], {
      tx: m[2],
      charge: m[1],
      offer_id: (offer && (offer.getAttribute('href').match(/offers\/(\d+)/) || [])[1]) || null,
      contact_id: (contact && (contact.getAttribute('href').match(/contacts\/(\d+)/) || [])[1]) || null,
      provider: (svg && svg.querySelector('title')) ? svg.querySelector('title').textContent.trim() : null,
      rowText: box.innerText.replace(/\s*\n\s*/g, ' | ').replace(/ \| Options.*$/, '').trim()
    });
  }
  const header = (document.body.innerText.match(/Displaying[^\n]+/) || [])[0] || null;
  const needsLogin = /sign in|log in|password/i.test(document.title) ||
                     LOGIN_TEST.some(s => location.pathname.includes(s));
  return { header, needsLogin, rows: [...rows.values()] };
}
""".replace("LOGIN_TEST", json.dumps(list(LOGIN_MARKERS)))

MONTHS = {m: i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}


# ---------------------------------------------------------------------------
# Config (env, sinon web/.env.local)
# ---------------------------------------------------------------------------
def load_config():
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (url and key):
        envp = Path(__file__).resolve().parent.parent / "web" / ".env.local"
        if envp.exists():
            for line in envp.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k, v = k.strip(), v.strip().strip('"').strip("'")
                if k in ("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL") and not url:
                    url = v
                if k == "SUPABASE_SERVICE_ROLE_KEY" and not key:
                    key = v
    if not (url and key):
        sys.exit("Config manquante : SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY "
                 "(ni en variable d'environnement, ni dans web/.env.local).")
    return url.rstrip("/"), key


# ---------------------------------------------------------------------------
# PostgREST helpers
# ---------------------------------------------------------------------------
def _http(method, url, key, body=None, extra_headers=None):
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    if extra_headers:
        headers.update(extra_headers)
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            raw = r.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")
        raise SystemExit(f"Erreur Supabase {e.code} sur {url}\n{detail}")


def fetch_existing_ids(root, key):
    rows = _http("GET", f"{root}/rest/v1/payments?select=payment_id&limit=200000",
                 key, extra_headers={"Accept-Profile": "app"})
    return {str(r["payment_id"]) for r in (rows or [])}


def fetch_latest_occurred_at(root, key):
    rows = _http("GET", f"{root}/rest/v1/payments?select=occurred_at&order=occurred_at.desc&limit=1",
                 key, extra_headers={"Accept-Profile": "app"})
    if rows and rows[0].get("occurred_at"):
        return dt.datetime.fromisoformat(rows[0]["occurred_at"].replace("Z", "+00:00")).replace(tzinfo=None)
    return None


def upsert_transactions(root, key, objs):
    return _http("POST", f"{root}/rest/v1/rpc/upsert_kajabi_transactions", key, body={"data": objs})


# ---------------------------------------------------------------------------
# Parsing d'une ligne
# ---------------------------------------------------------------------------
def amount_to_cents(s):
    s = re.sub(r"[^\d,]", "", s or "")
    if not s:
        return None
    return int(round(float(s.replace(",", ".")) * 100))


def status_to_state_action(status, ttype):
    s = (status or "").strip().lower()
    t = (ttype or "").strip().lower()
    action = {"subscription": "subscription_charge", "payment plan": "multipay_charge"}.get(t, "charge")
    if s == "paid":
        return "succeeded", action
    if s == "failed":
        return "failed", action
    if "refund" in s:  # "Refunded", "Refund", "Partially refunded"
        return "succeeded", "refund"
    return None, None  # inconnu -> flag


def resolve_occurred_at(text, win_start, win_end, now):
    t = (text or "").strip()
    tl = t.lower()
    m = re.match(r"(a|an|\d+)\s+(second|minute|hour|day|week|month)s?\s+ago", tl)
    if m:
        n = 1 if m.group(1) in ("a", "an") else int(m.group(1))
        unit = m.group(2)
        delta = {
            "second": dt.timedelta(seconds=n), "minute": dt.timedelta(minutes=n),
            "hour": dt.timedelta(hours=n), "day": dt.timedelta(days=n),
            "week": dt.timedelta(weeks=n), "month": dt.timedelta(days=30 * n),
        }[unit]
        return now - delta
    if tl in ("just now", "a moment ago"):
        return now
    if tl == "yesterday":
        return now - dt.timedelta(days=1)
    m = re.match(r"([A-Za-z]{3})\s+(\d{1,2}),\s+(.+)", t)
    if m:
        mon = MONTHS.get(m.group(1).title())
        day = int(m.group(2))
        rest = m.group(3).strip()
        if mon is None:
            return None
        hh = mm = 0
        tm = re.search(r"(\d{1,2}):(\d{2})\s*(am|pm)", rest, re.I)
        if tm:
            hh = int(tm.group(1)) % 12
            if tm.group(3).lower() == "pm":
                hh += 12
            mm = int(tm.group(2))
        ym = re.match(r"(\d{4})", rest)
        if ym:
            try:
                return dt.datetime(int(ym.group(1)), mon, day, hh, mm)
            except ValueError:
                return None
        for year in {win_start.year, win_end.year}:
            try:
                cand = dt.datetime(year, mon, day, hh, mm)
            except ValueError:
                continue
            if win_start - dt.timedelta(days=2) <= cand <= win_end + dt.timedelta(days=2):
                return cand
        try:
            return dt.datetime(win_end.year, mon, day, hh, mm)
        except ValueError:
            return None
    return None


def parse_row(r, win_start, win_end, now):
    """Transforme une ligne brute en (record JSON:API, warning|None)."""
    parts = [p.strip() for p in (r.get("rowText") or "").split("|")]
    if len(parts) < 6:
        return None, f"ligne illisible tx={r.get('tx')}: {r.get('rowText')!r}"
    amount_s, currency, status, ttype = parts[0], parts[1], parts[2], parts[3]
    date_s = parts[-1]
    email = parts[-2]
    offer_label = " | ".join(parts[4:-2]).strip()

    cents = amount_to_cents(amount_s)
    state, action = status_to_state_action(status, ttype)
    if state is None:
        return None, f"statut inconnu '{status}' (tx={r.get('tx')}) -> ignore par securite"
    occurred = resolve_occurred_at(date_s, win_start, win_end, now)
    if occurred is None:
        return None, f"date illisible '{date_s}' (tx={r.get('tx')}) -> ignore par securite"
    if cents is None:
        return None, f"montant illisible '{amount_s}' (tx={r.get('tx')}) -> ignore par securite"

    provider = r.get("provider")  # "Stripe" | "PayPal"
    pt = {"subscription": "subscription", "payment plan": "multi", "one time": "single"}.get(
        ttype.strip().lower(), None)

    rec = {
        "id": str(r["tx"]),
        "attributes": {
            "action": action,
            "state": state,
            "payment_type": pt,
            "amount_in_cents": cents,
            "sales_tax_in_cents": 0,
            "currency": (currency or "EUR").strip() or "EUR",
            "provider": provider,
            "created_at": occurred.isoformat(),
            "updated_at": occurred.isoformat(),
        },
        "relationships": {
            "customer": {"data": {"id": r.get("contact_id")}},
            "offer": {"data": {"id": r.get("offer_id")}},
        },
        # conservé tel quel dans payload -> resolution ulterieure (purchase_id, contact)
        "_scraped": {
            "source": "admin_scrape_v1",
            "charge_id": r.get("charge"),  # = purchase_id (id du plan)
            "contact_id": r.get("contact_id"),
            "email": email,
            "offer_label": offer_label,
            "row_status": status,
            "row_type": ttype,
            "row_date_text": date_s,
        },
    }
    return rec, None


# ---------------------------------------------------------------------------
# Scraping
# ---------------------------------------------------------------------------
def page_url(win_start, win_end, page):
    return (f"{BASE}{TX_PATH}?in_the_last=custom"
            f"&start_date={win_start:%Y-%m-%d}&end_date={win_end:%Y-%m-%d}"
            f"&sort=date&direction=desc&page={page}")


def total_from_header(header):
    if not header:
        return None
    m = re.search(r"of\s+([\d\s.,]+)\s+transactions", header)
    if not m:
        return None
    return int(re.sub(r"[^\d]", "", m.group(1)))


def run(args):
    root, key = load_config()
    now = dt.datetime.now()

    # Fenêtre de dates
    win_end = dt.datetime.strptime(args.until, "%Y-%m-%d") if args.until else now
    if args.since:
        win_start = dt.datetime.strptime(args.since, "%Y-%m-%d")
    else:
        latest = fetch_latest_occurred_at(root, key)
        win_start = (latest - dt.timedelta(days=3)) if latest else (now - dt.timedelta(days=90))
    win_start = win_start.replace(hour=0, minute=0, second=0, microsecond=0)
    print(f"Fenetre : {win_start:%Y-%m-%d} -> {win_end:%Y-%m-%d}")

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit("Playwright n'est pas installe. Lance :  py -m pip install playwright")

    scraped = {}
    warnings = []

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(channel="chrome", headless=False)
        except Exception:
            print("(Chrome introuvable, bascule sur Chromium Playwright — lance 'py -m playwright install chromium' si erreur)")
            browser = p.chromium.launch(headless=False)
        ctx = browser.new_context()
        page = ctx.new_page()

        # 1) Login manuel
        page.goto(page_url(win_start, win_end, 1), wait_until="domcontentloaded")
        first = page.evaluate(JS_EXTRACT)
        if first["needsLogin"] or (first["header"] is None and not first["rows"]):
            print("\n>>> Connecte-toi a Kajabi dans la fenetre qui vient de s'ouvrir")
            print(">>> (email + mot de passe + 2FA), puis reviens ici et appuie sur Entree.")
            input()
            page.goto(page_url(win_start, win_end, 1), wait_until="domcontentloaded")
            first = page.evaluate(JS_EXTRACT)
            if first["needsLogin"]:
                browser.close()
                sys.exit("Toujours sur l'ecran de login -> arret (fail-closed).")

        total = total_from_header(first["header"])
        pages = (total + ROWS_PER_PAGE - 1) // ROWS_PER_PAGE if total else 1
        if args.max_pages:
            pages = min(pages, args.max_pages)
        print(f"En-tete : {first['header']!r}  ->  {total} transactions, {pages} page(s)")

        # 2) Boucle pages (page 1 déjà chargée)
        for pg in range(1, pages + 1):
            if pg > 1:
                time.sleep(random.uniform(args.pace_min, args.pace_max))  # cadence humaine
                resp = page.goto(page_url(win_start, win_end, pg), wait_until="domcontentloaded")
                if resp and resp.status >= 400:
                    browser.close()
                    sys.exit(f"HTTP {resp.status} page {pg} -> arret (fail-closed).")
                data = page.evaluate(JS_EXTRACT)
            else:
                data = first
            if data["needsLogin"]:
                browser.close()
                sys.exit(f"Redirige vers login page {pg} -> arret (fail-closed).")
            rows = data["rows"]
            if not rows and total:
                browser.close()
                sys.exit(f"0 ligne extraite page {pg} alors que {total} attendues "
                         "-> arret (format change ou blocage ?).")
            for r in rows:
                rec, warn = parse_row(r, win_start, win_end, now)
                if warn:
                    warnings.append(warn)
                if rec:
                    scraped[rec["id"]] = rec
            print(f"  page {pg}/{pages} : {len(rows)} lignes (cumul {len(scraped)})")

        browser.close()

    # 3) Filtre : NOUVELLES transactions uniquement
    existing = fetch_existing_ids(root, key)
    new_recs = [rec for tx, rec in scraped.items() if tx not in existing]

    # Résumé
    by_status, by_provider = {}, {}
    for rec in new_recs:
        st = rec["_scraped"]["row_status"]
        pv = rec["attributes"]["provider"] or "?"
        by_status[st] = by_status.get(st, 0) + 1
        by_provider[pv] = by_provider.get(pv, 0) + 1
    print("\n===== RESUME =====")
    print(f"Transactions extraites   : {len(scraped)}")
    print(f"  deja en base (ignorees): {len(scraped) - len(new_recs)}")
    print(f"  NOUVELLES a inserer    : {len(new_recs)}")
    print(f"  par statut  : {by_status}")
    print(f"  par provider: {by_provider}")
    if warnings:
        print(f"\n  {len(warnings)} avertissement(s) (lignes ignorees par securite) :")
        for w in warnings[:20]:
            print("   - " + w)
        if len(warnings) > 20:
            print(f"   ... (+{len(warnings) - 20})")

    if args.dry_run:
        print("\n[--dry-run] rien n'a ete ecrit en base.")
        return
    if not new_recs:
        print("\nRien de nouveau a inserer.")
        return

    # 4) Upsert par lots
    total_up = 0
    for i in range(0, len(new_recs), args.chunk):
        chunk = new_recs[i:i + args.chunk]
        res = upsert_transactions(root, key, chunk)
        n = res if isinstance(res, int) else (res[0] if isinstance(res, list) and res else res)
        total_up += int(n or 0)
        print(f"  upsert lot {i // args.chunk + 1} : {n} lignes (cumul {total_up})")
    print(f"\nOK. {total_up} transaction(s) inseree(s) dans raw.kajabi_transactions.")
    print("Tes vues app.* et le dashboard sont a jour automatiquement.")


def main():
    ap = argparse.ArgumentParser(description="Sync des transactions Kajabi (admin) vers Supabase.")
    ap.add_argument("--since", help="Date de debut YYYY-MM-DD (defaut: derniere tx en base -3j)")
    ap.add_argument("--until", help="Date de fin YYYY-MM-DD (defaut: aujourd'hui)")
    ap.add_argument("--dry-run", action="store_true", help="Scrape et affiche le resume sans rien ecrire")
    ap.add_argument("--max-pages", type=int, default=0, help="Limite le nombre de pages (test)")
    ap.add_argument("--chunk", type=int, default=500, help="Taille des lots d'upsert")
    ap.add_argument("--pace-min", type=float, default=1.5, help="Delai min entre pages (s)")
    ap.add_argument("--pace-max", type=float, default=3.5, help="Delai max entre pages (s)")
    run(ap.parse_args())


if __name__ == "__main__":
    main()
