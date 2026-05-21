-- ============================================================================
-- Bug détecté en prod : PostgREST plafonne par défaut à 1000 rows par réponse.
-- Conséquence : sur le dashboard, /sales montre 1000 sur 4436 ventes,
-- /customers 1000 sur 2798, etc. Données tronquées silencieusement.
--
-- Fix : augmenter le max-rows à 50000 via le GUC PostgREST sur le role
-- authenticator (couvre largement nos plus gros volumes -- 11896 transactions
-- aujourd'hui -- avec marge pour le futur).
-- ============================================================================

ALTER ROLE authenticator SET pgrst.db_max_rows = 50000;
NOTIFY pgrst, 'reload config';
