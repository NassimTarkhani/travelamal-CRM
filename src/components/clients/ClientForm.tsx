import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clientSchema, ClientFormData } from '@/lib/validations/clientSchema';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { SERVICE_CONFIG } from '@/lib/utils/serviceColors';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { cn } from '@/lib/utils';
import { Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { ensureJsPDF } from '@/lib/utils/pdfLoader';

interface ClientFormProps {
  initialData?: any;
  clientId?: string;
}

// Maps form-side labels to the CHECK constraint values in the DB documents table.
// DB constraint: 'Passeport'|'CIN'|'Photo'|'Acte de naissance'|'Fiche familiale'|
//                'Justificatif bancaire'|'Assurance'|'Réservation vol'|'Autre'
const DOC_TYPE_MAP: Record<string, string> = {
  'CIN': 'CIN',
  'Passeport': 'Passeport',
  'Photo Client': 'Photo',
  'Diplôme': 'Autre',
  'B3': 'Autre',
  'Permis': 'Autre',
  'Contrat Municipalité': 'Autre',
  'Reçu Paiement Billet': 'Justificatif bancaire',
  'Reçu Manuscrit': 'Autre',
  'Justificatif Paiement': 'Justificatif bancaire',
};

const uploadDocumentsForClient = async (
  clientId: string,
  cinFiles: File[],
  passportFiles: File[],
  diplomeFiles: File[],
  b3Files: File[],
  permisFiles: File[],
  clientPhotoFiles: File[],
  contratMunicipaliteFiles: File[],
  ticketReceiptFiles: File[],
  handwrittenReceiptFiles: File[],
  paymentProofFiles: File[],
  uploadedBy: string | undefined
): Promise<string | null> => {
  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const ext = file.name.split('.').pop() || 'bin';
    // upsert:true prevents "already exists" errors on retry
    const path = `${clientId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from('client-documents')
      .upload(path, file, { upsert: true });

    if (error) {
      console.error(`Storage upload failed [${folder}/${file.name}]:`, error.message);
      toast.error(`Upload échoué (${file.name}): ${error.message}`);
      return null;
    }
    const { data: { publicUrl } } = supabase.storage.from('client-documents').getPublicUrl(path);
    return publicUrl;
  };

  const addRows = async (files: File[], folder: string, labelType: string, rows: any[]) => {
    const dbType = DOC_TYPE_MAP[labelType] ?? 'Autre';
    for (const file of files) {
      const url = await uploadFile(file, folder);
      if (url) rows.push({
        client_id: clientId,
        document_type: dbType,
        file_url: url,
        // Prefix original type into filename so it shows clearly in DocumentsTab
        file_name: `[${labelType}] ${file.name}`,
        uploaded_by: uploadedBy,
        status: 'Présent',
      });
    }
  };

  const rows: any[] = [];
  await addRows(cinFiles, 'cin', 'CIN', rows);
  await addRows(passportFiles, 'passeport', 'Passeport', rows);
  await addRows(diplomeFiles, 'diplome', 'Diplôme', rows);
  await addRows(b3Files, 'b3', 'B3', rows);
  await addRows(permisFiles, 'permis', 'Permis', rows);
  await addRows(clientPhotoFiles, 'photo', 'Photo Client', rows);
  await addRows(contratMunicipaliteFiles, 'contrat-municipalite', 'Contrat Municipalité', rows);
  await addRows(ticketReceiptFiles, 'recu-ticket', 'Reçu Paiement Billet', rows);
  await addRows(handwrittenReceiptFiles, 'recu-manuscrit', 'Reçu Manuscrit', rows);
  await addRows(paymentProofFiles, 'preuve-paiement', 'Justificatif Paiement', rows);

  if (rows.length === 0) return null; // all storage uploads failed; errors already toasted above

  const { error } = await supabase.from('documents').insert(rows);
  if (error) {
    console.error('Document DB insert error:', error.message);
    return error.message;
  }
  return null;
};

export const ClientForm: React.FC<ClientFormProps> = ({ initialData, clientId }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [cinFiles, setCinFiles] = useState<File[]>([]);
  const [passportFiles, setPassportFiles] = useState<File[]>([]);
  const [clientPhotoFiles, setClientPhotoFiles] = useState<File[]>([]);
  const [diplomeFiles, setDiplomeFiles] = useState<File[]>([]);
  const [b3Files, setB3Files] = useState<File[]>([]);
  const [permisFiles, setPermisFiles] = useState<File[]>([]);
  const [contratMunicipaliteFiles, setContratMunicipaliteFiles] = useState<File[]>([]);
  const [ticketReceiptFiles, setTicketReceiptFiles] = useState<File[]>([]);
  const [handwrittenReceiptFiles, setHandwrittenReceiptFiles] = useState<File[]>([]);
  const [paymentProofFiles, setPaymentProofFiles] = useState<File[]>([]);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: initialData || {
      service: 'Visa Schengen',
      status: 'Nouveau',
      total_amount: 0,
      amount_paid: 0,
      marital_status: 'Célibataire',
      payment_method: 'Espèces',
    },
  });

  // Handle asynchronous initialData updates
  useEffect(() => {
    if (initialData) {
      const formattedData = { ...initialData };

      // Format dates for html inputs (date and datetime-local)
      if (formattedData.birth_date) {
        formattedData.birth_date = formattedData.birth_date.split('T')[0];
      }
      if (formattedData.passport_expiry) {
        formattedData.passport_expiry = formattedData.passport_expiry.split('T')[0];
      }
      if (formattedData.b3_expiry) {
        formattedData.b3_expiry = formattedData.b3_expiry.split('T')[0];
      }
      if (formattedData.embassy_registration_date) {
        formattedData.embassy_registration_date = formattedData.embassy_registration_date.split('T')[0];
      }
      if (formattedData.travel_date) {
        formattedData.travel_date = formattedData.travel_date.split('T')[0];
      }
      if (formattedData.appointment_date) {
        try {
          // format is YYYY-MM-DDTHH:mm
          formattedData.appointment_date = new Date(formattedData.appointment_date)
            .toISOString()
            .slice(0, 16);
        } catch (e) {
          formattedData.appointment_date = '';
        }
      }

      // Normalize enum fields — DB may store lowercase/variant casing
      const SERVICE_VALUES = [
        'Visa Schengen', 'Visa USA', 'Visa UK', 'Résidence',
        'Visa Dubai', 'Pack Dubai', 'Visa Qatar', 'Pack Qatar',
        'Visa Roumanie', 'Visa Oman', 'Visa KSA', 'Visa Koweit',
        'Visa Egypte', 'Visa Chine', 'Visa Canada', 'Visa Grece',
        'Visa Italie Touristique', 'Visa Italie 1 an', 'Autres',
      ];
      const STATUS_VALUES = ['Nouveau', 'En cours', 'Complété', 'Refusé', 'Annulé'];
      const MARITAL_VALUES = ['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve'];
      const PAYMENT_METHOD_VALUES = ['Espèces', 'Virement', 'Chèque', 'Carte'];

      const normalize = (value: string, options: string[]) =>
        options.find(o => o.toLowerCase() === value?.toLowerCase()) ?? value;

      if (formattedData.service)
        formattedData.service = normalize(formattedData.service, SERVICE_VALUES);
      if (formattedData.status)
        formattedData.status = normalize(formattedData.status, STATUS_VALUES);
      if (formattedData.marital_status)
        formattedData.marital_status = normalize(formattedData.marital_status, MARITAL_VALUES);
      if (formattedData.payment_method)
        formattedData.payment_method = normalize(formattedData.payment_method, PAYMENT_METHOD_VALUES);

      reset(formattedData);
    }
  }, [initialData, reset]);

  const { data: employees } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, name, email');
      return data;
    },
  });

  const totalAmount = watch('total_amount') || 0;
  const amountPaid = watch('amount_paid') || 0;
  const amountRemaining = totalAmount - amountPaid;
  const service = watch('service');

  const handlePrintReceipt = async () => {
    const data = watch();
    const color = SERVICE_CONFIG[data.service]?.color || '#D4AF37';
    const amountPaidVal = Number(data.amount_paid || 0);
    const amountTotalVal = Number(data.total_amount || 0);

    const ticketHtml = `
      <html>
        <head>
          <title>Reçu de Paiement - TRAVELAMAL</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1a1a1a; }
            .header { text-align: center; border-bottom: 2px solid ${color}; padding-bottom: 20px; }
            .content { margin-top: 30px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .label { font-weight: bold; color: #555; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 10px; }
            .gold { color: ${color}; }
            .stamp { margin-top: 40px; display: flex; justify-content: space-around; }
            .signature { width: 150px; border-top: 1px solid #000; text-align: center; padding-top: 5px; font-size: 10px; }
          </style>
        </head>
        <body style="margin:0; padding:0; background:white;">
          <div class="header">
            <h1 style="margin:0; font-family: serif; color: ${color};">TRAVELAMAL</h1>
            <p style="margin:5px 0; letter-spacing: 2px; font-size: 12px; font-weight: bold;">GESTION VISAS & VOYAGES</p>
            <p style="margin:2px 0; font-size: 10px; color: #666;">Matricule Fiscale: <span style="font-weight:bold;">Y / 174500</span></p>
            <p style="margin:2px 0; font-size: 10px; color: #666;">Adresse: Immeuble Abd el Hakim Drissi, Rue Hedi Chaker, Jendouba</p>
          </div>
          <div class="content">
            <h2 style="text-align:center;">REÇU DE PAIEMENT</h2>
            <div class="row">
              <span class="label">Client:</span>
              <span>${data.full_name || '-'}</span>
            </div>
            <div class="row">
              <span class="label">CIN:</span>
              <span>${data.id_card_number || '-'}</span>
            </div>
            <div class="row">
              <span class="label">Date Ouverture Dossier:</span>
              <span>${data.folder_opening_date ? new Date(data.folder_opening_date).toLocaleDateString('fr-FR') : '-'}</span>
            </div>
            <div class="row">
              <span class="label">Service:</span>
              <span>${data.service || '-'}</span>
            </div>
            <div class="row">
              <span class="label">Date:</span>
              <span>${new Date().toLocaleDateString('fr-FR')}</span>
            </div>
            <div class="row" style="margin-top: 30px; font-size: 1.2em;">
              <span class="label">Montant Versé:</span>
              <span class="gold" style="font-weight:bold;">${amountPaidVal.toFixed(3)} TND</span>
            </div>
            <div class="row">
              <span class="label">Méthode:</span>
              <span>${data.payment_method || 'Espèces'}</span>
            </div>
            <div class="row">
              <span class="label">Reste à payer:</span>
              <span>${(amountTotalVal - amountPaidVal).toFixed(3)} TND</span>
            </div>
          </div>
          <div class="stamp">
            <div class="signature">Signature Client</div>
            <div class="signature">Cachet Agence</div>
          </div>
          <div class="footer">
            <p>TravelAmal CRM - Document officiel - Merci pour votre confiance</p>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    // 1. DIGITAL ARCHIVE (100% Reliable Native Drawing)
    if (clientId) {
      try {
        const jsPDF = await ensureJsPDF();
        if (jsPDF) {
          const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

          // Helper to convert #HEX to [R, G, B]
          const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? [
              parseInt(result[1], 16),
              parseInt(result[2], 16),
              parseInt(result[3], 16)
            ] : [212, 175, 55]; // fallback Gold
          };
          const cRgb = hexToRgb(color);

          // Header
          doc.setFontSize(26);
          doc.setTextColor(cRgb[0], cRgb[1], cRgb[2]);
          doc.setFont('helvetica', 'bold');
          doc.text('TRAVELAMAL', 105, 30, { align: 'center' });

          doc.setFontSize(10);
          doc.setTextColor(30, 30, 30);
          // jsPDF doesn't natively support letter-spacing parameter easily in standard API, but we mimic it via font sizing
          doc.text('GESTION VISAS & VOYAGES', 105, 38, { align: 'center' });

          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.setFont('helvetica', 'normal');
          doc.text('Matricule Fiscale: Y / 174500', 105, 43, { align: 'center' });
          doc.text('Adresse: Immeuble Abd el Hakim Drissi, Rue Hedi Chaker, Jendouba', 105, 47, { align: 'center' });

          // Header Separator Line
          doc.setDrawColor(cRgb[0], cRgb[1], cRgb[2]);
          doc.setLineWidth(0.6);
          doc.line(30, 52, 180, 52);

          // Title
          doc.setFontSize(16);
          doc.setTextColor(30, 30, 30);
          doc.setFont('helvetica', 'bold');
          doc.text('REÇU DE PAIEMENT', 105, 65, { align: 'center' });

          // Data Rows (Identical to HTML layout)
          let y = 80;
          const drawRow = (label: string, value: string, isBig = false) => {
            // Label
            doc.setFontSize(isBig ? 14 : 11);
            doc.setTextColor(80, 80, 80);
            doc.setFont('helvetica', 'bold');
            doc.text(label, 30, y);

            // Value
            if (isBig) {
              doc.setTextColor(cRgb[0], cRgb[1], cRgb[2]); // Colored value (Montant Versé)
            } else {
              doc.setTextColor(30, 30, 30);
              doc.setFont('helvetica', 'normal');
            }
            doc.text(value, 180, y, { align: 'right' });

            // Subtle Row border
            doc.setDrawColor(240, 240, 240);
            doc.setLineWidth(0.2);
            doc.line(30, y + 4, 180, y + 4);
            y += isBig ? 15 : 12; // Spacing
          };

          drawRow('Client:', data.full_name || '-');
          drawRow('CIN:', data.id_card_number || '-');
          drawRow('Date Ouverture Dossier:', data.folder_opening_date ? new Date(data.folder_opening_date).toLocaleDateString('fr-FR') : '-');
          drawRow('Service:', data.service || '-');
          drawRow('Date:', new Date().toLocaleDateString('fr-FR'));

          // Highlighted Montant Versé
          y += 5;
          drawRow('Montant Versé:', `${amountPaidVal.toFixed(3)} TND`, true);

          doc.setFont('helvetica', 'normal');
          drawRow('Méthode:', data.payment_method || 'Espèces');
          drawRow('Reste à payer:', `${(amountTotalVal - amountPaidVal).toFixed(3)} TND`);

          // Signatures
          y += 15;
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.2);

          doc.line(40, y, 90, y);
          doc.setFontSize(8);
          doc.setTextColor(30, 30, 30);
          doc.setFont('helvetica', 'normal');
          doc.text('Signature Client', 65, y + 5, { align: 'center' });

          doc.line(120, y, 170, y);
          doc.text('Cachet Agence', 145, y + 5, { align: 'center' });

          // Footer
          doc.setTextColor(150, 150, 150);
          doc.setDrawColor(240, 240, 240);
          doc.line(30, 280, 180, 280);
          doc.text('TravelAmal CRM - Document officiel - Merci pour votre confiance', 105, 285, { align: 'center' });

          const pdfBlob = doc.output('blob');

          if (pdfBlob && pdfBlob.size > 500) {
            const path = `generated-receipts/${clientId}/${Date.now()}.pdf`;
            const { error: uploadError } = await supabase.storage.from('client-documents').upload(path, pdfBlob, { contentType: 'application/pdf' });
            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage.from('client-documents').getPublicUrl(path);
              await supabase.from('documents').insert([{
                client_id: clientId,
                document_type: 'Autre',
                file_name: `Reçu Système - ${new Date().toLocaleDateString('fr-FR')}`,
                file_url: publicUrl,
                uploaded_by: user?.id,
                status: 'Présent'
              }]);
              queryClient.invalidateQueries({ queryKey: ['client-documents', clientId] });
              toast.success("Copie archivée dans les documents de la DB");
            }
          }
        }
      } catch (e) {
        console.error("Erreur jsPDF bd:", e);
      }
    }

    // 2. OPEN PHYSICAL PRINT PREVIEW
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(ticketHtml);
      printWindow.document.close();
    } else {
      toast.error("Veuillez autoriser les pop-ups pour imprimer");
    }
  };

  const onSubmit: SubmitHandler<ClientFormData> = async (data) => {
    try {
      const color_tag = SERVICE_CONFIG[data.service]?.color || '#6B7280';

      const { amount_remaining, payment_status, sequential_number, ...sanitizedData } = data as any;
      (Object.keys(sanitizedData) as Array<string>).forEach(key => {
        if (sanitizedData[key] === '') (sanitizedData as any)[key] = null;
      });

      // Reset alert flags if new files are uploaded
      if (passportFiles.length > 0) sanitizedData.passport_alert_done = false;
      if (b3Files.length > 0) sanitizedData.b3_alert_done = false;
      if (ticketReceiptFiles.length > 0) sanitizedData.travel_alert_done = false;

      const payload = {
        ...sanitizedData,
        color_tag,
      };

      if (!clientId) {
        (payload as any).created_by = user?.id;
      }

      console.log('Tentative d\'enregistrement:', payload.full_name);

      // Validation: Contrat Municipalité is obligatory on creation
      if (!clientId && contratMunicipaliteFiles.length === 0) {
        toast.error("Le contrat de municipalité est obligatoire.");
        return;
      }

      let resolvedClientId: string | undefined;

      // 1. PRIMARY SAVE
      if (clientId) {
        const { error: updateError } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', clientId);
        if (updateError) {
          console.error('Update client error:', updateError);
          toast.error(`Erreur lors de la mise à jour: ${updateError.message}`);
          return;
        }
        resolvedClientId = clientId;
      } else {
        const { data: insertedData, error: insertError } = await supabase
          .from('clients')
          .insert(payload)
          .select('id')
          .single();
        if (insertError) {
          console.error('Insert client error:', insertError);
          toast.error(`Erreur lors de la création: ${insertError.message}`);
          return;
        }
        if (!insertedData) {
          toast.error('Aucune donnée retournée après insertion');
          return;
        }
        resolvedClientId = insertedData.id;
      }

      // 2. UPLOADS (blocking — must complete before redirect so errors surface)
      const hasUploads = cinFiles.length > 0 || passportFiles.length > 0 || diplomeFiles.length > 0 || b3Files.length > 0 || permisFiles.length > 0 || clientPhotoFiles.length > 0 || contratMunicipaliteFiles.length > 0 || ticketReceiptFiles.length > 0 || handwrittenReceiptFiles.length > 0 || paymentProofFiles.length > 0;
      if (hasUploads && resolvedClientId) {
        const uploadError = await uploadDocumentsForClient(
          resolvedClientId, cinFiles, passportFiles, diplomeFiles, b3Files, permisFiles,
          clientPhotoFiles, contratMunicipaliteFiles, ticketReceiptFiles,
          handwrittenReceiptFiles, paymentProofFiles, user?.id
        );
        if (uploadError) {
          toast.error(`Certains documents n'ont pas pu être enregistrés: ${uploadError}`);
        } else {
          queryClient.invalidateQueries({ queryKey: ['documents', resolvedClientId] });
        }
      }

      // 3. LOG ACTIVITY (Non-blocking for redirect)
      if (resolvedClientId) {
        supabase.from('activities').insert([{
          client_id: resolvedClientId,
          action_type: clientId ? 'Modification' : 'Création',
          description: `${clientId ? 'Dossier mis à jour' : 'Nouveau dossier créé'} par ${user?.email || 'admin'}`,
          performed_by: user?.id,
        }]).then(({ error }) => {
          if (error) console.error('Activity log error (non-fatal):', error);
        });
      }

      // 4. INVALIDATE & REDIRECT
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['clients'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['all-activities'] }),
        ...(clientId ? [
          queryClient.invalidateQueries({ queryKey: ['client', clientId] }),
          queryClient.invalidateQueries({ queryKey: ['client-edit', clientId] }),
          queryClient.invalidateQueries({ queryKey: ['client-payments', clientId] }),
          queryClient.invalidateQueries({ queryKey: ['documents', clientId] }),
        ] : []),
      ]);

      toast.success(clientId ? 'Client mis à jour' : 'Client créé avec succès');

      // Force a small delay to ensure toast is visible and cache is ready
      setTimeout(() => {
        navigate(clientId ? `/clients/${clientId}` : '/clients');
      }, 100);

    } catch (error: any) {
      console.error('Erreur globale onSubmit:', error);
      toast.error(error?.message || 'Une erreur est survenue lors de l\'enregistrement.');
    }
  };

  const onValidationError = (errors: Record<string, any>) => {
    const firstError = Object.values(errors)[0];
    const message = firstError?.message || 'Veuillez corriger les erreurs du formulaire.';
    toast.error(message);
    console.error('Validation errors:', errors);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onValidationError)} className="space-y-8">
      {/* Section 1: Personnel */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-1 bg-blue rounded-full"></div>
          <h3 className="text-lg font-bold text-navy uppercase tracking-wider">1. Informations Personnelles</h3>
        </div>
        <ImageUpload
          label="Photo du client"
          files={clientPhotoFiles}
          onChange={setClientPhotoFiles}
          multiple={false}
          maxFiles={1}
          hint="Photo de profil du client — JPG, PNG, WEBP"
          accept="image/*"
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Nom complet *</Label>
            <Input {...register('full_name')} placeholder="Prénom Nom" />
            {errors.full_name && <p className="text-xs text-red">{errors.full_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Profession</Label>
            <Input {...register('profession')} placeholder="Ex: Ingénieur" />
          </div>
          <div className="space-y-2">
            <Label>État civil</Label>
            <Select
              value={watch('marital_status')}
              onValueChange={(v) => setValue('marital_status', v as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Célibataire">Célibataire</SelectItem>
                <SelectItem value="Marié(e)">Marié(e)</SelectItem>
                <SelectItem value="Divorcé(e)">Divorcé(e)</SelectItem>
                <SelectItem value="Veuf/Veuve">Veuf/Veuve</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Numéro CIN</Label>
            <Input {...register('id_card_number')} placeholder="00000000" />
          </div>
          <div className="space-y-2">
            <Label>Date de naissance</Label>
            <Input type="date" {...register('birth_date')} />
          </div>
          <div className="space-y-2">
            <Label>Nationalité</Label>
            <Input {...register('nationality')} placeholder="Tunisienne" />
          </div>
          <div className="space-y-2">
            <Label>Téléphone Principal *</Label>
            <Input {...register('phone_primary')} placeholder="+216 00 000 000" />
            {errors.phone_primary && <p className="text-xs text-red">{errors.phone_primary.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Téléphone Secondaire</Label>
            <Input {...register('phone_secondary')} placeholder="+216 00 000 000" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" {...register('email')} placeholder="client@email.com" />
            {errors.email && <p className="text-xs text-red">{errors.email.message}</p>}
          </div>
        </div>
        {/* CIN Image Upload */}
        <ImageUpload
          label="Photos CIN (recto / verso)"
          files={cinFiles}
          onChange={setCinFiles}
          multiple
          maxFiles={2}
          hint="Formats acceptés : JPG, PNG, WEBP — max 2 images (recto + verso)"
          accept="image/*"
        />
        {/* Diplôme, B3, Permis Uploads */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <ImageUpload
            label="Diplôme"
            files={diplomeFiles}
            onChange={setDiplomeFiles}
            multiple
            maxFiles={5}
            hint="JPG, PNG, WEBP, PDF"
            accept="image/*,application/pdf"
          />
          <div className="space-y-2">
            <ImageUpload
              label="B3"
              files={b3Files}
              onChange={setB3Files}
              multiple
              maxFiles={5}
              hint="JPG, PNG, WEBP, PDF"
              accept="image/*,application/pdf"
            />
            <div className="space-y-1">
              <Label className="text-xs">Date d'expiration B3</Label>
              <Input type="date" {...register('b3_expiry')} className="h-8" />
            </div>
          </div>
          <ImageUpload
            label="Permis"
            files={permisFiles}
            onChange={setPermisFiles}
            multiple
            maxFiles={5}
            hint="JPG, PNG, WEBP, PDF"
            accept="image/*,application/pdf"
          />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Rue / Adresse</Label>
            <Input {...register('address_street')} placeholder="Rue..." />
          </div>
          <div className="space-y-2">
            <Label>Ville</Label>
            <Input {...register('address_city')} placeholder="Ville" />
          </div>
          <div className="space-y-2">
            <Label>Gouvernorat</Label>
            <Input {...register('address_governorate')} placeholder="Gouvernorat" />
          </div>
        </div>
      </div>

      <Separator className="bg-gray-50" />

      {/* Section 2: Passeport */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-1 bg-gold rounded-full"></div>
          <h3 className="text-lg font-bold text-navy uppercase tracking-wider">2. Passeport</h3>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Numéro de Passeport</Label>
            <Input {...register('passport_number')} placeholder="A0000000" />
          </div>
          <div className="space-y-2">
            <Label>Date d'expiration</Label>
            <Input type="date" {...register('passport_expiry')} />
          </div>
        </div>
        {/* Passport Image Upload */}
        <ImageUpload
          label="Photos du Passeport"
          files={passportFiles}
          onChange={setPassportFiles}
          multiple
          maxFiles={6}
          hint="Pages principale + visas — plusieurs images autorisées"
          accept="image/*"
        />
      </div>

      <Separator className="bg-gray-50" />

      {/* Section 3: Service */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-1 bg-blue rounded-full"></div>
          <h3 className="text-lg font-bold text-navy uppercase tracking-wider">3. Service & Dates</h3>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Service *</Label>
            <Select
              value={watch('service')}
              onValueChange={(v) => setValue('service', v as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Visa Schengen">Visa Schengen</SelectItem>
                <SelectItem value="Visa USA">Visa USA</SelectItem>
                <SelectItem value="Visa UK">Visa UK</SelectItem>
                <SelectItem value="Résidence">Résidence</SelectItem>
                <SelectItem value="Visa Dubai">Visa Dubai</SelectItem>
                <SelectItem value="Pack Dubai">Pack Dubai</SelectItem>
                <SelectItem value="Visa Qatar">Visa Qatar</SelectItem>
                <SelectItem value="Pack Qatar">Pack Qatar</SelectItem>
                <SelectItem value="Visa Roumanie">Visa Roumanie</SelectItem>
                <SelectItem value="Visa Oman">Visa Oman</SelectItem>
                <SelectItem value="Visa KSA">Visa KSA</SelectItem>
                <SelectItem value="Visa Koweit">Visa Koweit</SelectItem>
                <SelectItem value="Visa Egypte">Visa Egypte</SelectItem>
                <SelectItem value="Visa Chine">Visa Chine</SelectItem>
                <SelectItem value="Visa Canada">Visa Canada</SelectItem>
                <SelectItem value="Visa Grece">Visa Grece</SelectItem>
                <SelectItem value="Visa Italie Touristique">Visa Italie Touristique</SelectItem>
                <SelectItem value="Visa Italie 1 an">Visa Italie 1 an</SelectItem>
                <SelectItem value="Autres">Autres</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Statut *</Label>
            <Select
              value={watch('status')}
              onValueChange={(v) => setValue('status', v as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nouveau">Nouveau</SelectItem>
                <SelectItem value="En cours">En cours</SelectItem>
                <SelectItem value="Complété">Complété</SelectItem>
                <SelectItem value="Refusé">Refusé</SelectItem>
                <SelectItem value="Annulé">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Employé Responsable</Label>
            <Select
              value={watch('responsible_employee')}
              onValueChange={(v) => setValue('responsible_employee', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir...">
                  {employees?.find(emp => emp.id === watch('responsible_employee'))?.name ||
                    employees?.find(emp => emp.id === watch('responsible_employee'))?.email}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {employees?.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.name || emp.email || emp.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date de RDV</Label>
            <Input type="datetime-local" {...register('appointment_date')} />
          </div>
          <div className="space-y-2">
            <Label>Date de Voyage</Label>
            <Input type="date" {...register('travel_date')} />
          </div>
          <div className="space-y-2">
            <Label>Inscription Ambassade</Label>
            <Input type="date" {...register('embassy_registration_date')} />
          </div>
        </div>
      </div>

      <Separator className="bg-gray-50" />

      {/* Section 4: Paiement */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-1 bg-green rounded-full"></div>
            <h3 className="text-lg font-bold text-navy uppercase tracking-wider">4. Paiement</h3>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-gold/30 text-gold hover:bg-gold/5 h-8 text-xs font-bold"
            onClick={handlePrintReceipt}
            disabled={(amountPaid || 0) <= 0}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Générer Reçu
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Méthode de Paiement</Label>
            <Select
              value={watch('payment_method')}
              onValueChange={(v) => setValue('payment_method', v as any)}
            >
              <SelectTrigger>
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
          <div className="space-y-2">
            <Label>Montant Total (TND)</Label>
            <Input type="number" step="0.001" {...register('total_amount')} />
            {errors.total_amount && <p className="text-xs text-red">{errors.total_amount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Montant Payé (TND)</Label>
            <Input type="number" step="0.001" {...register('amount_paid')} />
            {errors.amount_paid && <p className="text-xs text-red">{errors.amount_paid.message}</p>}
          </div>
          <div className="flex flex-col justify-end pb-2">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Reste à payer</p>
              <p className={cn("text-lg font-bold", amountRemaining > 0 ? "text-red" : "text-green")}>
                {formatCurrency(amountRemaining)}
              </p>
            </div>
          </div>
        </div>
        {/* Payment uploads: handwritten receipt and payment proof */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ImageUpload
            label="Reçu manuscrit"
            files={handwrittenReceiptFiles}
            onChange={setHandwrittenReceiptFiles}
            multiple={false}
            maxFiles={1}
            hint="Uploader le reçu écrit à la main"
            accept="image/*,application/pdf"
          />
          <ImageUpload
            label="Preuve de paiement"
            files={paymentProofFiles}
            onChange={setPaymentProofFiles}
            multiple={false}
            maxFiles={1}
            hint="Photo ou PDF confirmant le paiement (obligatoire si paiement ajouté)"
            accept="image/*,application/pdf"
          />
        </div>
      </div>

      <Separator className="bg-gray-50" />

      {/* Section 5: Notes */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-1 bg-gray-400 rounded-full"></div>
          <h3 className="text-lg font-bold text-navy uppercase tracking-wider">5. Notes & Observations</h3>
        </div>
        <Textarea
          {...register('notes')}
          placeholder="Détails supplémentaires, exigences spécifiques..."
          className="min-h-[120px] rounded-2xl"
        />
      </div>

      {/* Contrat Municipalité Upload */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-1 bg-navy rounded-full"></div>
          <h3 className="text-lg font-bold text-navy uppercase tracking-wider">Contrat Municipalité *</h3>
        </div>
        <ImageUpload
          label="Contrat Municipalité"
          files={contratMunicipaliteFiles}
          onChange={setContratMunicipaliteFiles}
          multiple
          maxFiles={5}
          hint="Formats acceptés : JPG, PNG, WEBP, PDF"
          accept="image/*,application/pdf"
        />
      </div>

      {/* Ticket Receipt Upload */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-1 bg-green-500 rounded-full"></div>
          <h3 className="text-lg font-bold text-navy uppercase tracking-wider">Reçu Paiement Billet</h3>
        </div>
        <ImageUpload
          label="Reçu Paiement Billet"
          files={ticketReceiptFiles}
          onChange={setTicketReceiptFiles}
          multiple
          maxFiles={5}
          hint="Formats acceptés : JPG, PNG, WEBP, PDF"
          accept="image/*,application/pdf"
        />
      </div>

      <div className="flex justify-end space-x-4 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(-1)}
          className="rounded-xl px-8"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          className="bg-blue hover:bg-blue/90 rounded-xl px-12"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Enregistrement...' : clientId ? 'Mettre à jour' : 'Créer le dossier'}
        </Button>
      </div>
    </form>
  );
};
