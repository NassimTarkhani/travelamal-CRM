import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const EmployeeChart = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['employee-chart'],
    queryFn: async () => {
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, recorded_by, profiles(name)')
        .eq('is_deleted', false);
      
      const counts: Record<string, { name: string, total: number }> = {};
      payments?.forEach(p => {
        const id = p.recorded_by || 'Unknown';
        const name = (p.profiles as any)?.name || 'Inconnu';
        if (!counts[id]) counts[id] = { name, total: 0 };
        counts[id].total += Number(p.amount);
      });

      return Object.values(counts).sort((a, b) => b.total - a.total).slice(0, 5);
    },
  });

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-navy">Performance Employés (Collecte)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          {isLoading ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue border-t-transparent"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 500 }}
                  width={80}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [`${value} TND`, 'Collecté']}
                />
                <Bar dataKey="total" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
