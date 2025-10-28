import { useState } from 'react';
import { FileText, CheckCircle, XCircle, Trash2, Download, ExternalLink } from 'lucide-react';
import { CertificateDownloadButton } from '@/components/training/CertificateDownloadButton';
import { UploadCertificateDialog } from '@/components/training/UploadCertificateDialog';
import { VerifyByCodeDialog } from '@/components/training/VerifyByCodeDialog';
import { CourseCard } from '@/components/training/CourseCard';
import AdminLayout from '@/layouts/AdminLayout';
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

const COURSES_AVAILABLE_LANGS = ['de'];

const COURSE_DATA = {
  nis2: {
    url: 'https://myablefy.com/s/norrland-innovate/nis2-compliance-zertifizierung-6c5e3c3b',
  },
  lead: {
    url: 'https://myablefy.com/s/norrland-innovate/zertifizierter-online-kurs-eu-ki-gesetz-compliance-fuer-unternehmen-5b90e795',
  },
  emp: {
    url: 'https://myablefy.com/s/norrland-innovate/eu-ai-act-mitarbeiter-schulung-866722a6',
  },
};

export default function TrainingCertificates() {
  const { t, i18n } = useTranslation(['training', 'common']);
  const { data: certificates = [], isLoading } = useTrainingCertificates();
  const verifyMutation = useVerifyTrainingCertificate();
  const deleteMutation = useDeleteTrainingCertificate();

  const showCourses = COURSES_AVAILABLE_LANGS.includes(i18n.language || 'en');

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
    <AdminLayout>
      <div data-qa="page-training-certificates"
        className="relative w-full"
      >
        {/* HEADER */}
        <header className="text-center space-y-2">
          <h1 className="section-title">{t('title', { ns: 'training' })}</h1>
          <p className="section-subtitle">{t('description', { ns: 'training' })}</p>
        </header>

        {/* Hint Bar with Link to Courses */}
        <div className="mt-6 mx-auto max-w-3xl rounded-xl border bg-card p-4 sm:p-6 text-center">
          <p className="text-sm sm:text-base mb-3">
            {t('hintBar.text', { ns: 'training' })}
          </p>
          <div className="flex justify-center">
            <a
              href="https://www.norrland-innovate.com/compliance-schulungen/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm sm:text-base hover:bg-accent transition-colors"
            >
              {t('hintBar.cta', { ns: 'training' })}
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Course Cards - DE only */}
        <section className="mt-6">
          {showCourses ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 justify-items-center">
              {(['nis2', 'lead', 'emp'] as const).map((kind) => (
                <CourseCard key={kind} kind={kind} />
              ))}
            </div>
          ) : (
            <div className="mx-auto max-w-xl text-center rounded-2xl border bg-card p-6">
              <p className="text-sm text-muted-foreground">
                {t('notice.deOnly', { ns: 'training' })}
              </p>
            </div>
          )}
        </section>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-center gap-3 flex-wrap">
          <UploadCertificateDialog />
          <VerifyByCodeDialog />
        </div>

        {/* Uploaded Certificates Table */}
        <Card className="mt-6 p-4 sm:p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
              <FileText className="h-5 w-5" />
              {t('sections.uploaded.title', { ns: 'training' })}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {t('sections.uploaded.subtitle', { ns: 'training' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>{t('common.loading', { defaultValue: 'Loading...' })}</p>
            ) : certificates.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {t('sections.uploaded.empty', { ns: 'training' })}
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

        {/* Verify/Reject Dialog */}
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
      </div>
    </AdminLayout>
  );
}
