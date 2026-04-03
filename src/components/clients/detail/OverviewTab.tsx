import React from 'react';
import { User, Phone, Mail, MapPin, Briefcase, Calendar, CreditCard, FileText, Globe, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const OverviewTab = ({ client }: { client: any }) => {
  const formatDate = (date: string | null) => {
    if (!date) return 'Non défini';
    return format(new Date(date), 'dd MMMM yyyy', { locale: fr });
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return 'Non défini';
    return format(new Date(date), 'dd MMMM yyyy à HH:mm', { locale: fr });
  };

  const InfoRow = ({ icon: Icon, label, value, color = "text-navy" }: any) => (
    <div className="flex items-start space-x-3 py-3">
      <div className="mt-0.5 rounded-lg bg-gray-50 p-2 text-gray-400">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
        <p className={cn("text-sm font-semibold", color)}>{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-8">
        {/* Personnel */}
        <Card className="border-none shadow-sm">
          <CardHeader className="border-b border-gray-50 pb-4">
            <CardTitle className="flex items-center text-lg font-bold text-navy">
              <User className="mr-2 h-5 w-5 text-blue" />
              Informations Personnelles
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 p-6 md:grid-cols-2">
            <InfoRow icon={User} label="Nom complet" value={client.full_name} />
            <InfoRow icon={Briefcase} label="Profession" value={client.profession} />
            <InfoRow icon={Calendar} label="Date de naissance" value={formatDate(client.birth_date)} />
            <InfoRow icon={Globe} label="Nationalité" value={client.nationality} />
            <InfoRow icon={FileText} label="Numéro CIN" value={client.id_card_number} />
            <InfoRow icon={User} label="État civil" value={client.marital_status} />
            <InfoRow icon={Phone} label="Téléphone Principal" value={client.phone_primary} color="text-blue" />
            <InfoRow icon={Phone} label="Téléphone Secondaire" value={client.phone_secondary} />
            <InfoRow icon={Mail} label="Email" value={client.email} />
            <InfoRow icon={MapPin} label="Adresse" value={`${client.address_street || ''}, ${client.address_city || ''}, ${client.address_governorate || ''}`} />
          </CardContent>
        </Card>

        {/* Passport */}
        <Card className="border-none shadow-sm">
          <CardHeader className="border-b border-gray-50 pb-4">
            <CardTitle className="flex items-center text-lg font-bold text-navy">
              <FileText className="mr-2 h-5 w-5 text-gold" />
              Passeport
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 p-6 md:grid-cols-2">
            <InfoRow icon={FileText} label="Numéro de Passeport" value={client.passport_number} color="font-mono" />
            <InfoRow icon={Calendar} label="Date d'expiration" value={formatDate(client.passport_expiry)} />
          </CardContent>
        </Card>

        {/* Service */}
        <Card className="border-none shadow-sm">
          <CardHeader className="border-b border-gray-50 pb-4">
            <CardTitle className="flex items-center text-lg font-bold text-navy">
              <Globe className="mr-2 h-5 w-5 text-blue" />
              Détails du Service
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 p-6 md:grid-cols-2">
            <InfoRow icon={Globe} label="Service" value={client.service} />
            <InfoRow icon={Calendar} label="Date de RDV" value={formatDateTime(client.appointment_date)} color="text-gold" />
            <InfoRow icon={Calendar} label="Date de Voyage" value={formatDate(client.travel_date)} color="text-blue" />
            <InfoRow icon={User} label="Responsable" value={client.responsible_employee?.name} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-8">
        {/* Alerts for this client */}
        <Card className="border-none shadow-sm bg-gold/5 border-gold/10">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-navy">Alertes Dossier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client.appointment_date && (
              <div className="flex items-center space-x-3 rounded-xl bg-white p-4 shadow-sm">
                <div className="rounded-lg bg-gold/10 p-2 text-gold">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">RDV Ambassade</p>
                  <p className="text-sm font-bold text-navy">{formatDateTime(client.appointment_date)}</p>
                </div>
              </div>
            )}
            {client.travel_date && (
              <div className="flex items-center space-x-3 rounded-xl bg-white p-4 shadow-sm">
                <div className="rounded-lg bg-blue/10 p-2 text-blue">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Date de Voyage</p>
                  <p className="text-sm font-bold text-navy">{formatDate(client.travel_date)}</p>
                </div>
              </div>
            )}
            {!client.passport_number && (
              <div className="flex items-center space-x-3 rounded-xl bg-red/5 p-4 border border-red/10">
                <div className="rounded-lg bg-red/10 p-2 text-red">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-red/60">Manquant</p>
                  <p className="text-sm font-bold text-red">Passeport non renseigné</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-navy">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-gray-600">
              {client.notes || "Aucune note pour ce client."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

