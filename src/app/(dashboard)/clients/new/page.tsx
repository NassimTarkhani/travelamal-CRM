import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientForm } from '@/components/clients/ClientForm';

export default function NewClientPage() {
  const navigate = useNavigate();

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
          <h1 className="font-serif text-3xl font-bold text-navy">Nouveau Client</h1>
          <p className="text-sm text-gray-500">Créez un nouveau dossier client</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <ClientForm />
      </div>
    </div>
  );
}
