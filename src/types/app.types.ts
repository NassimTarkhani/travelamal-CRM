import { Database } from '@/types/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Client = Database['public']['Tables']['clients']['Row'];
export type Payment = Database['public']['Tables']['payments']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'];
export type Activity = Database['public']['Tables']['activities']['Row'];

export type UserRole = 'Admin' | 'Employé';
export type ClientStatus = 'Nouveau' | 'En cours' | 'Complété' | 'Refusé' | 'Annulé';
export type ServiceType = 
  'Visa Schengen' | 'Visa USA' | 'Visa UK' | 'Résidence' | 
  'Visa Dubai' | 'Pack Dubai' | 'Visa Qatar' | 'Pack Qatar' | 
  'Visa Roumanie' | 'Visa Oman' | 'Visa KSA' | 'Visa Koweit' | 
  'Visa Egypte' | 'Visa Chine' | 'Visa Canada' | 'Visa Grece' | 
  'Visa Italie Touristique' | 'Visa Italie 1 an' |
  'Autres';
export type PaymentMethod = 'Espèces' | 'Virement' | 'Chèque' | 'Carte';
export type DocumentType = 'Passeport' | 'CIN' | 'Photo' | 'Acte de naissance' | 'Fiche familiale' | 'Justificatif bancaire' | 'Assurance' | 'Réservation vol' | 'Autre';

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
