import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { activitiesApi } from '@/lib/api/client';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  PlusCircle,
  Edit,
  CreditCard,
  FileText,
  RefreshCw,
  StickyNote,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const ActivityTab = ({ clientId }: { clientId: string }) => {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['client-activities', clientId],
    queryFn: () => activitiesApi.listByClient(clientId),
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'Création': return <PlusCircle className="h-4 w-4" />;
      case 'Modification': return <Edit className="h-4 w-4" />;
      case 'Paiement': return <CreditCard className="h-4 w-4" />;
      case 'Document': return <FileText className="h-4 w-4" />;
      case 'Statut': return <RefreshCw className="h-4 w-4" />;
      case 'Note': return <StickyNote className="h-4 w-4" />;
      default: return <PlusCircle className="h-4 w-4" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'Création': return 'bg-green/10 text-green';
      case 'Modification': return 'bg-blue/10 text-blue';
      case 'Paiement': return 'bg-green/10 text-green';
      case 'Document': return 'bg-gold/10 text-gold';
      case 'Statut': return 'bg-navy/10 text-navy';
      case 'Note': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="relative space-y-8 before:absolute before:left-6 before:top-2 before:h-full before:w-px before:bg-gray-100">
      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="relative flex items-center space-x-4 pl-12">
            <div className="absolute left-0 h-12 w-12 animate-pulse rounded-full bg-gray-50"></div>
            <div className="h-16 w-full animate-pulse rounded-2xl bg-gray-50"></div>
          </div>
        ))
      ) : activities?.length === 0 ? (
        <div className="py-12 text-center text-gray-400">Aucune activité enregistrée</div>
      ) : (
        activities?.map((activity) => (
          <div key={activity.id} className="relative flex items-start space-x-4 pl-12">
            <div className={cn(
              "absolute left-0 flex h-12 w-12 items-center justify-center rounded-full border-4 border-bg shadow-sm",
              getIconBg(activity.action_type!)
            )}>
              {getIcon(activity.action_type!)}
            </div>
            <div className="flex-1 rounded-2xl border border-gray-50 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-navy">{activity.description}</p>
                <div className="text-right ml-4 shrink-0">
                  <p className="text-[10px] font-medium text-gray-400">
                    {formatDistanceToNow(new Date(activity.action_date!), { addSuffix: true, locale: fr })}
                  </p>
                  <p className="text-[10px] font-mono text-gray-300">
                    {format(new Date(activity.action_date!), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center space-x-2">
                <User className="h-3 w-3 text-gray-400" />
                <span className="text-xs font-medium text-gray-500">{(activity.performer as any)?.name || 'Employé inconnu'}</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
