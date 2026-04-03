import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { Users, CreditCard, TrendingUp, Wallet, Calendar, Filter, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ensureJsPDF } from '@/lib/utils/pdfLoader';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

type TimeFilter = 'today' | 'yesterday' | '7days' | '30days' | 'month' | 'year' | 'all';

export default function StatisticsPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30days');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats', timeFilter],
    queryFn: async () => {
      // 1. Fetch Clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('service, total_amount, amount_paid, created_at');
      if (clientsError) throw clientsError;

      // 2. Fetch Payments (for collected amounts, filtered by payment_date)
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, payment_date, created_at')
        .or('is_deleted.is.null,is_deleted.eq.false');
      if (paymentsError) throw paymentsError;

      // 3. Fetch Expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount, created_at');
      if (expensesError) throw expensesError;

      const now = new Date();
      let start: Date | null = null;
      let end: Date = endOfDay(now);

      switch (timeFilter) {
        case 'today':
          start = startOfDay(now);
          end = endOfDay(now);
          break;
        case 'yesterday':
          start = startOfDay(subDays(now, 1));
          end = endOfDay(subDays(now, 1));
          break;
        case '7days':
          start = startOfDay(subDays(now, 6));
          break;
        case '30days':
          start = startOfDay(subDays(now, 29));
          break;
        case 'month':
          start = startOfMonth(now);
          end = endOfMonth(now);
          break;
        case 'year':
          start = startOfYear(now);
          break;
        case 'all':
          start = null;
          break;
      }

      const inRange = (dateStr: string | null) => {
        if (!start) return true;            // 'all' filter — include everything
        if (!dateStr) return true;          // unknown date — include in all periods
        const d = new Date(dateStr);
        return d >= start && d <= end;
      };

      const filteredClients = clients?.filter(c => inRange(c.created_at)) || [];
      const filteredPayments = payments?.filter(p => inRange(p.payment_date ?? p.created_at)) || [];
      const filteredExpenses = expenses?.filter(e => inRange(e.created_at)) || [];

      // KPIs
      const totalRevenue = filteredClients.reduce((s, c) => s + Number(c.total_amount), 0);
      const totalCollected = filteredPayments.reduce((s, p) => s + Number(p.amount), 0);
      const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);
      const netProfit = totalCollected - totalExpenses;
      const clientCount = filteredClients.length;

      // Revenue by Service
      const serviceMap: Record<string, number> = {};
      filteredClients.forEach(c => {
        const s = c.service || 'Autres';
        serviceMap[s] = (serviceMap[s] || 0) + Number(c.total_amount);
      });
      const revenueByService = Object.entries(serviceMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Chart data
      const chartData: { name: string; revenue: number; expenses: number }[] = [];

      if (timeFilter === 'today' || timeFilter === 'yesterday') {
        // Hourly breakdown
        const baseDay = timeFilter === 'today' ? now : subDays(now, 1);
        for (let h = 0; h < 24; h++) {
          const label = `${String(h).padStart(2, '0')}h`;
          const hStart = new Date(baseDay); hStart.setHours(h, 0, 0, 0);
          const hEnd = new Date(baseDay); hEnd.setHours(h, 59, 59, 999);
          chartData.push({
            name: label,
            revenue: filteredPayments.filter(p => { const d = new Date(p.payment_date ?? p.created_at!); return d >= hStart && d <= hEnd; }).reduce((s, p) => s + Number(p.amount), 0),
            expenses: filteredExpenses.filter(e => { const d = new Date(e.created_at!); return d >= hStart && d <= hEnd; }).reduce((s, e) => s + Number(e.amount), 0),
          });
        }
      } else if (timeFilter === '7days' || timeFilter === '30days') {
        const days = timeFilter === '7days' ? 6 : 29;
        for (let i = days; i >= 0; i--) {
          const d = subDays(now, i);
          const dStart = startOfDay(d);
          const dEnd = endOfDay(d);
          const label = format(d, 'dd/MM');
          chartData.push({
            name: label,
            revenue: filteredPayments.filter(p => { const x = new Date(p.payment_date ?? p.created_at!); return x >= dStart && x <= dEnd; }).reduce((s, p) => s + Number(p.amount), 0),
            expenses: filteredExpenses.filter(e => { const x = new Date(e.created_at!); return x >= dStart && x <= dEnd; }).reduce((s, e) => s + Number(e.amount), 0),
          });
        }
      } else if (timeFilter === 'month') {
        // Daily for current month
        const daysInMonth = endOfMonth(now).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          const d = new Date(now.getFullYear(), now.getMonth(), i);
          const dStart = startOfDay(d);
          const dEnd = endOfDay(d);
          const label = format(d, 'dd/MM');
          chartData.push({
            name: label,
            revenue: filteredPayments.filter(p => { const x = new Date(p.payment_date ?? p.created_at!); return x >= dStart && x <= dEnd; }).reduce((s, p) => s + Number(p.amount), 0),
            expenses: filteredExpenses.filter(e => { const x = new Date(e.created_at!); return x >= dStart && x <= dEnd; }).reduce((s, e) => s + Number(e.amount), 0),
          });
        }
      } else {
        // Monthly for year / all — last 12 months
        for (let i = 11; i >= 0; i--) {
          const mStart = startOfMonth(subMonths(now, i));
          const mEnd = endOfMonth(subMonths(now, i));
          const label = format(mStart, 'MMM yy', { locale: fr });
          chartData.push({
            name: label,
            revenue: (timeFilter === 'all' ? (payments || []) : filteredPayments).filter(p => { const x = new Date(p.payment_date ?? p.created_at!); return x >= mStart && x <= mEnd; }).reduce((s, p) => s + Number(p.amount), 0),
            expenses: (timeFilter === 'all' ? (expenses || []) : filteredExpenses).filter(e => { const x = new Date(e.created_at!); return x >= mStart && x <= mEnd; }).reduce((s, e) => s + Number(e.amount), 0),
          });
        }
      }

      return {
        totalRevenue,
        totalCollected,
        totalExpenses,
        netProfit,
        clientCount,
        revenueByService,
        chartData
      };
    },
  });

  const fmtPDF = (n: number | null | undefined) => {
    if (n == null) return '0,000 TND';
    const [intPart, decPart] = n.toFixed(3).split('.');
    return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + decPart + ' TND';
  };

  const handleDownloadPDF = async () => {
    if (!stats) return;
    try {
      const jsPDF = await ensureJsPDF();
      if (!jsPDF) { toast.error('Bibliothèque PDF non disponible'); return; }
      const doc = new jsPDF();
      const periodLabels: Record<string, string> = {
        today: "Aujourd'hui",
        yesterday: 'Hier',
        '7days': '7 derniers jours',
        '30days': '30 derniers jours',
        month: 'Ce mois',
        year: 'Cette année',
        all: 'Tout',
      };
      const now = new Date();

      // Header
      doc.setFillColor(13, 27, 62);
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Travel Amal CRM — Rapport Statistiques', 14, 19);

      // Subtitle
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Période: ${periodLabels[timeFilter]}   |   Généré le ${format(now, 'dd/MM/yyyy HH:mm', { locale: fr })}`, 14, 26);

      // KPIs
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Indicateurs Clés (KPIs)', 14, 44);

      const kpis = [
        { label: "Chiffre d'Affaires", value: fmtPDF(stats.totalRevenue) },
        { label: 'Montant Collecté', value: fmtPDF(stats.totalCollected) },
        { label: 'Dépenses Total', value: fmtPDF(stats.totalExpenses) },
        { label: 'Bénéfice Net', value: fmtPDF(stats.netProfit) },
        { label: 'Total Clients', value: String(stats.clientCount) },
      ];

      doc.setFontSize(10);
      let y = 54;
      kpis.forEach((kpi, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y - 5, 182, 10, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label, 18, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(13, 27, 62);
        doc.text(kpi.value, 130, y);
        y += 12;
      });

      // Revenue by Service
      y += 6;
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Répartition par Service', 14, y);
      y += 10;

      doc.setFontSize(10);
      stats.revenueByService.slice(0, 15).forEach((item, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y - 5, 182, 10, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(item.name, 18, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(13, 27, 62);
        doc.text(fmtPDF(item.value), 130, y);
        y += 12;
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
      });

      doc.save(`statistiques_${timeFilter}_${format(now, 'yyyyMMdd')}.pdf`);
      toast.success('Rapport PDF généré');
    } catch (err: any) {
      console.error(err);
      toast.error('Impossible de générer le PDF');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="font-serif text-3xl font-bold text-navy">Analyses & Statistiques</h1>
          <p className="text-sm text-gray-500">Aperçu de la performance financière</p>
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
            <SelectTrigger className="w-[180px] rounded-xl border-none shadow-sm bg-white">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="yesterday">Hier</SelectItem>
              <SelectItem value="7days">7 derniers jours</SelectItem>
              <SelectItem value="30days">30 derniers jours</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
              <SelectItem value="all">Tout</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="rounded-xl border-navy/20 bg-white shadow-sm hover:bg-navy hover:text-white"
            onClick={handleDownloadPDF}
            disabled={isLoading || !stats}
          >
            <Download className="mr-2 h-4 w-4" />
            Télécharger PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Chiffre d'Affaires" value={formatCurrency(stats?.totalRevenue)} icon={TrendingUp} color="blue" />
        <StatCard title="Montant Collecté" value={formatCurrency(stats?.totalCollected)} icon={CreditCard} color="green" />
        <StatCard title="Dépenses Total" value={formatCurrency(stats?.totalExpenses)} icon={Wallet} color="red" />
        <StatCard title="Bénéfice Net" value={formatCurrency(stats?.netProfit)} icon={TrendingUp} color="gold" />
        <StatCard title="Total Clients" value={stats?.clientCount.toString() || '0'} icon={Users} color="gray" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-navy">Performance Financière (Revenue vs Dépenses)</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoading ? (
              <div className="h-full w-full animate-pulse rounded-2xl bg-gray-50"></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    formatter={(value: any) => [formatCurrency(value)]}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Area type="monotone" name="Revenue" dataKey="revenue" stroke="#2563EB" strokeWidth={3} fill="url(#colorRevenue)" />
                  <Area type="monotone" name="Dépenses" dataKey="expenses" stroke="#EF4444" strokeWidth={3} fill="url(#colorExpenses)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-navy">Répartition par Service</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoading ? (
              <div className="h-full w-full animate-pulse rounded-2xl bg-gray-50"></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.revenueByService} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} width={120} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    formatter={(value: any) => [formatCurrency(value), 'Revenu']}
                  />
                  <Bar dataKey="value" fill="#2563EB" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const StatCard = ({ title, value, icon: Icon, color }: any) => {
  const colors: any = {
    blue: 'bg-blue/10 text-blue',
    green: 'bg-green/10 text-green',
    red: 'bg-red/10 text-red',
    gold: 'bg-gold/10 text-gold',
    gray: 'bg-gray-100 text-gray-600',
  };
  return (
    <Card className="border-none shadow-sm transition-all hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
            <h3 className="mt-1 text-lg font-bold text-navy">{value}</h3>
          </div>
          <div className={cn("rounded-xl p-3", colors[color])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
