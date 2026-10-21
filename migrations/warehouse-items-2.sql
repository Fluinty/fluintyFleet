-- Magazyn, część 2: pozycja magazynowa nie może dziedziczyć auta z nagłówka zamówienia
-- Data: 2026-10-21
-- Uruchomić w Supabase SQL Editor na PRODUKCJI (fleet-manager-prod) po warehouse-items.sql.
-- Źródło definicji: pg_get_viewdef / pg_get_functiondef z produkcji 21.10.2026 13:34.
-- Zmiana w każdym obiekcie to wyłącznie dopisanie warunku "NOT is_warehouse" — reszta 1:1.

BEGIN;

-- 1. Trigger domykający zamówienie: pozycja magazynowa ma vehicle_id = NULL z definicji,
--    więc bez tego warunku zamówienie z olejem na magazynie nigdy nie zostałoby 'completed'.
--    (Kod aplikacji robi to też sam w completeOrderIfResolved — tu zamykamy drugą drogę.)
CREATE OR REPLACE FUNCTION public.check_order_completion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Check if all items in the order now have a vehicle_id (warehouse items don't need one)
    IF NOT EXISTS (
        SELECT 1 FROM order_items
        WHERE order_id = NEW.order_id
        AND vehicle_id IS NULL
        AND NOT is_warehouse
    ) THEN
        -- All items have been assigned to vehicles or the warehouse, mark order as completed
        UPDATE orders SET status = 'completed' WHERE id = NEW.order_id;
    END IF;
    RETURN NEW;
END;
$function$;

-- 2. Wydatki miesięczne per auto: bez pozycji magazynowych.
--    COALESCE(oi.vehicle_id, o.vehicle_id) brał auto z nagłówka zamówienia, gdy pozycja go nie miała —
--    pozycja magazynowa obciążałaby więc auto z "zastosuj do wszystkich". Ten sam układ kolumn co dotąd.
CREATE OR REPLACE VIEW public.vehicle_monthly_spending AS
SELECT COALESCE(oi.vehicle_id, o.vehicle_id) AS vehicle_id,
    v.registration_number,
    date_trunc('month'::text, o.order_date) AS month,
    count(*) AS items_count,
    sum(oi.total_net) AS total_net,
    sum(oi.total_gross) AS total_gross
FROM ((order_items oi
    JOIN orders o ON ((oi.order_id = o.id)))
    LEFT JOIN vehicles v ON ((v.id = COALESCE(oi.vehicle_id, o.vehicle_id))))
WHERE (COALESCE(oi.vehicle_id, o.vehicle_id) IS NOT NULL)
  AND NOT oi.is_warehouse
GROUP BY (COALESCE(oi.vehicle_id, o.vehicle_id)), v.registration_number, (date_trunc('month'::text, o.order_date));

-- vehicles_over_budget czyta z vehicle_monthly_spending, więc naprawia się sam — nie ruszamy.

-- 3. Historia zamówień auta: bez pozycji magazynowych. Ten sam układ kolumn co dotąd.
CREATE OR REPLACE VIEW public.vehicle_order_history AS
SELECT o.id AS order_id,
    o.intercars_id,
    o.order_date,
    o.total_gross AS order_total,
    o.status,
    oi.id AS item_id,
    oi.name AS item_name,
    oi.sku,
    oi.total_gross AS item_total,
    COALESCE(oi.vehicle_id, o.vehicle_id) AS vehicle_id,
    v.registration_number
FROM ((order_items oi
    JOIN orders o ON ((oi.order_id = o.id)))
    LEFT JOIN vehicles v ON ((v.id = COALESCE(oi.vehicle_id, o.vehicle_id))))
WHERE (COALESCE(oi.vehicle_id, o.vehicle_id) IS NOT NULL)
  AND NOT oi.is_warehouse;

COMMIT;

-- ============================================
-- KONTROLA PO URUCHOMIENIU (każde zapytanie osobno)
-- ============================================

-- a) funkcja ma nowy warunek
SELECT pg_get_functiondef('check_order_completion'::regproc) LIKE '%NOT is_warehouse%' AS funkcja_ok;

-- b) oba widoki mają nowy warunek, trzeci nadal działa
SELECT pg_get_viewdef('vehicle_monthly_spending'::regclass, true) LIKE '%is_warehouse%' AS spending_ok,
       pg_get_viewdef('vehicle_order_history'::regclass, true)   LIKE '%is_warehouse%' AS history_ok,
       (SELECT count(*) FROM vehicles_over_budget) AS over_budget_wierszy;
