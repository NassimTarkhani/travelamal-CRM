import React from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel
} from '@tanstack/react-table';
import { Eye, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Client } from '@/types/app.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { getServiceStyles } from '@/lib/utils/serviceColors';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';

interface ClientsTableProps {
  data: any[];
  loading: boolean;
}

const columnHelper = createColumnHelper<any>();

export const ClientsTable: React.FC<ClientsTableProps> = ({ data, loading }) => {
  const { canEdit } = usePermissions();

  const columns = [
    columnHelper.accessor('sequential_number', {
      header: '#',
      cell: (info) => <span className="font-mono text-xs text-gray-400">#{String(info.getValue()).padStart(4, '0')}</span>,
    }),
    columnHelper.accessor('full_name', {
      header: 'Nom complet',
      cell: (info) => <span className="font-semibold text-navy">{info.getValue()}</span>,
    }),
    columnHelper.accessor('service', {
      header: 'Service',
      cell: (info) => {
        const styles = getServiceStyles(info.getValue());
        return (
          <Badge
            variant="outline"
            style={{ color: styles.color, backgroundColor: styles.bg, borderColor: `${styles.color}20` }}
            className="rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          >
            {info.getValue()}
          </Badge>
        );
      },
    }),
    columnHelper.accessor('status', {
      header: 'Statut',
      cell: (info) => {
        const status = info.getValue();
        const variants: Record<string, string> = {
          'Nouveau': 'bg-blue/10 text-blue border-blue/20',
          'En cours': 'bg-gold/10 text-gold border-gold/20',
          'Complété': 'bg-green/10 text-green border-green/20',
          'Refusé': 'bg-red/10 text-red border-red/20',
          'Annulé': 'bg-gray-100 text-gray-600 border-gray-200',
        };
        return (
          <Badge variant="outline" className={cn("rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider", variants[status] || 'bg-gray-100')}>
            {status}
          </Badge>
        );
      },
    }),
    columnHelper.accessor('total_amount', {
      header: 'Total',
      cell: (info) => <span className="text-sm font-medium">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('amount_paid', {
      header: 'Payé',
      cell: (info) => <span className="text-sm font-medium text-green">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('amount_remaining', {
      header: 'Restant',
      cell: (info) => {
        const remaining = Number(info.getValue() || 0);
        const total = Number(info.row.original.total_amount || 0);
        
        if (remaining <= 0 && total > 0) return <CheckCircle2 className="h-5 w-5 text-green" />;
        if (total === 0) return <span className="text-sm text-gray-400">-</span>;
        
        return <span className={cn("text-sm font-bold", remaining > 0 ? "text-red" : "text-green")}>
          {formatCurrency(remaining)}
        </span>;
      },
    }),
    columnHelper.accessor('responsible_employee', {
      header: 'Responsable',
      cell: (info) => {
        const value = info.getValue();
        // Handle both joined object and potential direct ID if join fails
        const name = typeof value === 'object' && value !== null ? (value as any).name : 'Non assigné';
        return <span className="text-xs font-medium text-gray-500">{name}</span>;
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <div className="flex items-center space-x-2">
          <Link to={`/clients/${info.row.original.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue hover:bg-blue/10">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          {canEdit && (
            <Link to={`/clients/${info.row.original.id}/edit`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gold hover:bg-gold/10">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-gray-50">
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="pb-4 pt-0 text-xs font-bold uppercase tracking-wider text-gray-400">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="animate-pulse border-b border-gray-50">
                {Array.from({ length: 9 }).map((_, j) => (
                  <td key={j} className="py-4">
                    <div className="h-4 w-full rounded bg-gray-50"></div>
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-20 text-center text-gray-400">
                Aucun client trouvé
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-gray-50 transition-colors hover:bg-gray-50/50"
                style={{ borderLeft: `4px solid ${getServiceStyles(row.original.service).color}` }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="py-4 px-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()}
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-xl"
          >
            Précédent
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded-xl"
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
};
