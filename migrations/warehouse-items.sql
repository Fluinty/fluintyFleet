-- Magazyn: pozycja zamówienia może trafić na magazyn zamiast do pojazdu
-- Data: 2026-10-21
-- Uruchomić w Supabase SQL Editor na PRODUKCJI PRZED wdrożeniem kodu z gałęzi feature/magazyn.
-- Kolejność ma znaczenie: kod dopisuje is_warehouse do każdego przypisania pojazdu, więc bez
-- kolumny padnie także zwykłe "Przypisz". Najpierw SQL, kontrola a)-c), dopiero potem merge.
-- Powód zmiany: panel pozwalał przypisać pozycję tylko do numeru rejestracyjnego (mail M. Domaradzkiej 21.10).

BEGIN;

-- 1. Znacznik "na magazyn" na pozycji zamówienia.
--    vehicle_id zostaje NULL (pozycja nie obciąża żadnego auta), a is_warehouse mówi,
--    że to nie jest pozycja do weryfikacji, tylko świadomie odłożona na magazyn.
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS is_warehouse BOOLEAN NOT NULL DEFAULT false;

-- Pozycja nie może być jednocześnie na aucie i na magazynie. Bezpieczne: kolumna startuje z false.
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_warehouse_xor_vehicle;
ALTER TABLE order_items
  ADD CONSTRAINT order_items_warehouse_xor_vehicle
  CHECK (NOT (is_warehouse AND vehicle_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS order_items_is_warehouse_idx
  ON order_items (is_warehouse) WHERE is_warehouse;

-- 2. Kolejka "Wymagana weryfikacja" nie pokazuje pozycji magazynowych.
--    Te same kolumny co w production-multi-branch-complete.sql, zmieniony tylko warunek WHERE.
--    CREATE OR REPLACE zatrzyma się z błędem, gdyby widok na produkcji miał inne kolumny.
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
  AND NOT oi.is_warehouse;

-- 3. Wydatki na magazyn per oddział i miesiąc (na później, pod limit magazynu).
--    Nic z tego jeszcze nie czyta. security_invoker: menedżer widzi tylko swoje oddziały (RLS z order_items/orders).
--    Oddział po branch_id, a gdy go brak — po kodzie (część zamówień ma tylko branch_code).
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
GROUP BY COALESCE(o.branch_id, b.id), COALESCE(o.branch_code, b.code), date_trunc('month', o.order_date);

COMMIT;

-- ============================================
-- KONTROLA PO URUCHOMIENIU (każde zapytanie osobno)
-- ============================================

-- a) kolumna i ograniczenie istnieją
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'order_items' AND column_name = 'is_warehouse';

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'order_items'::regclass AND conname = 'order_items_warehouse_xor_vehicle';

-- b) widoki istnieją
SELECT table_name FROM information_schema.views
WHERE table_name IN ('unresolved_pending_items', 'warehouse_monthly_spending');

-- c) TRIGGER NA order_items — PRZECZYTAĆ TREŚĆ FUNKCJI.
--    Komentarz w app/actions/resolve-pending-item.ts mówi, że trigger ustawia orders.status = 'completed',
--    gdy wszystkie pozycje mają vehicle_id. Pozycja magazynowa ma vehicle_id = NULL. Kod domyka status sam
--    (completeOrderIfResolved) w każdej ścieżce, ale jeśli funkcja triggera potrafi też COFNĄĆ status
--    na 'pending', trzeba jej dopisać "AND NOT is_warehouse".
SELECT t.tgname,
       pg_get_triggerdef(t.oid)  AS definicja,
       pg_get_functiondef(t.tgfoid) AS funkcja
FROM pg_trigger t
WHERE t.tgrelid = 'order_items'::regclass AND NOT t.tgisinternal;

-- d) WIDOKI KOSZTÓW — SPRAWDZIĆ, CZY NIE DZIEDZICZĄ orders.vehicle_id.
--    SPECS.md mówi: "jeśli order_items.vehicle_id jest NULL, dziedziczy z orders". Gdyby któryś z tych
--    widoków robił COALESCE(oi.vehicle_id, o.vehicle_id), pozycja magazynowa obciążyłaby auto z nagłówka
--    zamówienia. Wtedy dopisać w tym widoku "AND NOT oi.is_warehouse".
SELECT 'vehicle_monthly_spending' AS widok, pg_get_viewdef('vehicle_monthly_spending'::regclass, true)
UNION ALL SELECT 'vehicles_over_budget', pg_get_viewdef('vehicles_over_budget'::regclass, true)
UNION ALL SELECT 'vehicle_order_history', pg_get_viewdef('vehicle_order_history'::regclass, true);
