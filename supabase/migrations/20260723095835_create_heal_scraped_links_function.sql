-- heal_scraped_links() — répare le lien Ventes après une synchro par scraping.
--
-- Contexte : le scraper insère les transactions via upsert_kajabi_transactions, qui
-- ne renseigne PAS purchase_id (ni depuis _scraped, ni depuis relationships.purchase).
-- Or app.payments.sale_id = raw.kajabi_transactions.purchase_id, et app.sales part de
-- raw.kajabi_purchases : sans purchase_id, les paiements scrapés sont orphelins de
-- app.sales et installment_n est faussé (toutes les lignes à purchase_id NULL tombent
-- dans une même partition).
--
-- Cette fonction, idempotente, à appeler après chaque upsert de scraping :
--   1) pose purchase_id = payload->'_scraped'->>'charge_id' là où il manque ;
--   2) reconstruit tout achat (plan) référencé par une transaction mais absent de
--      raw.kajabi_purchases (montant modal des charges réussies, type/devise/client/
--      offre par mode, dates min/max, transaction_ids agrégés).
-- Retour : {"purchase_ids_set": N, "purchases_reconstructed": M}.

CREATE OR REPLACE FUNCTION public.heal_scraped_links()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, raw, app
AS $fn$
DECLARE
  v_updated       int;
  v_reconstructed int;
BEGIN
  -- 1) Renseigne purchase_id (= charge_id scrapé) sur les lignes scrapées où il manque.
  WITH upd AS (
    UPDATE raw.kajabi_transactions
       SET purchase_id = payload->'_scraped'->>'charge_id'
     WHERE purchase_id IS NULL
       AND payload->'_scraped'->>'charge_id' IS NOT NULL
    RETURNING 1
  )
  SELECT count(*) INTO v_updated FROM upd;

  -- 2) Reconstruit tout achat (plan) référencé par une transaction mais absent de kajabi_purchases.
  WITH ins AS (
    INSERT INTO raw.kajabi_purchases (
      kajabi_id, amount_in_cents, payment_type, currency, customer_id, offer_id,
      created_at, updated_at, multipay_payments_made, transaction_ids, source, payload, synced_at
    )
    SELECT
      t.purchase_id,
      mode() WITHIN GROUP (ORDER BY t.amount_in_cents)
        FILTER (WHERE t.state = 'succeeded' AND t.action <> 'refund'),
      mode() WITHIN GROUP (ORDER BY t.payment_type),
      mode() WITHIN GROUP (ORDER BY t.currency),
      mode() WITHIN GROUP (ORDER BY t.customer_id),
      mode() WITHIN GROUP (ORDER BY t.offer_id),
      min(t.created_at),
      max(t.created_at),
      count(*) FILTER (WHERE t.state = 'succeeded' AND t.action <> 'refund'),
      array_agg(t.kajabi_id),
      'reconstructed_from_scrape',
      jsonb_build_object('_reconstructed', true, 'from', 'heal_scraped_links'),
      now()
    FROM raw.kajabi_transactions t
    WHERE t.purchase_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM raw.kajabi_purchases p WHERE p.kajabi_id = t.purchase_id
      )
    GROUP BY t.purchase_id
    ON CONFLICT (kajabi_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_reconstructed FROM ins;

  RETURN json_build_object(
    'purchase_ids_set',        v_updated,
    'purchases_reconstructed', v_reconstructed
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.heal_scraped_links() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.heal_scraped_links() TO service_role;
