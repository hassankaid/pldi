# Scraper Kajabi → Supabase

Récupère les **transactions** de l'admin Kajabi (l'API publique n'étant plus
accessible sur le plan Growth) et insère les **nouvelles** dans ta base
Supabase, dans la même table que le backfill d'origine
(`raw.kajabi_transactions`). Tes vues `app.*` et ton dashboard se mettent à jour
tout seuls ensuite.

## Installation (une seule fois)

```powershell
py -m pip install playwright
```

*(Le script utilise ton Google Chrome déjà installé. Pas de téléchargement de
navigateur. Si Chrome n'est pas trouvé, lance `py -m playwright install chromium`.)*

## Utilisation

**1. Test à blanc (ne écrit rien) — à faire en premier :**
```powershell
py scraper\kajabi_sync.py --dry-run
```

**2. Sync réelle :**
```powershell
py scraper\kajabi_sync.py
```

Ce qui se passe :
1. Une fenêtre Chrome s'ouvre sur Kajabi.
2. Tu te connectes normalement (email + mot de passe + **2FA**), puis tu reviens
   dans le terminal et tu appuies sur **Entrée**.
3. Le script parcourt les transactions de la période, puis insère celles qui ne
   sont pas déjà en base, et affiche un résumé.

Par défaut il récupère depuis la **dernière transaction connue en base** (moins
3 jours de sécurité) jusqu'à aujourd'hui. Pour choisir la période :

```powershell
py scraper\kajabi_sync.py --since 2026-06-01 --until 2026-07-21
```

Autres options : `--max-pages N` (test rapide), `--chunk N`, `--pace-min/--pace-max`
(délai entre pages).

## Sécurité (anti-blocage)

- Tourne sur **ta machine**, ton **Chrome**, ton **IP** → ressemble à une
  connexion admin normale.
- Connexion **manuelle** à chaque run (ta 2FA à la main). Aucune 2FA automatisée.
- **Lecture seule** : uniquement des `GET`, jamais un clic qui modifie.
- Cadence humaine (délai aléatoire entre les pages), 1 run/jour suffit.
- **Fail-closed** : au moindre écran de login inattendu, erreur HTTP, ou
  changement de format, le script **s'arrête** au lieu d'insister.
- On n'insère **que les nouvelles** transactions → jamais d'écrasement de
  données existantes.

## Limites de cette v1 (assumées, simples)

- **Insertion seule des nouvelles lignes.** Les remboursements et retries
  arrivent comme de nouvelles transactions (nouvel ID), donc bien captés. Une
  éventuelle modification *sur place* d'une transaction déjà en base ne serait
  pas mise à jour (rare).
- **Provider** (Stripe/PayPal) lu directement sur la ligne — fiable.
- **Date** : précise au jour près (l'heure exacte peut varier de ~2 h ; sans
  impact sur le mois comptable).
- **Contacts** : les tout nouveaux clients ne sont pas encore enrichis (nom,
  etc.) ; l'e-mail est conservé pour rattachement ultérieur.
- Config lue depuis `web/.env.local` (clé service Supabase). Rien de sensible
  n'est commité (voir `.gitignore`).

## Si l'authentification saute

Relance simplement le script et reconnecte-toi : tu es sur ton PC de travail,
c'est l'affaire de 30 secondes.
