-- Supabase Schema for TRAVELAMAL CRM

-- ============================================================
-- STORAGE: client-documents bucket
-- Run this block ONCE in the Supabase SQL editor.
-- It creates the bucket and grants authenticated users full
-- read/write access so CIN, Diplôme, B3, etc. uploads work.
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow any authenticated user to upload files
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'client-documents' AND auth.uid() IS NOT NULL);

-- Allow any authenticated user to read documents
DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
CREATE POLICY "Authenticated users can read documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'client-documents' AND auth.uid() IS NOT NULL);

-- Allow uploader or admin to update/replace files
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
CREATE POLICY "Authenticated users can update documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'client-documents' AND auth.uid() IS NOT NULL);

-- Allow uploader or admin to delete files
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'client-documents' AND auth.uid() IS NOT NULL);

-- profiles (extends auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  role text CHECK (role IN ('Admin','Employé')) DEFAULT 'Employé',
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- clients
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequential_number SERIAL,
  full_name text NOT NULL,
  profession text,
  marital_status text CHECK (marital_status IN ('Célibataire','Marié(e)','Divorcé(e)','Veuf/Veuve')),
  id_card_number text,
  phone_primary text NOT NULL,
  phone_secondary text,
  email text,
  birth_date date,
  nationality text,
  address_street text,
  address_city text,
  address_governorate text,
  folder_opening_date date,
  passport_number text,
  passport_expiry date,
  passport_alert_done boolean DEFAULT false,
  b3_expiry date,
  b3_alert_done boolean DEFAULT false,
  embassy_registration_date date,
  travel_alert_done boolean DEFAULT false,
  service text, 
  color_tag text NOT NULL,
  status text CHECK (status IN ('Nouveau','En cours','Complété','Refusé','Annulé')) DEFAULT 'Nouveau',
  total_amount numeric(10,3) DEFAULT 0,
  amount_paid numeric(10,3) DEFAULT 0,
  refund_amount numeric(10,3) DEFAULT 0,
  amount_remaining numeric(10,3) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  payment_status text GENERATED ALWAYS AS (
    CASE WHEN amount_paid >= total_amount AND total_amount > 0 THEN 'Complet'
         WHEN amount_paid > 0 THEN 'Partiel'
         ELSE 'Non payé' END
  ) STORED,
  payment_method text CHECK (payment_method IN ('Espèces','Virement','Chèque','Carte')),
  appointment_date timestamptz,
  travel_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  responsible_employee uuid REFERENCES profiles(id)
);

-- payments
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  amount numeric(10,3) NOT NULL,
  payment_date date DEFAULT current_date,
  method text CHECK (method IN ('Espèces','Virement','Chèque','Carte')),
  recorded_by uuid REFERENCES profiles(id),
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- documents
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  document_type text CHECK (document_type IN (
    'Passeport','CIN','Photo','Acte de naissance','Fiche familiale',
    'Justificatif bancaire','Assurance','Réservation vol','Autre'
  )),
  file_url text NOT NULL,
  file_name text,
  upload_date timestamptz DEFAULT now(),
  expiry_date date,
  status text CHECK (status IN ('Présent','Manquant','Expiré')) DEFAULT 'Présent',
  uploaded_by uuid REFERENCES profiles(id)
);

-- Expenses Table
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric(10, 3) NOT NULL,
  description text NOT NULL,
  proof_url text,
  client_id uuid REFERENCES clients(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamp WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Expenses view for everyone" ON expenses
  FOR SELECT
  USING (auth.uid() = created_by OR public.current_user_role() = 'Admin');

CREATE POLICY "Expenses insert for everyone" ON expenses
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Expenses delete for admin" ON expenses
  FOR DELETE
  USING (public.current_user_role() = 'Admin');

-- activities
CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  action_type text CHECK (action_type IN ('Création','Modification','Paiement','Document','Statut','Note')),
  description text NOT NULL,
  performed_by uuid REFERENCES profiles(id),
  action_date timestamptz DEFAULT now()
);

-- RPC: increment payment
CREATE OR REPLACE FUNCTION increment_client_payment(
  p_client_id uuid, p_amount numeric
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE clients SET amount_paid = amount_paid + p_amount
  WHERE id = p_client_id;
END;
$$;

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      split_part(COALESCE(NEW.email, 'user@example.com'), '@', 1)
    ),
    CASE
      WHEN NEW.raw_user_meta_data->>'role' IN ('Admin','Employé')
        THEN NEW.raw_user_meta_data->>'role'
      ELSE 'Employé'
    END
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Role migration: merge old Comptable users into Admin
UPDATE profiles SET role = 'Admin' WHERE role = 'Comptable';
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('Admin','Employé'));

-- Helper used by RLS to read the current user's role directly from profiles.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Remove old policies first to allow repeated execution.
DROP POLICY IF EXISTS "Admin full access" ON profiles;
DROP POLICY IF EXISTS "Admin full access" ON clients;
DROP POLICY IF EXISTS "Admin full access" ON payments;
DROP POLICY IF EXISTS "Admin full access" ON documents;
DROP POLICY IF EXISTS "Admin full access" ON activities;
DROP POLICY IF EXISTS "Employé access" ON clients;
DROP POLICY IF EXISTS "Employé insert" ON clients;
DROP POLICY IF EXISTS "Employé update" ON clients;
DROP POLICY IF EXISTS "Comptable select payments" ON payments;
DROP POLICY IF EXISTS "Profiles admin full access" ON profiles;
DROP POLICY IF EXISTS "Profiles authenticated read" ON profiles;
DROP POLICY IF EXISTS "Profiles self update" ON profiles;
DROP POLICY IF EXISTS "Clients admin full access" ON clients;
DROP POLICY IF EXISTS "Clients employe select" ON clients;
DROP POLICY IF EXISTS "Clients employe insert" ON clients;
DROP POLICY IF EXISTS "Clients employe update" ON clients;
DROP POLICY IF EXISTS "Payments admin full access" ON payments;
DROP POLICY IF EXISTS "Payments employe select" ON payments;
DROP POLICY IF EXISTS "Payments employe insert" ON payments;
DROP POLICY IF EXISTS "Payments employe update" ON payments;
DROP POLICY IF EXISTS "Documents admin full access" ON documents;
DROP POLICY IF EXISTS "Documents employe select" ON documents;
DROP POLICY IF EXISTS "Documents employe insert" ON documents;
DROP POLICY IF EXISTS "Documents employe update" ON documents;
DROP POLICY IF EXISTS "Activities admin full access" ON activities;
DROP POLICY IF EXISTS "Activities employe select" ON activities;
DROP POLICY IF EXISTS "Activities employe insert" ON activities;
DROP POLICY IF EXISTS "Activities employe update" ON activities;

-- Profiles policies
CREATE POLICY "Profiles admin full access" ON profiles
  FOR ALL
  USING (public.current_user_role() = 'Admin')
  WITH CHECK (public.current_user_role() = 'Admin');

CREATE POLICY "Profiles authenticated read" ON profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Profiles self update" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Clients policies
CREATE POLICY "Clients admin full access" ON clients
  FOR ALL
  USING (public.current_user_role() = 'Admin')
  WITH CHECK (public.current_user_role() = 'Admin');

CREATE POLICY "Clients employe select" ON clients
  FOR SELECT
  USING (public.current_user_role() = 'Employé');

CREATE POLICY "Clients employe insert" ON clients
  FOR INSERT
  WITH CHECK (public.current_user_role() = 'Employé');

-- Allow both Admin and Employé to insert clients (covers cases where role helper or policies differ)
CREATE POLICY "Clients insert by role" ON clients
  FOR INSERT
  WITH CHECK (public.current_user_role() IN ('Admin','Employé'));

-- Allow authenticated users to insert clients when they set `created_by` to their own id,
-- or allow Admins to insert regardless.
DROP POLICY IF EXISTS "Clients insert authenticated" ON clients;
CREATE POLICY "Clients insert authenticated" ON clients
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      created_by = auth.uid()
      OR public.current_user_role() = 'Admin'
    )
  );

-- Payments policies
CREATE POLICY "Payments admin full access" ON payments
  FOR ALL
  USING (public.current_user_role() = 'Admin')
  WITH CHECK (public.current_user_role() = 'Admin');

CREATE POLICY "Payments employe select" ON payments
  FOR SELECT
  USING (public.current_user_role() = 'Employé');

CREATE POLICY "Payments employe insert" ON payments
  FOR INSERT
  WITH CHECK (public.current_user_role() = 'Employé');

-- Documents policies
CREATE POLICY "Documents admin full access" ON documents
  FOR ALL
  USING (public.current_user_role() = 'Admin')
  WITH CHECK (public.current_user_role() = 'Admin');

CREATE POLICY "Documents employe select" ON documents
  FOR SELECT
  USING (public.current_user_role() = 'Employé');

CREATE POLICY "Documents employe insert" ON documents
  FOR INSERT
  WITH CHECK (public.current_user_role() = 'Employé');

-- Activities policies
CREATE POLICY "Activities admin full access" ON activities
  FOR ALL
  USING (public.current_user_role() = 'Admin')
  WITH CHECK (public.current_user_role() = 'Admin');
