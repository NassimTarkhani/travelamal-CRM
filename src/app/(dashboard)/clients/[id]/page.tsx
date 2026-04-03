import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Edit, ChevronLeft, CreditCard, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { getServiceStyles } from '@/lib/utils/serviceColors';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

import { OverviewTab } from '@/components/clients/detail/OverviewTab';
import { DocumentsTab } from '@/components/clients/detail/DocumentsTab';
import { PaymentsTab } from '@/components/clients/detail/PaymentsTab';
import { ActivityTab } from '@/components/clients/detail/ActivityTab';

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEdit, canViewDocuments, canViewPayments, canViewActivity } = usePermissions();

  const { data: client, isLoading, refetch } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          responsible_employee:profiles!responsible_employee(name)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue border-t-transparent"></div>
      </div>
    );
  }

  if (!client) return <div>Client non trouvé</div>;

  const serviceStyles = getServiceStyles(client.service);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/clients')}
            className="rounded-full hover:bg-white"
          >
            <ChevronLeft className="h-6 w-6 text-navy" />
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="font-serif text-3xl font-bold text-navy">{client.full_name}</h1>
              <Badge variant="outline" className="font-mono text-xs text-gray-400">
                #{String(client.sequential_number).padStart(4, '0')}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge
                variant="outline"
                style={{ color: serviceStyles.color, backgroundColor: serviceStyles.bg, borderColor: `${serviceStyles.color}20` }}
                className="rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              >
                {client.service}
              </Badge>
              <Badge variant="outline" className="rounded-full bg-navy/5 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy">
                {client.status}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  client.amount_remaining <= 0 && client.total_amount > 0
                    ? "bg-green/10 text-green border-green/20" :
                    client.amount_paid > 0
                      ? "bg-gold/10 text-gold border-gold/20" :
                      "bg-red/10 text-red border-red/20"
                )}
              >
                {client.amount_remaining <= 0 && client.total_amount > 0 ? 'Payé' :
                  client.amount_paid > 0 ? 'Partiel' : 'Non payé'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden items-center space-x-6 rounded-2xl bg-white px-6 py-3 shadow-sm md:flex">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total</p>
              <p className="text-sm font-bold text-navy">{formatCurrency(client.total_amount)}</p>
            </div>
            <div className="h-8 w-px bg-gray-100"></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Payé</p>
              <p className="text-sm font-bold text-green">{formatCurrency(client.amount_paid)}</p>
            </div>
            <div className="h-8 w-px bg-gray-100"></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Restant</p>
              <p className={cn("text-sm font-bold", client.amount_remaining > 0 ? "text-red" : "text-green")}>
                {formatCurrency(client.amount_remaining)}
              </p>
            </div>
          </div>
          {canEdit && (
            <Link to={`/clients/${id}/edit`}>
              <Button className="bg-blue hover:bg-blue/90 rounded-xl">
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="informations" className="w-full">
        <TabsList className="mb-8 h-12 w-full justify-start space-x-8 rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="informations"
            className="rounded-none border-b-2 border-transparent px-2 pb-3 pt-2 text-sm font-semibold text-gray-500 data-[state=active]:border-blue data-[state=active]:bg-transparent data-[state=active]:text-blue"
          >
            Informations
          </TabsTrigger>
          {canViewDocuments && (
            <TabsTrigger
              value="documents"
              className="rounded-none border-b-2 border-transparent px-2 pb-3 pt-2 text-sm font-semibold text-gray-500 data-[state=active]:border-blue data-[state=active]:bg-transparent data-[state=active]:text-blue"
            >
              Documents
            </TabsTrigger>
          )}
          {canViewPayments && (
            <TabsTrigger
              value="payments"
              className="rounded-none border-b-2 border-transparent px-2 pb-3 pt-2 text-sm font-semibold text-gray-500 data-[state=active]:border-blue data-[state=active]:bg-transparent data-[state=active]:text-blue"
            >
              Paiements
            </TabsTrigger>
          )}
          {canViewActivity && (
            <TabsTrigger
              value="historique"
              className="rounded-none border-b-2 border-transparent px-2 pb-3 pt-2 text-sm font-semibold text-gray-500 data-[state=active]:border-blue data-[state=active]:bg-transparent data-[state=active]:text-blue"
            >
              Historique
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="informations">
          <OverviewTab client={client} />
        </TabsContent>

        {canViewDocuments && (
          <TabsContent value="documents">
            <DocumentsTab clientId={id!} />
          </TabsContent>
        )}
        {canViewPayments && (
          <TabsContent value="payments">
            <PaymentsTab client={client} onUpdate={refetch} />
          </TabsContent>
        )}
        {canViewActivity && (
          <TabsContent value="historique">
            <ActivityTab clientId={id!} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
