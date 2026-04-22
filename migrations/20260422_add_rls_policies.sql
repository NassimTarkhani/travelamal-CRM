-- Migration: Add RLS policies for auth/profile/client flows
-- Date: 2026-04-22

BEGIN;

-- Helper role function (safe to recreate)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Ensure RLS is enabled on all app tables.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Drop known legacy/current policies to avoid duplicates/conflicts.
DROP POLICY IF EXISTS "Profiles admin full access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles authenticated read" ON public.profiles;
DROP POLICY IF EXISTS "Profiles self update" ON public.profiles;
DROP POLICY IF EXISTS "Profiles self insert" ON public.profiles;

DROP POLICY IF EXISTS "Clients admin full access" ON public.clients;
DROP POLICY IF EXISTS "Clients employe select" ON public.clients;
DROP POLICY IF EXISTS "Clients employe insert" ON public.clients;
DROP POLICY IF EXISTS "Clients employe update" ON public.clients;
DROP POLICY IF EXISTS "Clients insert by role" ON public.clients;
DROP POLICY IF EXISTS "Clients insert authenticated" ON public.clients;

DROP POLICY IF EXISTS "Payments admin full access" ON public.payments;
DROP POLICY IF EXISTS "Payments employe select" ON public.payments;
DROP POLICY IF EXISTS "Payments employe insert" ON public.payments;
DROP POLICY IF EXISTS "Payments employe update" ON public.payments;

DROP POLICY IF EXISTS "Activities admin full access" ON public.activities;
DROP POLICY IF EXISTS "Activities employe select" ON public.activities;
DROP POLICY IF EXISTS "Activities employe insert" ON public.activities;
DROP POLICY IF EXISTS "Activities employe update" ON public.activities;

DROP POLICY IF EXISTS "Expenses view for everyone" ON public.expenses;
DROP POLICY IF EXISTS "Expenses insert for everyone" ON public.expenses;
DROP POLICY IF EXISTS "Expenses delete for admin" ON public.expenses;

-- profiles policies
CREATE POLICY "Profiles admin full access" ON public.profiles
  FOR ALL
  USING (public.current_user_role() = 'Admin')
  WITH CHECK (public.current_user_role() = 'Admin');

CREATE POLICY "Profiles authenticated read" ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profiles self insert" ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND id = auth.uid()
    AND (role IN ('Admin', 'Employé'))
  );

CREATE POLICY "Profiles self update" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- clients policies
CREATE POLICY "Clients admin full access" ON public.clients
  FOR ALL
  USING (public.current_user_role() = 'Admin')
  WITH CHECK (public.current_user_role() = 'Admin');

CREATE POLICY "Clients employe select" ON public.clients
  FOR SELECT
  USING (public.current_user_role() = 'Employé');

CREATE POLICY "Clients insert authenticated" ON public.clients
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (created_by = auth.uid() OR public.current_user_role() = 'Admin')
  );

CREATE POLICY "Clients employe update" ON public.clients
  FOR UPDATE
  USING (public.current_user_role() = 'Employé')
  WITH CHECK (public.current_user_role() = 'Employé');

-- payments policies
CREATE POLICY "Payments admin full access" ON public.payments
  FOR ALL
  USING (public.current_user_role() = 'Admin')
  WITH CHECK (public.current_user_role() = 'Admin');

CREATE POLICY "Payments employe select" ON public.payments
  FOR SELECT
  USING (public.current_user_role() = 'Employé');

CREATE POLICY "Payments employe insert" ON public.payments
  FOR INSERT
  WITH CHECK (public.current_user_role() = 'Employé');

CREATE POLICY "Payments employe update" ON public.payments
  FOR UPDATE
  USING (public.current_user_role() = 'Employé')
  WITH CHECK (public.current_user_role() = 'Employé');

-- activities policies
CREATE POLICY "Activities admin full access" ON public.activities
  FOR ALL
  USING (public.current_user_role() = 'Admin')
  WITH CHECK (public.current_user_role() = 'Admin');

CREATE POLICY "Activities employe select" ON public.activities
  FOR SELECT
  USING (public.current_user_role() = 'Employé');

CREATE POLICY "Activities employe insert" ON public.activities
  FOR INSERT
  WITH CHECK (public.current_user_role() = 'Employé');

CREATE POLICY "Activities employe update" ON public.activities
  FOR UPDATE
  USING (public.current_user_role() = 'Employé')
  WITH CHECK (public.current_user_role() = 'Employé');

-- expenses policies
CREATE POLICY "Expenses view for everyone" ON public.expenses
  FOR SELECT
  USING (auth.uid() = created_by OR public.current_user_role() = 'Admin');

CREATE POLICY "Expenses insert for everyone" ON public.expenses
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Expenses delete for admin" ON public.expenses
  FOR DELETE
  USING (public.current_user_role() = 'Admin');

COMMIT;
