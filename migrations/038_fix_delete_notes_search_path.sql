-- Supabase security: pin search_path on trigger function (mutable search_path warning).

CREATE OR REPLACE FUNCTION public.delete_notes_for_entity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notes
  WHERE entity_type = TG_ARGV[0]
    AND entity_id = OLD.id;
  RETURN OLD;
END;
$$;
