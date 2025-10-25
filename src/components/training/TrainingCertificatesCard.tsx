import { Award, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UploadCertificateDialog } from './UploadCertificateDialog';
import { CertificateDownloadButton } from './CertificateDownloadButton';
import { useUserTrainingCertificates } from '@/hooks/useTrainingCertificates';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const FEATURE_ENABLED = import.meta.env.VITE_FEATURE_TRAINING_CERTS === 'true';

const RECOMMENDED_TRAININGS = [
  {
    id: 'nis2-basics',
    title: 'NIS2 Grundlagen',
    description: 'Einführung in NIS2-Anforderungen',
    tag: 'nis2_basics',
  },
  {
    id: 'ai-act-awareness',
    title: 'EU AI Act Awareness',
    description: 'Überblick über EU AI Act Pflichten',
    tag: 'ai_act_awareness',
  },
  {
    id: 'gdpr-basics',
    title: 'DSGVO Basis',
    description: 'Datenschutz-Grundlagen',
    tag: 'gdpr_basics',
  },
];

interface TrainingCertificatesCardProps {
  userId: string;
}

export function TrainingCertificatesCard({ userId }: TrainingCertificatesCardProps) {
  const { data: certificates = [], isLoading } = useUserTrainingCertificates(userId);

  if (!FEATURE_ENABLED) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Bestätigt
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            In Prüfung
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Abgelehnt
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <CardTitle>Schulungspflichten</CardTitle>
          </div>
          <UploadCertificateDialog />
        </div>
        <CardDescription>
          Empfohlene Schulungen für vollständige Compliance
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Lädt...</p>
        ) : (
          <div className="space-y-4">
            {RECOMMENDED_TRAININGS.map((training) => {
              // Match by training_tag first, fallback to title matching
              const cert = certificates.find((c) =>
                c.training_tag === training.tag ||
                c.title.toLowerCase().includes(training.title.toLowerCase().split(' ')[0])
              );

              return (
                <div
                  key={training.id}
                  className="flex items-start justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{training.title}</p>
                      {cert && getStatusBadge(cert.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {training.description}
                    </p>
                    {cert && (
                      <div className="text-xs text-muted-foreground mt-2 space-y-1">
                        <p>Anbieter: {cert.provider}</p>
                        <p>
                          Abgeschlossen:{' '}
                          {format(new Date(cert.date_completed), 'dd.MM.yyyy', { locale: de })}
                        </p>
                        {cert.status === 'verified' && cert.verified_at && (
                          <p className="text-green-600">
                            Verifiziert am{' '}
                            {format(new Date(cert.verified_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                          </p>
                        )}
                        {cert.status === 'rejected' && cert.notes && (
                          <p className="text-destructive mt-1">Grund: {cert.notes}</p>
                        )}
                        <div className="pt-1">
                          <CertificateDownloadButton 
                            filePath={cert.file_path} 
                            title={cert.title}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {certificates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Noch keine Zertifikate hochgeladen
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
