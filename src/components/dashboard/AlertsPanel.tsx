import React from 'react';
import { Calendar, Plane, FileWarning, UserCheck, Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export const AlertsPanel = () => {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: async () => {
      // In a real app, this would call /api/alerts
      // Mocking for now
      return [
        { id: '1', type: 'rdv', title: 'RDV Ambassade', client: 'Ahmed Ben Ali', date: new Date(Date.now() + 86400000).toISOString(), severity: 'orange' },
        { id: '2', type: 'travel', title: 'Départ Voyage', client: 'Sonia Mansour', date: new Date(Date.now() + 172800000).toISOString(), severity: 'blue' },
        { id: '3', type: 'doc_expiry', title: 'Document Expiré', client: 'Karim Dridi', date: new Date(Date.now() - 86400000).toISOString(), severity: 'red' },
        { id: '4', type: 'passport_expiry', title: 'Passeport Expirant', client: 'Ines Belhaj', date: new Date(Date.now() + 2592000000).toISOString(), severity: 'yellow' },
      ];
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'rdv': return <Calendar className="h-4 w-4" />;
      case 'travel': return <Plane className="h-4 w-4" />;
      case 'doc_expiry': return <FileWarning className="h-4 w-4" />;
      case 'passport_expiry': return <UserCheck className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'orange': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'blue': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'red': return 'bg-red-100 text-red-700 border-red-200';
      case 'yellow': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card className="h-full border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-bold text-navy">Alertes & Rappels</CardTitle>
        <Badge variant="outline" className="bg-red/10 text-red border-red/20">{alerts?.length || 0}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 w-full animate-pulse rounded-xl bg-gray-50"></div>
          ))
        ) : (
          alerts?.map((alert) => (
            <Link 
              key={alert.id} 
              to={`/clients/${alert.id}`} // Mock ID
              className="flex items-start space-x-3 rounded-xl border border-gray-50 p-3 transition-colors hover:bg-gray-50"
            >
              <div className={cn("mt-0.5 rounded-lg p-2", getSeverityClass(alert.severity))}>
                {getIcon(alert.type)}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{alert.title}</p>
                <p className="truncate text-sm font-semibold text-navy">{alert.client}</p>
                <p className="text-[10px] text-gray-500">
                  {format(new Date(alert.date), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
};
