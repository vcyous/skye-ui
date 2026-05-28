-- Apply on the live Supabase database before storefront checkout goes live.
-- Run with: psql or supabase mcp execute_sql (write mode).
--
-- Allows anon (storefront) to insert orders + order_items. Existing RLS
-- policies orders_anon_insert + order_items_anon_insert already bound the
-- inserts to published stores; these grants unlock the table-level privilege.

GRANT INSERT ON public.orders TO anon;
GRANT INSERT ON public.order_items TO anon;

-- generate_order_number trigger pulls nextval from order_number_seq.
GRANT USAGE, SELECT ON SEQUENCE public.order_number_seq TO anon;

-- PostgREST insert-then-select needs read privilege too.
GRANT SELECT ON public.orders TO anon;
GRANT SELECT ON public.order_items TO anon;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.orders'::regclass AND polname = 'orders_anon_read'
  ) THEN
    CREATE POLICY orders_anon_read ON public.orders
      FOR SELECT TO anon
      USING (store_id IN (SELECT id FROM public.stores WHERE is_published = true));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.order_items'::regclass AND polname = 'order_items_anon_read'
  ) THEN
    CREATE POLICY order_items_anon_read ON public.order_items
      FOR SELECT TO anon
      USING (
        order_id IN (
          SELECT o.id FROM public.orders o
          JOIN public.stores s ON s.id = o.store_id
          WHERE s.is_published = true
        )
      );
  END IF;
END $$;
