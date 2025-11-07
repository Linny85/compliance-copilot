import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type AuditRow = { 
  id: number; 
  event: string; 
  created_at: string; 
  user_id?: string;
};

interface AuditTrailCardProps {
  companyId?: string;
}

export default function AuditTrailCard({ companyId }: AuditTrailCardProps) {
  const { t, ready, i18n } = useTranslation(['organization', 'common']);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    if (!companyId) return;
    
    const loadAuditEvents = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('audit_events')
          .select('id, event, created_at, user_id')
          .eq('company_id', companyId)
          .in('event', ['master.set', 'master.rotate', 'master.verify.ok', 'master.verify.fail', 'master.locked'])
          .order('created_at', { ascending: false })
          .range(page * pageSize, page * pageSize + pageSize - 1);
        
        setRows(data ?? []);
      } finally {
        setLoading(false);
      }
    };
    
    loadAuditEvents();
  }, [companyId, page]);

  if (!ready) return <div style={{ minHeight: 200 }} />;

  const fmt = new Intl.DateTimeFormat(i18n.resolvedLanguage || 'de-DE', { 
    dateStyle: 'short', 
    timeStyle: 'short' 
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('organization:master.audit.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-left py-2">{t('organization:master.audit.when')}</th>
                <th className="text-left py-2">{t('organization:master.audit.event')}</th>
                <th className="text-left py-2">{t('organization:master.audit.user')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-2">
                    <Skeleton className="h-8 w-full" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="py-2 text-muted-foreground" colSpan={3}>
                    {t('organization:master.audit.empty')}
                  </td>
                </tr>
              ) : (
                rows.map(r => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2">{fmt.format(new Date(r.created_at))}</td>
                    <td className="py-2">{t(`organization:master.audit.events.${r.event}`, r.event)}</td>
                    <td className="py-2 text-muted-foreground">{r.user_id ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))} 
            disabled={page === 0 || loading}
          >
            {t('organization:master.audit.prev')}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setPage(p => p + 1)} 
            disabled={rows.length < pageSize || loading}
          >
            {t('organization:master.audit.next')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
