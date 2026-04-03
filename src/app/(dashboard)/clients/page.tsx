import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ClientsTable } from '@/components/clients/ClientsTable';
import { ClientFilters } from '@/components/clients/ClientFilters';
import { usePermissions } from '@/hooks/usePermissions';

export default function ClientsPage() {
  const { canCreate } = usePermissions();
  const [filters, setFilters] = useState({
    search: '',
    service: 'all',
    status: 'all',
    employee: 'all',
    startDate: '',
    endDate: '',
  });

  const queryKey = ['clients', filters.search, filters.service, filters.status, filters.employee, filters.startDate, filters.endDate];

  const { data: clients, isLoading, error: queryError } = useQuery({
    queryKey,
    queryFn: async () => {
      console.log('Fetching clients with filters:', filters);
      // Disambiguate relationship using profiles!responsible_employee
      let query = supabase
        .from('clients')
        .select(`
          id,
          full_name,
          sequential_number,
          service,
          status,
          total_amount,
          amount_paid,
          amount_remaining,
          created_at,
          responsible_employee:profiles!responsible_employee(name)
        `)
        .order('created_at', { ascending: false });

      if (filters.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,phone_primary.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }
      if (filters.service !== 'all') {
        query = query.eq('service', filters.service);
      }
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.employee !== 'all') {
        query = query.eq('responsible_employee', filters.employee);
      }
      // Date filtering: match either folder_opening_date (date) OR created_at (timestamp)
      if (filters.startDate || filters.endDate) {
        const s = filters.startDate || filters.endDate || '';
        const e = filters.endDate || filters.startDate || '';
        // created_at needs time bounds
        const sCreated = `${s}T00:00:00`;
        const eCreated = `${e}T23:59:59`;
        const condFolder = `and(folder_opening_date.gte.${s},folder_opening_date.lte.${e})`;
        const condCreated = `and(created_at.gte.${sCreated},created_at.lte.${eCreated})`;
        const orCond = `or(${condFolder},${condCreated})`;
        console.log('Applying date OR filter:', orCond);
        query = query.or(orCond);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase Error in ClientsPage:', error);
        throw error;
      }

      console.log('Successfully fetched clients:', Array.isArray(data) ? data.length : 0, data ? data.slice(0, 3) : null);
      return data || [];
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  if (queryError) {
    console.error('Query Error state:', queryError);
  }

  return (
    <div className="space-y-6">
      {queryError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 shadow-sm">
          <p className="font-bold">Erreur de base de données :</p>
          <p className="text-sm">{(queryError as any).message || 'Échec de la connexion à Supabase'}</p>
          <p className="mt-2 text-xs opacity-70 italic">Vérifiez si l'instance Supabase ou le RLS est actif.</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold text-navy">Gestion des Clients</h1>
        {canCreate && (
          <Link to="/clients/new">
            <Button className="bg-blue hover:bg-blue/90 rounded-xl">
              <Plus className="mr-2 h-5 w-5" />
              Ajouter client
            </Button>
          </Link>
        )}
      </div>

      <ClientFilters filters={filters} setFilters={setFilters} />

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <ClientsTable data={clients || []} loading={isLoading} />
      </div>
    </div>
  );
}
