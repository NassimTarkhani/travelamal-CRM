import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientsApi, paymentsApi } from '@/lib/api/client';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { getServiceStyles } from '@/lib/utils/serviceColors';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Search } from 'lucide-react';

export default function PaymentsPage() {
  const { isAdmin } = usePermissions();
  const [activeTab, setActiveTab] = useState('by-client');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: clients, isLoading: loadingClients, refetch: refetchClients } = useQuery({
    queryKey: ['payments-by-client'],
    queryFn: () => clientsApi.list(),
  });

  const { data: allPayments, isLoading: loadingPayments } = useQuery({
    queryKey: ['all-payments-history'],
    queryFn: () => paymentsApi.list(),
  });

  const { data: employeeStats, isLoading: loadingStats } = useQuery({
    queryKey: ['payments-by-employee'],
    queryFn: () => paymentsApi.employeeStats(),
    enabled: isAdmin,
  });

  const markAsPaid = async (client: any) => {
    if (!isAdmin) return;
    if (!confirm(`Marquer le dossier de ${client.full_name} comme entièrement payé ?`)) return;

    try {
      const amountToPay = client.amount_remaining;

      await paymentsApi.create({
        client_id: client.id,
        amount: amountToPay,
        method: 'Espèces',
        payment_date: new Date().toISOString().split('T')[0],
      });

      toast.success('Paiement complété');
      refetchClients();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredClients = clients?.filter((c) =>
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold text-navy">Suivi des Paiements</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-8 h-12 w-full justify-start space-x-8 rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="by-client"
            className="rounded-none border-b-2 border-transparent px-2 pb-3 pt-2 text-sm font-semibold text-gray-500 data-[state=active]:border-blue data-[state=active]:bg-transparent data-[state=active]:text-blue"
          >
            Par Client
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="hidden rounded-none border-b-2 border-transparent px-2 pb-3 pt-2 text-sm font-semibold text-gray-500 data-[state=active]:border-blue data-[state=active]:bg-transparent data-[state=active]:text-blue"
          >
            Historique
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger
              value="by-employee"
              className="hidden rounded-none border-b-2 border-transparent px-2 pb-3 pt-2 text-sm font-semibold text-gray-500 data-[state=active]:border-blue data-[state=active]:bg-transparent data-[state=active]:text-blue"
            >
              Par Employé
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="by-client">
          {/* Search bar (admin only) */}
          {isAdmin && (
            <div className="mb-4 relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Rechercher un client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl border-gray-200 bg-white shadow-sm"
              />
            </div>
          )}
          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="px-6 py-4 text-xs font-bold uppercase text-gray-400">Client</TableHead>
                    <TableHead className="px-6 py-4 text-xs font-bold uppercase text-gray-400">Service</TableHead>
                    <TableHead className="px-6 py-4 text-xs font-bold uppercase text-gray-400">Date inscription</TableHead>
                    <TableHead className="px-6 py-4 text-xs font-bold uppercase text-gray-400">Total</TableHead>
                    <TableHead className="px-6 py-4 text-xs font-bold uppercase text-gray-400">Payé</TableHead>
                    <TableHead className="px-6 py-4 text-xs font-bold uppercase text-gray-400">Restant</TableHead>
                    <TableHead className="px-6 py-4 text-xs font-bold uppercase text-gray-400">Statut</TableHead>
                    <TableHead className="px-6 py-4 text-right text-xs font-bold uppercase text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingClients ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell colSpan={8} className="px-6 py-4">
                          <div className="h-4 w-full rounded bg-gray-50"></div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    filteredClients?.map((client) => (
                      <TableRow key={client.id} className="transition-colors hover:bg-gray-50/50">
                        <TableCell className="px-6 py-4 font-semibold text-navy">{client.full_name}</TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge
                            variant="outline"
                            style={{
                              color: getServiceStyles(client.service).color,
                              backgroundColor: getServiceStyles(client.service).bg,
                              borderColor: `${getServiceStyles(client.service).color}20`
                            }}
                            className="rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                          >
                            {client.service}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-gray-500">
                          {client.created_at ? new Date(client.created_at).toLocaleDateString('fr-FR') : '—'}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm font-medium">{formatCurrency(client.total_amount)}</TableCell>
                        <TableCell className="px-6 py-4 text-sm font-bold text-green">{formatCurrency(client.amount_paid)}</TableCell>
                        <TableCell className="px-6 py-4">
                          <span className={cn("text-sm font-bold", client.amount_remaining > 0 ? "text-red" : "text-green")}>
                            {formatCurrency(client.amount_remaining)}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                              client.amount_remaining <= 0 && client.total_amount > 0 ? "bg-green/10 text-green border-green/20" :
                                client.amount_paid > 0 ? "bg-gold/10 text-gold border-gold/20" :
                                  "bg-red/10 text-red border-red/20"
                            )}
                          >
                            {client.amount_remaining <= 0 && client.total_amount > 0 ? 'Payé' :
                              client.amount_paid > 0 ? 'Partiel' : 'Non payé'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          {isAdmin && client.amount_remaining > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl border-green/30 bg-green/5 text-green hover:bg-green hover:text-white"
                              onClick={() => markAsPaid(client)}
                            >
                              Marquer payé
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="px-6 py-4 text-xs font-bold uppercase text-gray-400">Date</TableHead>
                    <TableHead className="px-6 py-4 text-xs font-bold uppercase text-gray-400">Client</TableHead>
                    <TableHead className="px-6 py-4 text-xs font-bold uppercase text-gray-400">Montant</TableHead>
                    <TableHead className="px-6 py-4 text-xs font-bold uppercase text-gray-400">Méthode</TableHead>
                    <TableHead className="px-6 py-4 text-xs font-bold uppercase text-gray-400">Reçu par</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPayments ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell colSpan={5} className="px-6 py-4">
                          <div className="h-4 w-full rounded bg-gray-50"></div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    allPayments?.map((payment) => (
                      <TableRow key={payment.id} className="transition-colors hover:bg-gray-50/50">
                        <TableCell className="px-6 py-4 text-sm font-medium text-gray-500">
                          {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell className="px-6 py-4 font-semibold text-navy">
                          {(payment.client as any)?.full_name || 'Client inconnu'}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm font-bold text-green">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600 font-bold uppercase tracking-widest text-[10px]">
                            {payment.method}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-xs font-medium text-gray-400 italic">
                          {(payment.recorder as any)?.name || 'Admin'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {!loadingPayments && allPayments?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="px-6 py-20 text-center text-gray-400 italic">
                        Aucun paiement enregistré pour le moment.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-employee">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="px-6 py-4">Employé</TableHead>
                    <TableHead className="px-6 py-4">Nombre d'opérations</TableHead>
                    <TableHead className="px-6 py-4">Montant Collecté</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingStats ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell colSpan={3} className="px-6 py-4">
                          <div className="h-4 w-full rounded bg-gray-50"></div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    employeeStats?.map((stat, i) => (
                      <TableRow key={i} className="transition-colors hover:bg-gray-50/50">
                        <TableCell className="px-6 py-4 font-semibold text-navy">{stat.name}</TableCell>
                        <TableCell className="px-6 py-4 text-sm">{stat.count}</TableCell>
                        <TableCell className="px-6 py-4 text-sm font-bold text-green">{formatCurrency(stat.total)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
