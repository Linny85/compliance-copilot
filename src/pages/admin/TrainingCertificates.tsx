import { useState } from 'react';
import { FileText, CheckCircle, XCircle, Trash2, Download, ExternalLink } from 'lucide-react';
import { CertificateDownloadButton } from '@/components/training/CertificateDownloadButton';
import { UploadCertificateDialog } from '@/components/training/UploadCertificateDialog';
import { VerifyByCodeDialog } from '@/components/training/VerifyByCodeDialog';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  useTrainingCertificates,
  useVerifyTrainingCertificate,
  useDeleteTrainingCertificate,
} from '@/hooks/useTrainingCertificates';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function TrainingCertificates() {
  const { t } = useTranslation();
  const { data: certificates = [], isLoading } = useTrainingCertificates();
  const verifyMutation = useVerifyTrainingCertificate();
  const deleteMutation = useDeleteTrainingCertificate();

  const [selectedCert, setSelectedCert] = useState<string | null>(null);
  const [action, setAction] = useState<'verify' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');

  const handleVerify = async () => {
    if (!selectedCert || !action) return;

    await verifyMutation.mutateAsync({
      id: selectedCert,
      input: {
        status: action === 'verify' ? 'verified' : 'rejected',
        notes: action === 'reject' ? notes : undefined,
      },
    });

    setSelectedCert(null);
    setAction(null);
    setNotes('');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Möchten Sie dieses Zertifikat wirklich löschen?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-500">Bestätigt</Badge>;
      case 'pending':
        return <Badge variant="secondary">Ausstehend</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Abgelehnt</Badge>;
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{t('training.title')}</h1>
              <p className="text-muted-foreground">
                {t('training.description')}
              </p>
            </div>

            {/* Hint Bar with Link to Courses */}
            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4">
              <span className="text-sm">
                {t('training.hintBar.text')}
              </span>
              <a
                href="https://www.norrland-innovate.com/compliance-schulungen/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                {t('training.hintBar.cta')}
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <UploadCertificateDialog />
              <VerifyByCodeDialog />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Hochgeladene Zertifikate
                </CardTitle>
                <CardDescription>
                  Überprüfen und verifizieren Sie eingereichte Schulungszertifikate
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p>Lädt...</p>
                ) : certificates.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Keine Zertifikate vorhanden
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Titel</TableHead>
                        <TableHead>Anbieter</TableHead>
                        <TableHead>Abschlussdatum</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Datei</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {certificates.map((cert) => (
                        <TableRow key={cert.id}>
                          <TableCell className="font-medium">{cert.title}</TableCell>
                          <TableCell>{cert.provider}</TableCell>
                          <TableCell>
                            {format(new Date(cert.date_completed), 'dd.MM.yyyy', { locale: de })}
                          </TableCell>
                          <TableCell>{getStatusBadge(cert.status)}</TableCell>
                          <TableCell>
                            <CertificateDownloadButton 
                              filePath={cert.file_path} 
                              title={cert.title}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {cert.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => {
                                      setSelectedCert(cert.id);
                                      setAction('verify');
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Bestätigen
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      setSelectedCert(cert.id);
                                      setAction('reject');
                                    }}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Ablehnen
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(cert.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <Dialog
            open={!!selectedCert && !!action}
            onOpenChange={() => {
              setSelectedCert(null);
              setAction(null);
              setNotes('');
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {action === 'verify' ? 'Zertifikat bestätigen' : 'Zertifikat ablehnen'}
                </DialogTitle>
                <DialogDescription>
                  {action === 'verify'
                    ? 'Bestätigen Sie, dass das Zertifikat gültig ist.'
                    : 'Geben Sie einen Grund für die Ablehnung an.'}
                </DialogDescription>
              </DialogHeader>
              {action === 'reject' && (
                <div>
                  <Label htmlFor="notes">Begründung *</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Grund für die Ablehnung..."
                    rows={4}
                  />
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCert(null);
                    setAction(null);
                    setNotes('');
                  }}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleVerify}
                  disabled={action === 'reject' && !notes.trim()}
                  variant={action === 'verify' ? 'default' : 'destructive'}
                >
                  {action === 'verify' ? 'Bestätigen' : 'Ablehnen'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </SidebarProvider>
  );
}
