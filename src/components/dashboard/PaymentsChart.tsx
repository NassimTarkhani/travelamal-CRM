import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

export const PaymentsChart = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['payments-chart'],
    queryFn: async () => {
      const months = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(new Date(), 5 - i);
        return {
          month: format(date, 'MMM', { locale: fr }),
          start: startOfMonth(date).toISOString(),
          end: endOfMonth(date).toISOString(),
        };
      });

      const results = await Promise.all(
        months.map(async (m) => {
          const { data } = await supabase
            .from('payments')
            .select('amount')
            .gte('payment_date', m.start)
            .lte('payment_date', m.end)
            .eq('is_deleted', false);
          
          const total = data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
          return { name: m.month, total };
        })
      );

      return results;
    },
  });

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-navy">Évolution des Paiements (6 mois)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {isLoading ? (
            <div className="flex h-full w-full items-center justify-center bg-gray-50">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue border-t-transparent"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => `${value} TND`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="total" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
