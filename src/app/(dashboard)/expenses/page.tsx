import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Plus, 
  Wallet, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Receipt,
  User,
  Calendar,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ui/ImageUpload';

export default function ExpensesPage() {
  const { user, profile } = useAuthStore();
  const { isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');

  // Fetch employees for filter (admin only)
  const { data: employees } = useQuery({
    queryKey: ['employees-list-expenses'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, name, email');
      return data;
    },
    enabled: isAdmin
  });

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', employeeFilter],
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select('*, profiles(name, email), clients(full_name)')
        .order('created_at', { ascending: false });

      if (employeeFilter !== 'all') {
        query = query.eq('created_by', employeeFilter);
      } else if (!isAdmin) {
        query = query.eq('created_by', user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const deleteExpense = async (id: string) => {
    if (!confirm('Supprimer cette dépense ?')) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Dépense supprimée');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    }
  };

  const filteredExpenses = expenses?.filter(e => 
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.clients?.full_name && e.clients.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalAmount = filteredExpenses?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="font-serif text-3xl font-bold text-navy">Gestion des Dépenses</h1>
          <p className="text-sm text-gray-500">Suivi des coûts et frais de dossier</p>
        </div>
        <AddExpenseModal onSuccess={() => queryClient.invalidateQueries({ queryKey: ['expenses'] })} />
      </div>

      {/* Summary Stat */}
      <Card className="border-none bg-navy text-white shadow-lg overflow-hidden relative">
        <div className="absolute right-0 top-0 h-full w-32 bg-gold/10 skew-x-[-20deg] translate-x-16"></div>
        <CardContent className="p-6 relative z-10 flex items-center space-x-6">
          <div className="rounded-2xl bg-white/10 p-4">
            <Wallet className="h-8 w-8 text-gold" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/60">Total des dépenses</p>
            <h3 className="text-3xl font-bold mt-1 text-gold">{formatCurrency(totalAmount)}</h3>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input 
            placeholder="Rechercher par description ou client..." 
            className="pl-10 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {isAdmin && (
          <div className="w-full md:w-64">
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="rounded-xl">
                <Filter className="mr-2 h-4 w-4 text-gray-400" />
                <SelectValue placeholder="Filtrer par employé" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les employés</SelectItem>
                {employees?.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.name || emp.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Date</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Description</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Client</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Montant</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Par</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="h-4 w-full rounded bg-gray-50"></div>
                    </td>
                  </tr>
                ))
              ) : filteredExpenses?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-400">
                    Aucune dépense enregistrée
                  </td>
                </tr>
              ) : (
                filteredExpenses?.map((expense) => (
                  <tr key={expense.id} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2 text-sm text-navy">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{format(new Date(expense.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-navy">{expense.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      {expense.clients ? (
                        <Badge variant="outline" className="bg-blue/5 text-blue border-blue/10">
                          {expense.clients.full_name}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-red-500">{formatCurrency(expense.amount)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <User className="h-4 w-4" />
                        <span>{expense.profiles?.name || expense.profiles?.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {expense.proof_url && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue hover:bg-blue/5" asChild>
                            <a href={expense.proof_url} target="_blank" rel="noopener noreferrer">
                              <Receipt className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {isAdmin && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red hover:bg-red/5"
                            onClick={() => deleteExpense(expense.id)}
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
      </div>
    </div>
  );
}

function AddExpenseModal({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('none');
  const [proofFiles, setProofFiles] = useState<File[]>([]);

  const { data: clients } = useQuery({
    queryKey: ['clients-list-short'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('id, full_name').order('full_name');
      return data;
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return toast.error('Veuillez remplir les champs obligatoires');
    if (proofFiles.length === 0) return toast.error('Le justificatif est obligatoire');

    setLoading(true);
    try {
      // 1. Upload proof
      const file = proofFiles[0];
      const ext = file.name.split('.').pop();
      const path = `expenses/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('client-documents').getPublicUrl(path);

      // 2. Insert expense
      const { error } = await supabase.from('expenses').insert([{
        amount: parseFloat(amount),
        description,
        client_id: clientId === 'none' ? null : clientId,
        proof_url: publicUrl,
        created_by: user?.id
      }]);

      if (error) throw error;

      toast.success('Dépense enregistrée');
      setIsOpen(false);
      setAmount('');
      setDescription('');
      setProofFiles([]);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue hover:bg-blue/90 rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle dépense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-navy">Ajouter une dépense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Montant (TND) *</Label>
            <Input 
              type="number" 
              step="0.001" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder="0.000"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Description / Motif *</Label>
            <Input 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Ex: Frais de timbre, transport..." 
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Lier à un client (Optionnel)</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Choisir un client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun (Dépense agence)</SelectItem>
                {clients?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Justificatif *</Label>
            <ImageUpload
              label="Preuve de dépense"
              files={proofFiles}
              onChange={setProofFiles}
              multiple={false}
              maxFiles={1}
              hint="JPG, PNG, PDF obligatory"
              accept="image/*,application/pdf"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">Annuler</Button>
            <Button type="submit" className="bg-blue hover:bg-blue/90 rounded-xl" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
