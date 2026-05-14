import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { documentsApi } from '@/lib/api/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FileText,
  Download,
  ExternalLink,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function DocumentsPage() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['all-documents'],
    queryFn: () => documentsApi.list(),
  });

  const filteredDocs = documents?.filter(doc =>
    doc.file_name?.toLowerCase().includes(search.toLowerCase()) ||
    doc.client?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    doc.document_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="font-serif text-3xl font-bold text-navy">Bibliothèque des Documents</h1>
          <p className="text-sm text-gray-500">Gérez l'ensemble des pièces jointes de vos clients</p>
        </div>
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Rechercher par fichier, type ou client..."
            className="h-11 rounded-xl border-none bg-white pl-10 shadow-sm focus-visible:ring-blue"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 w-full animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-100"></div>
          ))}
        </div>
      ) : filteredDocs?.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 py-32 bg-white/50">
          <FileText className="h-16 w-16 text-gray-200" />
          <p className="mt-4 text-sm font-medium text-gray-400">Aucun document ne correspond à votre recherche</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDocs?.map((doc) => (
            <Card key={doc.id} className="group relative overflow-hidden border-none bg-white shadow-sm ring-1 ring-gray-100 transition-all hover:-translate-y-1 hover:shadow-md">
              <CardContent className="p-0">
                {/* Preview Area */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-50 border-b border-gray-50">
                  {doc.file_url && (doc.file_name?.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif|svg)$/) || doc.document_type === 'Photo') ? (
                    <img
                      src={doc.file_url}
                      alt={doc.file_name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center grayscale opacity-20">
                      <FileText className="h-12 w-12" />
                      <span className="mt-2 text-[10px] font-bold uppercase tracking-widest">{doc.file_name?.split('.').pop()}</span>
                    </div>
                  )}

                  {/* Action Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-navy/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full shadow-lg" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-5 w-5" />
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Info Area */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-wider text-blue">
                        <span>{doc.document_type}</span>
                      </div>
                      <p className="mt-1 truncate text-sm font-bold text-navy" title={doc.file_name}>{doc.file_name}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col space-y-3 pt-3 border-t border-gray-50">
                    <div
                      className="flex items-center space-x-2 cursor-pointer rounded-lg p-1 -ml-1 transition-colors hover:bg-gray-50"
                      onClick={() => navigate(`/clients/${doc.client?.id}`)}
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-navy/5 text-navy">
                        <ExternalLink className="h-3 w-3" />
                      </div>
                      <span className="truncate text-xs font-semibold text-gray-600">{doc.client?.full_name}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <div className="flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        {doc.upload_date ? format(new Date(doc.upload_date), 'dd MMM yyyy', { locale: fr }) : 'Inconnu'}
                      </div>
                      {doc.expiry_date && (
                        <div className={cn(
                          "font-bold",
                          new Date(doc.expiry_date) < new Date() ? "text-red" : "text-amber-500"
                        )}>
                          Exp: {format(new Date(doc.expiry_date), 'dd/MM/yy', { locale: fr })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
