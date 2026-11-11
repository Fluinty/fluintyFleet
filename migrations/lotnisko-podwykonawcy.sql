-- Zakładki „Lotnisko” i „Podwykonawcy” na liście pojazdów (11.11.2026)
--
-- 1. vehicles.is_subcontractor: auto podwykonawcy. Zostaje w „Wszystkie”, ma własną zakładkę
--    i nie dostaje przypomnień o przeglądach, polisach ani UDT (pomija je kod w n8n).
--    Ta sama kolumna w vehicles_archive, żeby kopia auta przy archiwizacji była pełna.
-- 2. profiles.can_view_airport: podgląd aut lotniskowych ze wszystkich oddziałów.
--    Zasady RLS tabeli vehicles się nie zmieniają. Zakładka czyta auta przez funkcję airport_vehicles(),
--    więc kierownik z flagą widzi auta lotniskowe innych oddziałów tylko tam (i na ich karcie, bez edycji),
--    a pulpit, listy wyboru auta i reszta panelu wyglądają dla niego jak dotąd.
-- 3. Flaga dla Bartosza Górskiego i Jakuba Pawlaka (decyzja Artura z 10.11.2026).

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS is_subcontractor boolean NOT NULL DEFAULT false;
ALTER TABLE public.vehicles_archive ADD COLUMN IF NOT EXISTS is_subcontractor boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.vehicles.is_subcontractor IS 'Auto podwykonawcy: zakładka Podwykonawcy, bez przypomnień o terminach (n8n)';

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_view_airport boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.profiles.can_view_airport IS 'Podgląd aut lotniskowych ze wszystkich oddziałów (zakładka Lotnisko), bez edycji';

CREATE OR REPLACE FUNCTION public.airport_vehicles()
RETURNS SETOF public.vehicles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT v.*
    FROM public.vehicles v
    WHERE v.is_airport
      AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = (SELECT auth.uid())
            AND (p.role = 'admin' OR p.can_view_airport)
      );
$$;

COMMENT ON FUNCTION public.airport_vehicles() IS 'Auta lotniskowe ze wszystkich oddziałów dla admina i osób z profiles.can_view_airport; pozostali dostają pustą listę';
REVOKE ALL ON FUNCTION public.airport_vehicles() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.airport_vehicles() FROM anon;
GRANT EXECUTE ON FUNCTION public.airport_vehicles() TO authenticated;

UPDATE public.profiles
SET can_view_airport = true
WHERE id IN (
    SELECT id FROM auth.users
    WHERE lower(email) IN ('bgorski@ups-transport.pl', 'jpawlak@ups-transport.pl')
);
