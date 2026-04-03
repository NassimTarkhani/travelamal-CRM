import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, Trash2, Download, Clock, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const DocumentsTab = ({ clientId }: { clientId: string }) => {
  const { user } = useAuthStore();
  const { isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('Autre');
  const [expiryDate, setExpiryDate] = useState('');

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', clientId)
        .order('upload_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      setUploading(true);

      for (const file of files) {
        // Unique naming with timestamp
        const timestamp = new Date().getTime();
        const fileExt = file.name.split('.').pop();
        const safeName = file.name.replace(`.${fileExt}`, '').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `${safeName}_${timestamp}.${fileExt}`;
        const filePath = `${clientId}/${fileName}`;

        try {
          // 1. Storage Upload
          const { error: uploadError } = await supabase.storage
            .from('client-documents')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          // 2. Get Public URL
          const { data: { publicUrl } } = supabase.storage
            .from('client-documents')
            .getPublicUrl(filePath);

          // 3. Database Entry
          const { error: dbError } = await supabase.from('documents').insert([{
            client_id: clientId,
            document_type: docType,
            file_url: publicUrl,
            file_name: file.name,
            expiry_date: null,
            uploaded_by: user?.id,
            status: 'Présent',
          }]);

          if (dbError) throw dbError;

          // 4. Activity Log
          await supabase.from('activities').insert([{
            client_id: clientId,
            action_type: 'Document',
            description: `Document ajouté : ${docType} (${file.name})`,
            performed_by: user?.id,
          }]);

          toast.success(`${file.name} ajouté`);
        } catch (err: any) {
          toast.error(`Erreur pour ${file.name}: ${err.message}`);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', clientId] });
    },
    onSettled: () => setUploading(false),
  });

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      uploadMutation.mutate(acceptedFiles);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    disabled: uploading
  } as any);

  const deleteDocument = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      queryClient.invalidateQueries({ queryKey: ['documents', clientId] });
      toast.success('Document supprimé');
    }
  };

  return (
    <div className="space-y-8">
      {/* Loading */}
      {isLoading && (
        <div className="flex h-32 items-center justify-center rounded-2xl bg-gray-50/50">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue border-t-transparent" />
        </div>
      )}

      {/* Upload Section Card */}
      <Card className="overflow-hidden border-none bg-white shadow-sm ring-1 ring-gray-100">
        <CardContent className="p-6">
          <div className="flex flex-col space-y-8">
            <div className="space-y-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Ajouter un document</h3>
              <div className="max-w-md">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500">Nature du document</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger className="h-10 rounded-xl border-gray-100 bg-gray-50/50 focus:ring-blue/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Passeport">Passeport</SelectItem>
                      <SelectItem value="CIN">CIN</SelectItem>
                      <SelectItem value="Photo">Photo</SelectItem>
                      <SelectItem value="Justificatif bancaire">Justificatif bancaire</SelectItem>
                      <SelectItem value="Réservation vol">Réservation vol</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <div
                {...getRootProps()}
                className={cn(
                  "relative flex h-full min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all",
                  isDragActive ? "border-blue bg-blue/5 scale-[0.99]" : "border-gray-200 bg-gray-50/30 hover:border-blue/40 hover:bg-white",
                  uploading && "pointer-events-none opacity-50"
                )}
              >
                <input {...getInputProps()} />
                <div className={cn(
                  "flex flex-col items-center transition-transform",
                  isDragActive ? "scale-110" : "scale-100"
                )}>
                  <div className="mb-3 rounded-full bg-blue/10 p-3 text-blue">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-navy">
                    {uploading ? 'Traitement en cours...' : 'Déposez votre document ici'}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">PDF, JPG, PNG (Max 5MB)</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-navy flex items-center">
            Documents du dossier
            {documents && documents.length > 0 && (
              <span className="ml-3 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
                {documents.length}
              </span>
            )}
          </h3>
        </div>

        {!isLoading && documents?.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 py-20 bg-white/50">
            <div className="mb-4 rounded-full bg-gray-50 p-6 text-gray-200">
              <File className="h-12 w-12" />
            </div>
            <p className="text-sm font-medium text-gray-500">Aucun document n'a été trouvé pour ce client</p>
            <p className="mt-1 text-xs text-gray-400 italic">Vérifiez les politiques RLS si des fichiers existent en base.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {documents?.map((doc) => (
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
                        <File className="h-12 w-12" />
                        <span className="mt-2 text-[10px] font-bold uppercase tracking-widest">{doc.file_name?.split('.').pop()}</span>
                      </div>
                    )}

                    {/* Action Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-navy/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex space-x-2">
                        <Button variant="secondary" size="icon" className="h-9 w-9 rounded-full shadow-lg" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-9 w-9 rounded-full bg-red shadow-lg hover:bg-red/90"
                            onClick={() => deleteDocument(doc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-white" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Metadata Area */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold uppercase tracking-wider text-navy opacity-60">{doc.document_type}</p>
                        <p className="mt-0.5 truncate text-sm font-bold text-navy" title={doc.file_name}>{doc.file_name}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-tighter",
                          doc.status === 'Présent' ? "bg-green/10 text-green border-green/20" : "bg-red/10 text-red border-red/20"
                        )}
                      >
                        {doc.status}
                      </Badge>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-3 text-[10px]">
                      <div className="flex items-center text-gray-400">
                        <Clock className="mr-1 h-3 w-3" />
                        {doc.upload_date ? format(new Date(doc.upload_date), 'dd MMM yyyy', { locale: fr }) : 'Date inconnue'}
                      </div>
                      {doc.expiry_date && (
                        <div className={cn(
                          "font-bold",
                          new Date(doc.expiry_date) < new Date() ? "text-red" : "text-amber-500"
                        )}>
                          Exp: {format(new Date(doc.expiry_date), 'dd/MM yyyy', { locale: fr })}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

