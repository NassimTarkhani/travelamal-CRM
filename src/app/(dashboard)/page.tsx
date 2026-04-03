import { Users, FolderOpen, TrendingUp, Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KPICard } from '@/components/dashboard/KPICard';
import { PaymentsChart } from '@/components/dashboard/PaymentsChart';
import { ServicePieChart } from '@/components/dashboard/ServicePieChart';
import { EmployeeChart } from '@/components/dashboard/EmployeeChart';
import { formatCurrency } from '@/lib/utils/formatCurrency';

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // 1. Calculate the first day of the current month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, status, amount_paid, created_at');

      if (error) throw error;

      // 2. Calculate monthly total from existing folders for more accuracy
      const monthlyTotal = clients?.reduce((sum, c) => {
        const isThisMonth = new Date(c.created_at) >= new Date(firstDayOfMonth);
        return isThisMonth ? sum + Number(c.amount_paid || 0) : sum;
      }, 0) || 0;

      const activeDossiers = clients?.filter(c => c.status === 'En cours').length || 0;

      return {
        totalClients: clients?.length || 0,
        activeDossiers,
        monthlyTotal,
        activeAlerts: 0,
      };
    },
    staleTime: 0, // Force fresh data every visit
    refetchOnWindowFocus: true,
  });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title="Total Clients"
          value={stats?.totalClients.toString() || '0'}
          icon={Users}
          color="blue"
          loading={isLoading}
        />
        <KPICard
          title="Dossiers en cours"
          value={stats?.activeDossiers.toString() || '0'}
          icon={FolderOpen}
          color="gold"
          loading={isLoading}
        />
        <KPICard
          title="Paiements du mois"
          value={formatCurrency(stats?.monthlyTotal)}
          icon={TrendingUp}
          color="green"
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-6">
          <PaymentsChart />
          
          {/* Recently Created Folders */}
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-navy">Derniers Dossiers Créés</CardTitle>
                <p className="text-xs text-gray-400">Suivi des ouvertures de dossiers client</p>
              </div>
              <Link to="/clients" className="text-xs font-bold text-blue hover:underline">Voir tout</Link>
            </CardHeader>
            <CardContent>
              <RecentFolders />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ServicePieChart />
            <EmployeeChart />
          </div>
        </div>
      </div>
    </div>
  );
}

const RecentFolders = () => {
  const { data: recent, isLoading, error } = useQuery({
    queryKey: ['recent-clients'],
    queryFn: async () => {
      // Fetching clients and their creator (ambiguity handled via !created_by)
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          full_name,
          service,
          sequential_number,
          created_at,
          created_by,
          creator:profiles!created_by(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('Erreur de chargement des dossiers récents:', error);
        throw error;
      }
      return data;
    },
  });

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-gray-50"></div>)}</div>;
  if (error) return <div className="py-4 text-xs text-red italic">Erreur lors de la récupération des dossiers</div>;

  return (
    <div className="divide-y divide-gray-50">
      {recent?.map((client) => (
        <div key={client.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue/5 text-blue">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-navy">{client.full_name}</p>
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">{client.service} — #{String(client.sequential_number).padStart(4, '0')}</p>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Créé par</p>
            <div className="flex items-center justify-end space-x-1">
              <span className="text-xs font-semibold text-navy">
                {typeof client.creator === 'object' && client.creator ? (client.creator as any).name : 'Admin'}
              </span>
            </div>
          </div>
        </div>
      ))}
      {!recent?.length && (
        <div className="py-8 text-center text-sm text-gray-400 italic">Aucun dossier trouvé dans la base de données</div>
      )}
    </div>
  );
};
