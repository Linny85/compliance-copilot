import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/layouts/AdminLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

type Approval = {
  id: string;
  resource_type: string;
  resource_id: string;
  action: string;
  requested_by: string;
  requester_name: string | null;
  requester_email: string | null;
  reason: string | null;
  status: string;
  created_at: string;
  expires_at: string | null;
};

export default function Approvals() {
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [comment, setComment] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        navigate('/onboarding');
        return;
      }

      setCompanyId(profile.company_id);
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('v_approvals_pending' as any)
        .select('*')
        .eq('tenant_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApprovals((data || []) as unknown as Approval[]);
    } catch (error) {
      console.error('[Approvals] Load error:', error);
      toast({
        title: 'Fehler beim Laden',
        description: 'Freigaben konnten nicht geladen werden.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedApproval) return;

    try {
      const { error } = await supabase.functions.invoke('approve-action', {
        body: {
          approval_id: selectedApproval.id,
          action: actionType,
          comment
        }
      });

      if (error) throw error;

      toast({
        title: actionType === 'approve' ? 'Freigegeben' : 'Abgelehnt',
        description: `Anfrage wurde ${actionType === 'approve' ? 'freigegeben' : 'abgelehnt'}.`
      });

      setSelectedApproval(null);
      setComment('');
      loadData();
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'expired':
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-muted rounded mb-4" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">✅ Freigaben</h1>
        <p className="text-muted-foreground">
          Verwaltung ausstehender Genehmigungen
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Ausstehend</div>
          <div className="text-2xl font-bold text-yellow-600">
            {approvals.filter(a => a.status === 'pending').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Freigegeben (Heute)</div>
          <div className="text-2xl font-bold text-green-600">
            {approvals.filter(a => a.status === 'approved').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Abgelehnt (Heute)</div>
          <div className="text-2xl font-bold text-red-600">
            {approvals.filter(a => a.status === 'rejected').length}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Ausstehende Freigaben</h2>
        {approvals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine ausstehenden Freigaben</p>
        ) : (
          <div className="space-y-3">
            {approvals.map((approval) => (
              <div key={approval.id} className="p-4 border rounded bg-muted/30">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(approval.status)}
                    <div>
                      <span className="text-sm font-medium">
                        {approval.resource_type} • {approval.action}
                      </span>
                      <Badge variant="outline" className="ml-2">{approval.status}</Badge>
                    </div>
                  </div>
                  {approval.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          setSelectedApproval(approval);
                          setActionType('approve');
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Freigeben
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedApproval(approval);
                          setActionType('reject');
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Ablehnen
                      </Button>
                    </div>
                  )}
                </div>
                {approval.reason && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Begründung: {approval.reason}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Von: {approval.requester_name || approval.requester_email}</span>
                  <span>Erstellt: {new Date(approval.created_at).toLocaleString()}</span>
                  {approval.expires_at && (
                    <span>Läuft ab: {new Date(approval.expires_at).toLocaleString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={!!selectedApproval} onOpenChange={(open) => !open && setSelectedApproval(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Freigabe bestätigen' : 'Ablehnung bestätigen'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Ressource: {selectedApproval?.resource_type} • {selectedApproval?.action}
              </p>
              {selectedApproval?.reason && (
                <p className="text-sm mb-2">
                  <strong>Begründung:</strong> {selectedApproval.reason}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Kommentar (optional)</label>
              <Textarea
                placeholder="Optionaler Kommentar zur Entscheidung..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedApproval(null)}>
              Abbrechen
            </Button>
            <Button
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={handleAction}
            >
              {actionType === 'approve' ? 'Freigeben' : 'Ablehnen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
