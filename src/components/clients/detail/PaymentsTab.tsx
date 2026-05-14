import React, { useState } from 'react';
import { Plus, CreditCard, Trash2, Calendar, User, Receipt } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { paymentsApi } from '@/lib/api/client';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AddPaymentModal } from '@/components/payments/AddPaymentModal';
import { ensureJsPDF } from '@/lib/utils/pdfLoader';

export const PaymentsTab = ({ client, onUpdate }: { client: any, onUpdate: () => void }) => {
  const { isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: payments, isLoading } = useQuery({
    queryKey: ['client-payments', client.id],
    queryFn: () => paymentsApi.listByClient(client.id),
  });

  const deletePayment = async (payment: any) => {
    if (!confirm('Voulez-vous vraiment supprimer ce paiement ?')) return;

    try {
      await paymentsApi.softDelete(payment.id);

      queryClient.invalidateQueries({ queryKey: ['client-payments', client.id] });
      onUpdate();
      toast.success('Paiement supprimé');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const paidPercentage = Math.min(100, (client.amount_paid / client.total_amount) * 100) || 0;

  const handleGenerateReceipt = async (payment: any) => {
    try {
      const jsPDF = await ensureJsPDF();
      if (!jsPDF) {
        toast.error('Bibliothèque PDF non disponible');
        return;
      }
      const fmtPDF = (n: number | null | undefined) => {
        if (n == null) return '0,000 TND';
        const [intPart, decPart] = Number(n).toFixed(3).split('.');
        return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + decPart + ' TND';
      };
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Reçu de Paiement', 20, 20);
      doc.setFontSize(11);
      doc.text(`Client: ${client.full_name || ''}`, 20, 36);
      doc.text(`Montant: ${fmtPDF(payment.amount)}`, 20, 46);
      doc.text(`Date: ${format(new Date(payment.payment_date), 'dd/MM/yyyy')}`, 20, 56);
      doc.text(`Méthode: ${payment.method}`, 20, 66);
      doc.text(`Enregistré par: ${(payment as any).recorder?.name || (payment as any).profiles?.name || ''}`, 20, 76);
      const safeName = (client.full_name || client.id).replace(/[^a-z0-9]/gi, '_');
      doc.save(`recu_${safeName}_${payment.id}.pdf`);
      toast.success('Reçu généré');
    } catch (err: any) {
      console.error('PDF generation error:', err);
      toast.error('Impossible de générer le reçu');
    }
  };

  return (
    <div className="space-y-8">
      {/* Summary Card */}
      <Card className="border-none bg-navy text-white shadow-xl">
        <CardContent className="p-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-white/60">Montant Total</p>
              <h3 className="text-3xl font-bold">{formatCurrency(client.total_amount)}</h3>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-white/60">Montant Payé</p>
              <h3 className="text-3xl font-bold text-green">{formatCurrency(client.amount_paid)}</h3>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-white/60">Reste à Payer</p>
              <h3 className="text-3xl font-bold text-gold">{formatCurrency(client.amount_remaining)}</h3>
            </div>
          </div>

          <div className="mt-8 space-y-2">
            <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
              <span>Progression du paiement</span>
              <span>{Math.round(paidPercentage)}%</span>
            </div>
            <Progress value={paidPercentage} className="h-2 bg-white/10" />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-navy">Historique des versements</h3>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue hover:bg-blue/90 rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter paiement
        </Button>
      </div>

      {/* Payments Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Date</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Montant</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Méthode</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Enregistré par</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="animate-pulse border-b border-gray-50">
                  <td colSpan={5} className="px-6 py-4">
                    <div className="h-4 w-full rounded bg-gray-50"></div>
                  </td>
                </tr>
              ))
            ) : payments?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                  Aucun paiement enregistré
                </td>
              </tr>
            ) : (
              payments?.map((payment) => (
                <tr key={payment.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-navy">
                        {format(new Date((payment.payment_date ?? payment.created_at)!), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-green">{formatCurrency(payment.amount)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                      {payment.method}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-xs text-gray-500">{(payment as any).recorder?.name || (payment as any).profiles?.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleGenerateReceipt(payment)}
                        title="Générer reçu"
                      >
                        <Receipt className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red hover:bg-red/10"
                          onClick={() => deletePayment(payment)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddPaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        clientId={client.id}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['client-payments', client.id] });
          onUpdate();
        }}
      />
    </div>
  );
};
