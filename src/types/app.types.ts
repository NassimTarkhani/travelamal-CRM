// No longer depends on Supabase-generated types

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Employé';
  avatar_url: string | null;
  created_at: string | null;
}

export interface Client {
  id: string;
  sequential_number: number;
  full_name: string;
  profession: string | null;
  marital_status: string | null;
  id_card_number: string | null;
  phone_primary: string;
  phone_secondary: string | null;
  email: string | null;
  birth_date: string | null;
  nationality: string | null;
  address_street: string | null;
  address_city: string | null;
  address_governorate: string | null;
  folder_opening_date: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  passport_alert_done: boolean;
  b3_expiry: string | null;
  b3_alert_done: boolean;
  embassy_registration_date: string | null;
  travel_alert_done: boolean;
  service: string | null;
  color_tag: string;
  status: string | null;
  total_amount: number;
  amount_paid: number;
  amount_remaining: number;
  refund_amount: number;
  payment_method: string | null;
  payment_status: string;
  appointment_date: string | null;
  travel_date: string | null;
  notes: string | null;
  created_at: string | null;
  created_by: string | null;
  responsible_employee: string | null;
  responsible_profile?: { name: string } | null;
  creator?: { name: string } | null;
}

export interface Payment {
  id: string;
  client_id: string | null;
  amount: number;
  payment_date: string | null;
  method: string | null;
  recorded_by: string | null;
  is_deleted: boolean;
  created_at: string | null;
  client?: { full_name: string } | null;
  profiles?: { name: string } | null;
}

export interface Document {
  id: string;
  client_id: string | null;
  document_type: string | null;
  file_url: string;
  file_name: string | null;
  upload_date: string | null;
  expiry_date: string | null;
  status: string | null;
  uploaded_by: string | null;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  proof_url: string | null;
  client_id: string | null;
  created_by: string | null;
  created_at: string | null;
  profiles?: { name: string; email: string } | null;
}

export interface Activity {
  id: string;
  client_id: string | null;
  action_type: string | null;
  description: string;
  performed_by: string | null;
  action_date: string | null;
  profiles?: { name: string } | null;
  client?: { full_name: string; sequential_number: number } | null;
}

export type UserRole = 'Admin' | 'Employé';
export type ClientStatus = 'Nouveau' | 'En cours' | 'Complété' | 'Refusé' | 'Annulé';
export type ServiceType =
  | 'Visa Schengen' | 'Visa USA' | 'Visa UK' | 'Résidence'
  | 'Visa Dubai' | 'Pack Dubai' | 'Visa Qatar' | 'Pack Qatar'
  | 'Visa Roumanie' | 'Visa Oman' | 'Visa KSA' | 'Visa Koweit'
  | 'Visa Egypte' | 'Visa Chine' | 'Visa Canada' | 'Visa Grece'
  | 'Visa Italie Touristique' | 'Visa Italie 1 an'
  | 'Autres';
export type PaymentMethod = 'Espèces' | 'Virement' | 'Chèque' | 'Carte';
export type DocumentType =
  | 'Passeport' | 'CIN' | 'Photo' | 'Acte de naissance'
  | 'Fiche familiale' | 'Justificatif bancaire' | 'Assurance'
  | 'Réservation vol' | 'Autre';

export interface Alert {
  id: string;
  type: 'rdv' | 'travel' | 'doc_expiry' | 'passport_expiry';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  date: string;
  clientId: string;
  clientName: string;
}
