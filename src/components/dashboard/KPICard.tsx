import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color: 'blue' | 'gold' | 'green' | 'red';
  loading?: boolean;
  alert?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, icon: Icon, color, loading, alert }) => {
  const colorClasses = {
    blue: 'bg-blue/10 text-blue',
    gold: 'bg-gold/10 text-gold',
    green: 'bg-green/10 text-green',
    red: 'bg-red/10 text-red',
  };

  return (
    <Card className="overflow-hidden border-none shadow-sm transition-all hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            {loading ? (
              <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-100"></div>
            ) : (
              <h3 className="mt-1 text-2xl font-bold text-navy">{value}</h3>
            )}
          </div>
          <div className={cn("rounded-2xl p-3", colorClasses[color])}>
            <Icon className={cn("h-6 w-6", alert && color === 'red' && "animate-bounce")} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
