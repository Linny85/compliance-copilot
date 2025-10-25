import { useState } from 'react';
import { FileText, CheckCircle, XCircle, Trash2, ExternalLink } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const FEATURE_ENABLED = import.meta.env.VITE_FEATURE_TRAINING_CERTS === 'true';

export default function TrainingCertificates() {
  const { data: certificates = [], isLoading } = useTrainingCertificates();
  const verifyMutation = useVerifyTrainingCertificate();
  const deleteMutation = useDeleteTrainingCertificate();

  const [selectedCert, setSelectedCert] = useState<string | null>(null);
  const [action, setAction] = useState<'verify' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');

  if (!FEATURE_ENABLED) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1 p-6">
            <Card>
              <CardHeader>
                <CardTitle>Feature nicht aktiviert</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Das Training Certificates Modul ist aktuell deaktiviert.</p>
              </CardContent>
            </Card>
          </main>
        </div>
      </SidebarProvider>
    );
  }

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
              <h1 className="text-3xl font-bold mb-2">Schulungszertifikate</h1>
              <p className="text-muted-foreground">
                Verwaltung und Verifizierung hochgeladener Schulungsnachweise
              </p>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(cert.file_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
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
