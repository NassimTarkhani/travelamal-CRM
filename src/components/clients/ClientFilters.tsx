import React, { useEffect, useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { profilesApi } from '@/lib/api/client';

interface ClientFiltersProps {
  filters: any;
  setFilters: (filters: any) => void;
}

export const ClientFilters: React.FC<ClientFiltersProps> = ({ filters, setFilters }) => {
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const [debounceTimer, setDebounceTimer] = useState<number | null>(null);
  const { data: employees } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => profilesApi.list(),
  });

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Rechercher par nom, téléphone, email..."
          className="pl-10 border-gray-100 bg-gray-50 focus:ring-blue"
          value={localSearch}
          onChange={(e) => {
            setLocalSearch(e.target.value);
            if (debounceTimer) window.clearTimeout(debounceTimer);
            const id = window.setTimeout(() => {
              setFilters({ ...filters, search: e.target.value.trim() });
            }, 400);
            setDebounceTimer(id);
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />
        <Select value={filters.service} onValueChange={(v) => setFilters({ ...filters, service: v })}>
          <SelectTrigger className="w-[160px] border-gray-100 bg-gray-50">
            <SelectValue placeholder="Service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les services</SelectItem>
            <SelectItem value="Visa Schengen">Visa Schengen</SelectItem>
            <SelectItem value="Visa USA">Visa USA</SelectItem>
            <SelectItem value="Visa UK">Visa UK</SelectItem>
            <SelectItem value="Résidence">Résidence</SelectItem>
            <SelectItem value="Visa Dubai">Visa Dubai</SelectItem>
            <SelectItem value="Pack Dubai">Pack Dubai</SelectItem>
            <SelectItem value="Visa Qatar">Visa Qatar</SelectItem>
            <SelectItem value="Pack Qatar">Pack Qatar</SelectItem>
            <SelectItem value="Visa Roumanie">Visa Roumanie</SelectItem>
            <SelectItem value="Visa Oman">Visa Oman</SelectItem>
            <SelectItem value="Visa KSA">Visa KSA</SelectItem>
            <SelectItem value="Visa Koweit">Visa Koweit</SelectItem>
            <SelectItem value="Visa Egypte">Visa Egypte</SelectItem>
            <SelectItem value="Visa Chine">Visa Chine</SelectItem>
            <SelectItem value="Visa Canada">Visa Canada</SelectItem>
            <SelectItem value="Visa Grece">Visa Grece</SelectItem>
            <SelectItem value="Visa Italie Touristique">Visa Italie Touristique</SelectItem>
            <SelectItem value="Visa Italie 1 an">Visa Italie 1 an</SelectItem>
            <SelectItem value="Autres">Autres</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
          <SelectTrigger className="w-[160px] border-gray-100 bg-gray-50">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="Nouveau">Nouveau</SelectItem>
            <SelectItem value="En cours">En cours</SelectItem>
            <SelectItem value="Complété">Complété</SelectItem>
            <SelectItem value="Refusé">Refusé</SelectItem>
            <SelectItem value="Annulé">Annulé</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.employee} onValueChange={(v) => setFilters({ ...filters, employee: v })}>
          <SelectTrigger className="w-[160px] border-gray-100 bg-gray-50">
            <SelectValue placeholder="Employé">
              {filters.employee === 'all' ? 'Tous les employés' :
                employees?.find(emp => emp.id === filters.employee)?.name ||
                employees?.find(emp => emp.id === filters.employee)?.email}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les employés</SelectItem>
            {employees?.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>{emp.name || emp.email || emp.id}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 border-l pl-4 border-gray-100">
          <Input
            type="date"
            className="w-[140px] border-gray-100 bg-gray-50 h-10 text-xs"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
          <span className="text-gray-400 text-xs">à</span>
          <Input
            type="date"
            className="w-[140px] border-gray-100 bg-gray-50 h-10 text-xs"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600"
            onClick={() => {
              const reset = { search: '', service: 'all', status: 'all', employee: 'all', startDate: '', endDate: '' };
              setLocalSearch('');
              setFilters(reset);
            }}
            type="button"
          >
            <X className="h-4 w-4" />
            Effacer
          </button>
        </div>
      </div>
    </div>
  );
};
