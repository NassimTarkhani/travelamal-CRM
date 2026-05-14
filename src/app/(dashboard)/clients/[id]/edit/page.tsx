import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { clientsApi } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ClientForm } from '@/components/clients/ClientForm';

export default function EditClientPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: client, isLoading } = useQuery({
    queryKey: ['client-edit', id],
    queryFn: () => clientsApi.get(id!),
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-full hover:bg-white"
        >
          <ChevronLeft className="h-6 w-6 text-navy" />
        </Button>
        <div>
          <h1 className="font-serif text-3xl font-bold text-navy">Modifier Client</h1>
          <p className="text-sm text-gray-500">Mise à jour du dossier de {client?.full_name}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <ClientForm initialData={client} clientId={id} />
      </div>
    </div>
  );
}
