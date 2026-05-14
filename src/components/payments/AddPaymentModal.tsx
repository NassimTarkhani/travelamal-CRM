import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { paymentsApi, documentsApi, activitiesApi } from '@/lib/api/client';
import { usePermissions } from '@/hooks/usePermissions';
import { ImageUpload } from '@/components/ui/ImageUpload';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, 'Le montant doit être supérieur à 0'),
  payment_date: z.string().min(1, 'La date est requise'),
  method: z.enum(['Espèces', 'Virement', 'Chèque', 'Carte']),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  onSuccess: () => void;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({ isOpen, onClose, clientId, onSuccess }) => {
  const { isAdmin } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [proofFiles, setProofFiles] = useState<File[]>([]);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_date: new Date().toISOString().split('T')[0],
      method: 'Espèces',
    },
  });

  const method = watch('method');
  const needsProof = true; // Mandatory for all roles and methods

  const onSubmit: SubmitHandler<PaymentFormData> = async (data) => {
    if (needsProof && proofFiles.length === 0) {
      toast.error("Veuillez joindre une preuve de paiement (obligatoire).");
      return;
    }

    setLoading(true);
    try {
      await paymentsApi.create({
        client_id: clientId,
        amount: data.amount,
        payment_date: data.payment_date,
        method: data.method,
      });

      // Upload proof document if provided
      if (proofFiles.length > 0) {
        const fd = new FormData();
        fd.append('file', proofFiles[0]);
        fd.append('client_id', clientId);
        fd.append('document_type', 'Justificatif bancaire');
        fd.append('file_name', proofFiles[0].name);
        await documentsApi.upload(fd).catch(err => console.error('Proof upload error:', err));
      }

      // Log activity
      await activitiesApi.create({
        client_id: clientId,
        action_type: 'Paiement',
        description: `Nouveau versement de ${data.amount} TND (${data.method})`,
      });

      toast.success('Paiement enregistré avec succès');
      reset();
      setProofFiles([]);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-navy">Ajouter un Paiement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Montant (TND)</Label>
            <Input
              id="amount"
              type="number"
              step="0.001"
              {...register('amount')}
              placeholder="0.000"
              className="rounded-xl"
            />
            {errors.amount && <p className="text-xs text-red">{errors.amount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_date">Date du paiement</Label>
            <Input
              id="payment_date"
              type="date"
              {...register('payment_date')}
              className="rounded-xl"
            />
            {errors.payment_date && <p className="text-xs text-red">{errors.payment_date.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Méthode de paiement</Label>
            <Select
              value={watch('method')}
              onValueChange={(v) => setValue('method', v as any)}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Espèces">Espèces</SelectItem>
                <SelectItem value="Virement">Virement</SelectItem>
                <SelectItem value="Chèque">Chèque</SelectItem>
                <SelectItem value="Carte">Carte</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {needsProof && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3">
              <ImageUpload
                label={!isAdmin ? "Preuve de paiement *" : (method === 'Chèque' ? 'Scan du chèque' : 'Preuve de virement')}
                files={proofFiles}
                onChange={setProofFiles}
                multiple={false}
                maxFiles={1}
                hint="Image ou PDF du justificatif"
                accept="image/*,application/pdf"
              />
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Annuler
            </Button>
            <Button type="submit" className="bg-blue hover:bg-blue/90 rounded-xl" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Confirmer le paiement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
