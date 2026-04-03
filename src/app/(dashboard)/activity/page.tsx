import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { formatDistanceToNow, startOfToday, subDays, isAfter, isBefore, startOfYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FolderPlus,
  Edit,
  CreditCard,
  FileText,
  RefreshCw,
  StickyNote,
  User,
  Link as LinkIcon,
  Search,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ActivityPage() {
  const [filters, setFilters] = useState({
    employee: 'all',
    type: 'all',
    search: '',
    date: 'all', // all, today, yesterday, week
  });

  const { data: activities, isLoading } = useQuery({
    queryKey: ['all-activities', filters],
    queryFn: async () => {
      let query = supabase
        .from('activities')
        .select(`
          *,
          performer:profiles!performed_by(name),
          client:clients(full_name, sequential_number)
        `)
        .order('action_date', { ascending: false });

      if (filters.employee !== 'all') query = query.eq('performed_by', filters.employee);
      if (filters.type !== 'all') query = query.eq('action_type', filters.type);
      
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, name');
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  const filteredActivities = React.useMemo(() => {
    if (!activities) return [];
    return activities.filter(activity => {
      const matchesSearch = activity.description?.toLowerCase().includes(filters.search.toLowerCase()) || 
                           (activity.client as any)?.full_name?.toLowerCase().includes(filters.search.toLowerCase());
      
      // Date filtering
      let matchesDate = true;
      if (filters.date !== 'all') {
        const actionDate = new Date(activity.action_date!);
        if (filters.date === 'today') {
           matchesDate = isAfter(actionDate, startOfToday());
        } else if (filters.date === 'yesterday') {
           matchesDate = isAfter(actionDate, startOfYesterday()) && isBefore(actionDate, startOfToday());
        } else if (filters.date === 'week') {
           matchesDate = isAfter(actionDate, subDays(new Date(), 7));
        }
      }

      return matchesSearch && matchesDate;
    });
  }, [activities, filters]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'Création': return <FolderPlus className="h-4 w-4" />;
      case 'Modification': return <Edit className="h-4 w-4" />;
      case 'Paiement': return <CreditCard className="h-4 w-4" />;
      case 'Document': return <FileText className="h-4 w-4" />;
      case 'Statut': return <RefreshCw className="h-4 w-4" />;
      case 'Note': return <StickyNote className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'Création': return 'bg-blue text-white shadow-blue/20';
      case 'Modification': return 'bg-cyan-500/10 text-cyan-600';
      case 'Paiement': return 'bg-green/10 text-green';
      case 'Document': return 'bg-amber-500/10 text-amber-600';
      case 'Statut': return 'bg-navy/10 text-navy';
      case 'Note': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 text-navy">
        <div>
          <h1 className="font-serif text-3xl font-bold">Journal d'Activité</h1>
          <p className="text-sm text-gray-500 font-medium">Suivi en temps réel des actions de l'équipe</p>
        </div>
        <Badge variant="secondary" className="bg-blue/5 text-blue font-bold px-4 py-1.5 rounded-full border border-blue/10">
          {filteredActivities.length} Activités enregistrées
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="relative group">
          <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-gray-400 uppercase tracking-tighter transition-colors group-focus-within:text-blue">
            Employé
          </label>
          <select 
            className="w-full rounded-xl border-gray-100 bg-white px-4 py-3 text-sm font-semibold shadow-sm focus:border-blue focus:ring-blue transition-all"
            value={filters.employee}
            onChange={(e) => setFilters({...filters, employee: e.target.value})}
          >
            <option value="all">Tous les employés</option>
            {employees?.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>

        <div className="relative group">
          <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-gray-400 uppercase tracking-tighter transition-colors group-focus-within:text-blue">
            Type d'Action
          </label>
          <select 
            className="w-full rounded-xl border-gray-100 bg-white px-4 py-3 text-sm font-semibold shadow-sm focus:border-blue focus:ring-blue"
            value={filters.type}
            onChange={(e) => setFilters({...filters, type: e.target.value})}
          >
            <option value="all">Toutes les actions</option>
            <option value="Création">Création</option>
            <option value="Modification">Modification</option>
            <option value="Paiement">Paiement</option>
            <option value="Document">Document</option>
          </select>
        </div>

        <div className="relative group">
          <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-gray-400 uppercase tracking-tighter transition-colors group-focus-within:text-blue">
            Période
          </label>
          <select 
            className="w-full rounded-xl border-gray-100 bg-white px-4 py-3 text-sm font-semibold shadow-sm focus:border-blue focus:ring-blue"
            value={filters.date}
            onChange={(e) => setFilters({...filters, date: e.target.value})}
          >
            <option value="all">Tout l'historique</option>
            <option value="today">Aujourd'hui</option>
            <option value="yesterday">Hier</option>
            <option value="week">7 derniers jours</option>
          </select>
        </div>

        <div className="relative group">
          <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-gray-400 uppercase tracking-tighter transition-colors group-focus-within:text-blue">
            Recherche
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Client ou description..."
              className="w-full rounded-xl border-gray-100 bg-white pl-10 pr-4 py-3 text-sm font-semibold shadow-sm focus:border-blue focus:ring-blue"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
          </div>
        </div>
      </div>

      <div className="relative space-y-6 before:absolute before:left-6 before:top-2 before:h-full before:w-px before:bg-gray-100 pb-8">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="relative flex items-center space-x-4 pl-12">
              <div className="absolute left-0 h-12 w-12 animate-pulse rounded-full bg-gray-50"></div>
              <div className="h-20 w-full animate-pulse rounded-2xl bg-gray-50"></div>
            </div>
          ))
        ) : (
          filteredActivities.map((activity) => (
            <div key={activity.id} className="relative flex items-start space-x-4 pl-12">
              <div className={cn(
                "absolute left-0 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white shadow-sm transition-transform hover:scale-110",
                getIconBg(activity.action_type!)
              )}>
                {getIcon(activity.action_type!)}
              </div>
              <Card className="flex-1 border-none shadow-sm overflow-hidden hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className={cn("text-[10px] font-bold uppercase tracking-wider", getIconBg(activity.action_type!))}>
                        {activity.action_type}
                      </Badge>
                      <p className="text-sm font-bold text-navy">{activity.description}</p>
                    </div>
                    <span className="text-[10px] font-medium text-gray-500 italic">
                      {formatDistanceToNow(new Date(activity.action_date!), { addSuffix: true, locale: fr })}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="text-xs font-semibold text-gray-600">{(activity.performer as any)?.name || 'Équipe'}</span>
                      </div>
                      <div className="h-3 w-px bg-gray-100"></div>
                      <Link
                        to={`/clients/${activity.client_id}`}
                        className="flex items-center space-x-2 group"
                      >
                        <LinkIcon className="h-3 w-3 text-blue opacity-50 group-hover:opacity-100" />
                        <span className="text-xs font-bold text-blue group-hover:underline">{(activity.client as any)?.full_name || 'Détails dossier'}</span>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}
        {!isLoading && filteredActivities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Search className="h-12 w-12 mb-4 opacity-10" />
            <p className="text-sm font-medium italic">Aucune activité trouvée pour cette période.</p>
          </div>
        )}
      </div>
    </div>
  );
}
