-- Magazyn: pozycja zamówienia może trafić na magazyn zamiast do pojazdu
-- Data: 2026-10-21
-- Uruchomić w Supabase SQL Editor na PRODUKCJI przed wdrożeniem kodu z gałęzi feature/magazyn.
-- Powód: panel pozwalał przypisać pozycję tylko do numeru rejestracyjnego (mail M. Domaradzkiej 21.10).

-- 1. Znacznik "na magazyn" na pozycji zamówienia.
--    vehicle_id zostaje NULL (pozycja nie obciąża żadnego auta), a is_warehouse mówi,
--    że to nie jest pozycja do weryfikacji, tylko świadomie odłożona na magazyn.
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS is_warehouse BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS order_items_is_warehouse_idx
  ON order_items (is_warehouse) WHERE is_warehouse;

-- 2. Kolejka "Wymagana weryfikacja" nie pokazuje pozycji magazynowych.
--    Definicja 1:1 z production-multi-branch-complete.sql, zmieniony tylko warunek WHERE.
DROP VIEW IF EXISTS unresolved_pending_items;

CREATE VIEW unresolved_pending_items AS
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
  AND NOT oi.is_warehouse;

-- 3. Wydatki na magazyn per oddział i miesiąc (na później, pod limit magazynu).
--    Nic z tego jeszcze nie czyta; widok jest po to, żeby dane były od razu do wzięcia.
DROP VIEW IF EXISTS warehouse_monthly_spending;

CREATE VIEW warehouse_monthly_spending AS
SELECT
    o.branch_id,
    o.branch_code,
    date_trunc('month', o.order_date)::date AS month,
    count(*) AS items_count,
    sum(oi.total_net) AS total_net,
    sum(oi.total_gross) AS total_gross
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE oi.is_warehouse
GROUP BY o.branch_id, o.branch_code, date_trunc('month', o.order_date);

-- ============================================
-- KONTROLA PO URUCHOMIENIU
-- ============================================

-- a) kolumna istnieje
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'order_items' AND column_name = 'is_warehouse';

-- b) widoki istnieją
SELECT table_name FROM information_schema.views
WHERE table_name IN ('unresolved_pending_items', 'warehouse_monthly_spending');

-- c) TRIGGER NA order_items — DO SPRAWDZENIA RĘCZNIE.
--    Komentarz w app/actions/resolve-pending-item.ts mówi, że trigger ustawia orders.status = 'completed',
--    gdy wszystkie pozycje mają vehicle_id. Pozycja magazynowa ma vehicle_id = NULL, więc taki trigger
--    uzna zamówienie za niedomknięte. Kod aplikacji domyka status sam (completeOrderIfResolved),
--    ale definicję triggera trzeba zobaczyć i w razie potrzeby dopisać "AND NOT is_warehouse".
SELECT tgname, pg_get_triggerdef(t.oid) AS definicja
FROM pg_trigger t
WHERE t.tgrelid = 'order_items'::regclass AND NOT t.tgisinternal;
