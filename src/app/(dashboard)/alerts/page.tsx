import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '@/lib/api/client';
import { format, addDays, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, CheckCircle2, User, Phone, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const today = new Date();
  const alertThreshold = addDays(today, 45);

  const { data: expiringClients, isLoading } = useQuery({
    queryKey: ['expiring-documents'],
    queryFn: () => alertsApi.list(),
  });

  const markDoneMutation = useMutation({
    mutationFn: async ({ id, type, done }: { id: string; type: 'passport' | 'b3' | 'travel'; done: boolean }) => {
      await alertsApi.markDone(id, type, done);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expiring-documents'] });
      toast.success('Statut de l\'alerte mis à jour');
    },
    onError: (error: any) => {
      toast.error('Erreur: ' + error.message);
    }
  });

  const getAlerts = () => {
    const alerts: any[] = [];
    if (!expiringClients) return alerts;

    expiringClients.forEach((client) => {
      // Passport alert
      if (client.passport_expiry && !client.passport_alert_done) {
        const expiryDate = new Date(client.passport_expiry);
        if (isBefore(expiryDate, alertThreshold)) {
          alerts.push({
            id: `${client.id}-passport`,
            clientId: client.id,
            clientName: client.full_name,
            phone: client.phone_primary,
            docType: 'Passeport',
            expiryDate: client.passport_expiry,
            type: 'passport',
            daysLeft: Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
          });
        }
      }

      // B3 alert
      if (client.b3_expiry && !client.b3_alert_done) {
        const expiryDate = new Date(client.b3_expiry);
        if (isBefore(expiryDate, alertThreshold)) {
          alerts.push({
            id: `${client.id}-b3`,
            clientId: client.id,
            clientName: client.full_name,
            phone: client.phone_primary,
            docType: 'B3',
            expiryDate: client.b3_expiry,
            type: 'b3',
            daysLeft: Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
          });
        }
      }

      // Travel alert
      if (client.travel_date && !client.travel_alert_done) {
        const travelDate = new Date(client.travel_date);
        const travelThreshold = addDays(today, 7);
        if (isBefore(travelDate, travelThreshold)) {
          alerts.push({
            id: `${client.id}-travel`,
            clientId: client.id,
            clientName: client.full_name,
            phone: client.phone_primary,
            docType: 'Date de Voyage',
            expiryDate: client.travel_date,
            type: 'travel',
            daysLeft: Math.ceil((travelDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
          });
        }
      }
    });

    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  };

  const alerts = getAlerts();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-navy">Alertes Documents & Voyage</h1>
        <p className="text-sm text-gray-500">Expirations (45j) et Voyages imminents (7j)</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-48 animate-pulse rounded-2xl bg-gray-50" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 py-20 bg-white shadow-sm">
          <div className="mb-4 rounded-full bg-green/10 p-4 text-green">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <p className="text-lg font-bold text-navy">Félicitations !</p>
          <p className="text-sm text-gray-500 text-center max-w-xs">Aucune alerte d'expiration n'est active pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {alerts.map((alert) => (
            <Card key={alert.id} className="overflow-hidden border-none shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-md">
              <CardHeader className={cn(
                "pb-3 border-b border-gray-50",
                alert.daysLeft < 0 ? "bg-red/5" : alert.daysLeft < 15 ? "bg-orange/5" : "bg-gold/5"
              )}>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={cn(
                    "rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    alert.daysLeft < 0 ? "bg-red text-white border-red" :
                      alert.daysLeft < 15 ? "bg-orange-500 text-white border-orange-500" :
                        "bg-gold text-white border-gold"
                  )}>
                    {alert.daysLeft < 0 ? 'Expiré' : `Expire dans ${alert.daysLeft} jours`}
                  </Badge>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Traité</span>
                    <Checkbox
                      onCheckedChange={(checked) => markDoneMutation.mutate({ id: alert.clientId, type: alert.type, done: !!checked })}
                    />
                  </div>
                </div>
                <CardTitle className="mt-4 flex items-center text-lg font-bold text-navy group cursor-pointer">
                  <User className="mr-2 h-5 w-5 text-gray-400" />
                  <Link to={`/clients/${alert.clientId}`} className="hover:text-blue transition-colors">
                    {alert.clientName}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-500">
                    <AlertTriangle className="mr-2 h-4 w-4 text-orange-500" />
                    <span className="font-semibold">{alert.docType}</span>
                  </div>
                  <div className="flex items-center text-gray-400 font-mono text-xs">
                    <Calendar className="mr-1.5 h-3.5 w-3.5" />
                    {format(new Date(alert.expiryDate), 'dd MMM yyyy', { locale: fr })}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <a href={`tel:${alert.phone}`} className="flex items-center space-x-2 rounded-lg bg-blue/10 px-3 py-2 text-blue hover:bg-blue/20 transition-colors">
                    <Phone className="h-4 w-4" />
                    <span className="text-xs font-bold">{alert.phone}</span>
                  </a>
                  <Link to={`/clients/${alert.clientId}`}>
                    <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-navy hover:bg-gray-100">
                      Voir dossier
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
