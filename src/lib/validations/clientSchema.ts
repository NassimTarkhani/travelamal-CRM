import { z } from 'zod';

export const clientSchema = z.object({
  full_name: z.string().min(3, 'Le nom complet est requis (min 3 caractères)'),
  profession: z.string().optional(),
  marital_status: z.enum(['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve']).optional(),
  id_card_number: z.string().optional(),
  phone_primary: z.string().min(8, 'Le téléphone est requis'),
  phone_secondary: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  birth_date: z.string().optional(),
  nationality: z.string().optional(),
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_governorate: z.string().optional(),
  folder_opening_date: z.string().optional(),
  passport_number: z.string().optional(),
  passport_expiry: z.string().optional(),
  passport_alert_done: z.boolean().optional().default(false),
  b3_expiry: z.string().optional(),
  b3_alert_done: z.boolean().optional().default(false),
  travel_alert_done: z.boolean().optional().default(false),
  embassy_registration_date: z.string().optional(),
  service: z.enum([
    'Visa Schengen', 'Visa USA', 'Visa UK', 'Résidence', 
    'Visa Dubai', 'Pack Dubai', 'Visa Qatar', 'Pack Qatar', 
    'Visa Roumanie', 'Visa Oman', 'Visa KSA', 'Visa Koweit', 
    'Visa Egypte', 'Visa Chine', 'Visa Canada', 'Visa Grece', 
    'Visa Italie Touristique', 'Visa Italie 1 an',
    'Autres'
  ]),
  status: z.enum(['Nouveau', 'En cours', 'Complété', 'Refusé', 'Annulé']),
  refund_amount: z.coerce.number().optional().default(0),
  responsible_employee: z.string().optional(),
  appointment_date: z.string().optional(),
  travel_date: z.string().optional(),
  payment_method: z.enum(['Espèces', 'Virement', 'Chèque', 'Carte']).optional(),
  total_amount: z.coerce.number().min(0, 'Le montant doit être positif'),
  amount_paid: z.coerce.number().min(0, 'Le montant doit être positif'),
  notes: z.string().optional(),
});

export type ClientFormData = z.infer<typeof clientSchema>;
