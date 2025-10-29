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
  const { t, i18n, ready } = useTranslation(['training', 'common']);
  const { data: certificates = [], isLoading } = useTrainingCertificates();
  
  if (!ready) return null;
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
    if (confirm(t('common:confirmDelete', { defaultValue: 'Möchten Sie dieses Zertifikat wirklich löschen?' }))) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-500">{t('common:verified', { defaultValue: 'Bestätigt' })}</Badge>;
      case 'pending':
        return <Badge variant="secondary">{t('common:pending', { defaultValue: 'Ausstehend' })}</Badge>;
      case 'rejected':
        return <Badge variant="destructive">{t('common:rejected', { defaultValue: 'Abgelehnt' })}</Badge>;
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      {process.env.NODE_ENV !== "production" && (
        <div style={{
          position:"fixed",bottom:8,left:8,zIndex:99999,
          background:"#000",color:"#fff",padding:6,borderRadius:8
        }}>certs</div>
      )}
      {/* Header - centered */}
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold">{t('title', { ns: 'training' })}</h1>
        <p className="text-muted-foreground">{t('description', { ns: 'training' })}</p>
      </header>

      {/* Hint Bar with Link to Courses */}
      <div className="mb-6 rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm sm:text-base">
            {t('hintBar.text', { ns: 'training' })}
          </p>
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

      {/* Course Cards - stable grid with min-w-0 on items */}
      {showCourses ? (
        <section className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 min-w-0">
          {(['nis2', 'lead', 'emp'] as const).map((kind) => (
            <div key={kind} className="min-w-0">
              <CourseCard kind={kind} />
            </div>
          ))}
        </section>
      ) : (
        <div className="mb-8 mx-auto max-w-xl rounded-2xl border bg-card p-6">
          <p className="text-sm text-muted-foreground text-center">
            {t('notice.deOnly', { ns: 'training' })}
          </p>
        </div>
      )}

      {/* Action Buttons - centered */}
      <div className="mb-10 flex justify-center gap-3 flex-wrap">
        <UploadCertificateDialog />
        <VerifyByCodeDialog />
      </div>

      {/* Uploaded Certificates Table - no position fixed/absolute */}
      <section>
        <h2 className="text-xl font-semibold mb-2">{t('sections.uploaded.title', { ns: 'training' })}</h2>
        <p className="text-sm text-muted-foreground mb-3">{t('sections.uploaded.subtitle', { ns: 'training' })}</p>
        
        <Card className="p-4 sm:p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <FileText className="h-5 w-5" />
              {t('sections.uploaded.title', { ns: 'training' })}
            </CardTitle>
            <CardDescription className="text-sm">
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
              <div className="table-responsive -mx-4 sm:mx-0">
                  <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common:title', { defaultValue: 'Titel' })}</TableHead>
                      <TableHead>{t('common:provider', { defaultValue: 'Anbieter' })}</TableHead>
                      <TableHead>{t('common:completionDate', { defaultValue: 'Abschlussdatum' })}</TableHead>
                      <TableHead>{t('common:status', { defaultValue: 'Status' })}</TableHead>
                      <TableHead>{t('common:file', { defaultValue: 'Datei' })}</TableHead>
                      <TableHead className="text-right">{t('common:actions', { defaultValue: 'Aktionen' })}</TableHead>
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
                                  {t('common:verify', { defaultValue: 'Bestätigen' })}
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
                                  {t('common:reject', { defaultValue: 'Ablehnen' })}
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
              </div>
            )}
          </CardContent>
        </Card>
      </section>

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
              {action === 'verify' 
                ? t('common:verifyCertificate', { defaultValue: 'Zertifikat bestätigen' })
                : t('common:rejectCertificate', { defaultValue: 'Zertifikat ablehnen' })
              }
            </DialogTitle>
            <DialogDescription>
              {action === 'verify'
                ? t('common:verifyCertificateDesc', { defaultValue: 'Bestätigen Sie, dass das Zertifikat gültig ist.' })
                : t('common:rejectCertificateDesc', { defaultValue: 'Geben Sie einen Grund für die Ablehnung an.' })
              }
            </DialogDescription>
          </DialogHeader>
          {action === 'reject' && (
            <div>
              <Label htmlFor="notes">{t('common:reasonLabel', { defaultValue: 'Begründung *' })}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('common:reasonPlaceholder', { defaultValue: 'Grund für die Ablehnung...' })}
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
              {t('common:cancel', { defaultValue: 'Abbrechen' })}
            </Button>
            <Button
              onClick={handleVerify}
              disabled={action === 'reject' && !notes.trim()}
              variant={action === 'verify' ? 'default' : 'destructive'}
            >
              {action === 'verify' 
                ? t('common:verify', { defaultValue: 'Bestätigen' })
                : t('common:reject', { defaultValue: 'Ablehnen' })
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
