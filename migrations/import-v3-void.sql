-- Import v3 (2026-10-22): status 'void' = zamówienie nieaktualne (InterCars przestał je zwracać albo
-- wydał pod nowym numerem), widok pomocniczy dla importu w n8n, widoki i trigger pomijają 'void'.
-- Produkcja: „[Art-Tim] Baza Samochodów” (bsqibeirdfjdphpyqnlx). Uruchomione przez MCP 22.10.2026.
-- Kontekst: InterCars przenumerowuje zlecenia (stare /2/ znika z API, pojawia się /3/ z tą samą kwotą) i usuwa
-- anulowane. Import z oknem jednego dnia tego nie widział, więc w bazie zostawały stare numery i duble.

BEGIN;

-- 1. Co import ma wiedzieć o każdym zamówieniu: numer, kwota, status i czy ktoś już przypisał pozycje
CREATE OR REPLACE VIEW orders_import_state AS
SELECT o.id,
       o.intercars_id,
       o.total_gross,
       o.status,
       o.is_manual,
       o.order_date,
       o.branch_code,
       (SELECT count(*) FROM order_items oi WHERE oi.order_id = o.id AND oi.vehicle_id IS NOT NULL) AS assigned_items,
       (SELECT count(*) FROM order_items oi WHERE oi.order_id = o.id AND oi.is_warehouse) AS warehouse_items
FROM orders o;

-- 2. Kolejka bez nieaktualnych (te same kolumny co dotąd)
CREATE OR REPLACE VIEW unresolved_pending_items AS
SELECT
    oi.id AS item_id,
    oi.name AS item_name,
    oi.sku,
    oi.total_gross AS item_total,
    oi.resolved,
    oi.resolved_at,
    oi.resolved_by,
    o.id AS order_id,
    o.intercars_id,
    o.order_date,
    o.total_gross AS order_total,
    o.raw_comment,
    o.branch_code,
    o.branch_id,
    now() - o.order_date AS pending_duration
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE oi.vehicle_id IS NULL
  AND NOT oi.is_warehouse
  AND o.status <> 'void';

-- 3. Widoki kosztów bez nieaktualnych (te same kolumny co dotąd)
CREATE OR REPLACE VIEW vehicle_monthly_spending AS
SELECT oi.vehicle_id,
    v.plate_number,
    to_char(date_trunc('month'::text, o.order_date), 'YYYY-MM-DD'::text) AS month,
    sum(COALESCE(oi.total_gross, 0::numeric)) AS total_spent,
    count(DISTINCT o.id) AS order_count
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
LEFT JOIN vehicles v ON v.id = oi.vehicle_id
WHERE oi.vehicle_id IS NOT NULL
  AND o.status <> 'void'
GROUP BY oi.vehicle_id, v.plate_number, (date_trunc('month'::text, o.order_date));

CREATE OR REPLACE VIEW vehicle_order_history AS
SELECT oi.vehicle_id,
    oi.id AS item_id,
    oi.name AS item_name,
    oi.sku,
    oi.total_gross,
    oi.required_quantity,
    o.id AS order_id,
    o.order_date,
    o.intercars_id,
    o.branch_code
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE oi.vehicle_id IS NOT NULL
  AND o.status <> 'void'
ORDER BY o.order_date DESC;

DROP VIEW IF EXISTS warehouse_monthly_spending;
CREATE VIEW warehouse_monthly_spending
WITH (security_invoker = true) AS
SELECT
    COALESCE(o.branch_id, b.id) AS branch_id,
    COALESCE(o.branch_code, b.code) AS branch_code,
    date_trunc('month', o.order_date)::date AS month,
    count(*) AS items_count,
    sum(oi.total_net) AS total_net,
    sum(oi.total_gross) AS total_gross
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
LEFT JOIN branches b ON b.code = o.branch_code
WHERE oi.is_warehouse
  AND o.status <> 'void'
GROUP BY COALESCE(o.branch_id, b.id), COALESCE(o.branch_code, b.code), date_trunc('month', o.order_date);

-- 4. Trigger statusu nie cofa 'void' do pending/completed
CREATE OR REPLACE FUNCTION public.update_order_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    unassigned_count INTEGER;
    current_status TEXT;
BEGIN
    SELECT status INTO current_status FROM orders WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    IF current_status = 'void' THEN
        RETURN NEW;
    END IF;

    -- Count items that still need a vehicle (warehouse items are settled without one)
    SELECT COUNT(*) INTO unassigned_count
    FROM order_items
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
      AND vehicle_id IS NULL
      AND NOT is_warehouse;

    IF unassigned_count = 0 THEN
        UPDATE orders SET status = 'completed'
        WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    ELSE
        UPDATE orders SET status = 'pending'
        WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    END IF;

    RETURN NEW;
END;
$function$;

COMMIT;

-- KONTROLA
SELECT (SELECT count(*) FROM orders_import_state) AS widok_importu,
       (SELECT count(*) FROM unresolved_pending_items) AS kolejka,
       pg_get_viewdef('unresolved_pending_items'::regclass, true) LIKE '%void%' AS kolejka_void,
       pg_get_functiondef('update_order_status'::regproc) LIKE '%void%' AS trigger_void;
