-- Initial migration: TravelAmal CRM schema
-- Generated for self-hosted PostgreSQL

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles (replaces Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Employé',
  avatar_url TEXT,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequential_number SERIAL NOT NULL,
  full_name TEXT NOT NULL,
  profession TEXT,
  marital_status TEXT,
  id_card_number TEXT,
  phone_primary TEXT NOT NULL,
  phone_secondary TEXT,
  email TEXT,
  birth_date DATE,
  nationality TEXT,
  address_street TEXT,
  address_city TEXT,
  address_governorate TEXT,
  folder_opening_date DATE,
  passport_number TEXT,
  passport_expiry DATE,
  passport_alert_done BOOLEAN DEFAULT false,
  b3_expiry DATE,
  b3_alert_done BOOLEAN DEFAULT false,
  embassy_registration_date DATE,
  travel_alert_done BOOLEAN DEFAULT false,
  service TEXT,
  color_tag TEXT NOT NULL DEFAULT 'blue',
  status TEXT DEFAULT 'Nouveau',
  total_amount NUMERIC(10,3) DEFAULT 0,
  amount_paid NUMERIC(10,3) DEFAULT 0,
  refund_amount NUMERIC(10,3) DEFAULT 0,
  payment_method TEXT,
  appointment_date TIMESTAMPTZ,
  travel_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  responsible_employee UUID REFERENCES profiles(id)
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  amount NUMERIC(10,3) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  method TEXT,
  recorded_by UUID REFERENCES profiles(id),
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  document_type TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT,
  upload_date TIMESTAMPTZ DEFAULT now(),
  expiry_date DATE,
  status TEXT DEFAULT 'Présent',
  uploaded_by UUID REFERENCES profiles(id)
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(10,3) NOT NULL,
  description TEXT NOT NULL,
  proof_url TEXT,
  client_id UUID REFERENCES clients(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activities
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  action_type TEXT,
  description TEXT NOT NULL,
  performed_by UUID REFERENCES profiles(id),
  action_date TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);
CREATE INDEX IF NOT EXISTS idx_clients_responsible_employee ON clients(responsible_employee);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_service ON clients(service);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_recorded_by ON payments(recorded_by);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_activities_client_id ON activities(client_id);
CREATE INDEX IF NOT EXISTS idx_activities_performed_by ON activities(performed_by);
CREATE INDEX IF NOT EXISTS idx_activities_action_date ON activities(action_date);
