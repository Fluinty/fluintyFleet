-- Magazyn, część 2: trigger statusu zamówienia pomija pozycje magazynowe
-- Data: 2026-10-22 (zastępuje wersję z 21.10, która opisywała bazę nieistniejącą na produkcji)
-- Produkcja: projekt Supabase „[Art-Tim] Baza Samochodów” (bsqibeirdfjdphpyqnlx), organizacja „Fluinty”.
-- Uruchomić PO warehouse-items.sql. Definicja funkcji poniżej = pg_get_functiondef z produkcji 22.10.2026
-- plus jeden warunek „AND NOT is_warehouse”.
--
-- Dlaczego tylko to:
-- - widoki vehicle_monthly_spending i vehicle_order_history mają WHERE oi.vehicle_id IS NOT NULL, a orders
--   nie ma kolumny vehicle_id, więc pozycja magazynowa (vehicle_id = NULL) sama z nich wypada;
-- - trigger budżetu check_budget_and_create_alert kończy się na „IF NEW.vehicle_id IS NULL THEN RETURN”;
-- - trigger order_status_trigger (AFTER INSERT OR UPDATE OF vehicle_id) ustawia status W OBIE STRONY:
--   liczy pozycje bez auta i bez tego warunku cofałby zamówienie z olejem na magazynie do 'pending'
--   przy każdym kolejnym przypisaniu.

BEGIN;

CREATE OR REPLACE FUNCTION public.update_order_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    unassigned_count INTEGER;
BEGIN
    -- Count items that still need a vehicle (warehouse items are settled without one)
    SELECT COUNT(*) INTO unassigned_count
    FROM order_items
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
      AND vehicle_id IS NULL
      AND NOT is_warehouse;

    -- Update order status based on unassigned count
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

-- Trigger ma też reagować na zmianę is_warehouse (kod ustawia obie kolumny naraz, ale ręczna poprawka
-- w SQL Editorze samego is_warehouse nie powinna zostawić statusu w złym stanie).
CREATE OR REPLACE TRIGGER order_status_trigger
AFTER INSERT OR UPDATE OF vehicle_id, is_warehouse ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.update_order_status();

COMMIT;

-- ============================================
-- KONTROLA PO URUCHOMIENIU
-- ============================================
SELECT pg_get_functiondef('update_order_status'::regproc) LIKE '%NOT is_warehouse%' AS funkcja_ok,
       pg_get_triggerdef(t.oid) LIKE '%is_warehouse%' AS trigger_ok
FROM pg_trigger t WHERE t.tgname = 'order_status_trigger';
