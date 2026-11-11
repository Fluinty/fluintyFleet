-- Podgląd dowodów i polis w panelu (11.11.2026)
--
-- Plik idzie z Dysku przez workflow n8n „Art-Tim: dokumenty aut dla panelu”, więc foldery na Dysku nie muszą być
-- udostępnione linkiem. Panel wydaje dowód i polisę każdemu, kto widzi dane auto w panelu (ustalenie z 11.11:
-- kto dostaje maile o aucie, ten widzi jego dokumenty). Osobnego uprawnienia do dokumentów nie ma.
-- Adres i sekret workflow są w Vault. Zapisuje je i czyta wyłącznie klucz serwisowy (panel po stronie serwera).
-- Wartości wpisuje skrypt lokalny przez set_docs_webhook_config, nigdy w tym pliku.

CREATE OR REPLACE FUNCTION public.set_docs_webhook_config(p_url text, p_secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_id uuid;
BEGIN
    SELECT id INTO v_id FROM vault.secrets WHERE name = 'arttim_docs_url';
    IF v_id IS NULL THEN
        PERFORM vault.create_secret(p_url, 'arttim_docs_url', 'Adres workflow n8n z dokumentami aut');
    ELSE
        PERFORM vault.update_secret(v_id, p_url);
    END IF;

    SELECT id INTO v_id FROM vault.secrets WHERE name = 'arttim_docs_secret';
    IF v_id IS NULL THEN
        PERFORM vault.create_secret(p_secret, 'arttim_docs_secret', 'Nagłówek X-Docs-Secret dla workflow n8n z dokumentami aut');
    ELSE
        PERFORM vault.update_secret(v_id, p_secret);
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.docs_webhook_config()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT json_build_object(
        'url', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'arttim_docs_url'),
        'secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'arttim_docs_secret')
    );
$$;

REVOKE ALL ON FUNCTION public.set_docs_webhook_config(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.docs_webhook_config() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_docs_webhook_config(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.docs_webhook_config() TO service_role;
