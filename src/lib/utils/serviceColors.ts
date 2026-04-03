import { ServiceType } from '@/types/app.types';

export const SERVICE_CONFIG: Record<ServiceType, { color: string; bg: string }> = {
  'Visa Schengen': { color: '#2563EB', bg: '#EFF6FF' },
  'Visa USA': { color: '#7C3AED', bg: '#F5F3FF' },
  'Visa UK': { color: '#0891B2', bg: '#ECFEFF' },
  'Résidence': { color: '#F59E0B', bg: '#FFFBEB' },
  'Visa Dubai': { color: '#DC2626', bg: '#FEF2F2' },
  'Pack Dubai': { color: '#B91C1C', bg: '#FEF2F2' },
  'Visa Qatar': { color: '#7E22CE', bg: '#FAF5FF' },
  'Pack Qatar': { color: '#6B21A8', bg: '#FAF5FF' },
  'Visa Roumanie': { color: '#10B981', bg: '#ECFDF5' },
  'Visa Oman': { color: '#3B82F6', bg: '#EFF6FF' },
  'Visa KSA': { color: '#059669', bg: '#ECFDF5' },
  'Visa Koweit': { color: '#4F46E5', bg: '#EEF2FF' },
  'Visa Egypte': { color: '#D97706', bg: '#FFFBEB' },
  'Visa Chine': { color: '#E11D48', bg: '#FFF1F2' },
  'Visa Canada': { color: '#9333EA', bg: '#F5F3FF' },
  'Visa Grece': { color: '#14B8A6', bg: '#F0FDFA' },
  'Visa Italie Touristique': { color: '#2563EB', bg: '#EFF6FF' },
  'Visa Italie 1 an': { color: '#1D4ED8', bg: '#EFF6FF' },
  'Autres': { color: '#6B7280', bg: '#F9FAFB' },
};

export const getServiceStyles = (service: string | null) => {
  if (!service || !(service in SERVICE_CONFIG)) {
    return SERVICE_CONFIG['Autres'];
  }
  return SERVICE_CONFIG[service as ServiceType];
};
