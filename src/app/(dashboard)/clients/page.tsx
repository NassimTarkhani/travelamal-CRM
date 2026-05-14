import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clientsApi } from '@/lib/api/client';
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
    queryFn: () => {
      const params: Record<string, string> = {};
      if (filters.search) params.search = filters.search;
      if (filters.service !== 'all') params.service = filters.service;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.employee !== 'all') params.employee = filters.employee;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      return clientsApi.list(params);
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  return (
    <div className="space-y-6">
      {queryError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 shadow-sm">
          <p className="font-bold">Erreur de base de données :</p>
          <p className="text-sm">{(queryError as any).message || 'Erreur de connexion au serveur'}</p>
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
