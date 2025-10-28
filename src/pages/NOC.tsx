import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/layouts/AdminLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';

type NOCTenant = {
  tenant_id: string;
  tenant_name: string;
  traffic_light: 'green' | 'yellow' | 'red';
  success_rate_30d: number;
  wow_delta_30d: number;
  open_critical: number;
  open_warning: number;
  last_24h_alerts: number;
  mtta_ms: number;
  mttr_ms: number;
  burn_24h_x: number;
  burn_7d_x: number;
  burn_status: 'healthy' | 'elevated' | 'excessive';
  updated_at: string;
};

type FilterStatus = 'all' | 'green' | 'yellow' | 'red';
type SortField = 'name' | 'sr' | 'burn' | 'critical';

export default function NOC() {
  const [tenants, setTenants] = useState<NOCTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('critical');
  const navigate = useNavigate();

  const loadNOC = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('v_noc_overview' as any)
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setTenants((data as unknown as NOCTenant[]) ?? []);
    } catch (e: any) {
      console.error('[NOC] load error:', e);
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNOC();
    const interval = setInterval(loadNOC, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const filtered = tenants
    .filter((t) => {
      if (filterStatus !== 'all' && t.traffic_light !== filterStatus) return false;
      if (search && !t.tenant_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortField) {
        case 'name':
          return a.tenant_name.localeCompare(b.tenant_name);
        case 'sr':
          return b.success_rate_30d - a.success_rate_30d;
        case 'burn':
          return b.burn_24h_x - a.burn_24h_x;
        case 'critical':
          return b.open_critical - a.open_critical;
        default:
          return 0;
      }
    });

  const lightEmoji = (light: string) => {
    if (light === 'red') return '🔴';
    if (light === 'yellow') return '🟡';
    return '🟢';
  };

  if (loading) {
    return (
      <AdminLayout>
        <h1 className="text-3xl font-bold mb-6">Network Operations Center</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Network Operations Center</h1>
          <p className="text-muted-foreground">Multi-tenant compliance monitoring</p>
        </div>
        <Button onClick={loadNOC} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('all')}
          >
            All
          </Button>
          <Button
            variant={filterStatus === 'green' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('green')}
          >
            🟢 Green
          </Button>
          <Button
            variant={filterStatus === 'yellow' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('yellow')}
          >
            🟡 Yellow
          </Button>
          <Button
            variant={filterStatus === 'red' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('red')}
          >
            🔴 Red
          </Button>
        </div>

        <div className="flex gap-2">
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="name">Sort: Name</option>
            <option value="sr">Sort: Success Rate</option>
            <option value="burn">Sort: Burn Rate</option>
            <option value="critical">Sort: Critical Alerts</option>
          </select>
        </div>
      </div>

      {/* Tenant Grid */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No tenants match the current filters</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Card
              key={t.tenant_id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/admin?tenant=${t.tenant_id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{t.tenant_name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(t.updated_at).toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-3xl">{lightEmoji(t.traffic_light)}</div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Success Rate</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{t.success_rate_30d}%</span>
                    {t.wow_delta_30d !== 0 && (
                      <Badge variant={t.wow_delta_30d >= 0 ? 'default' : 'destructive'}>
                        {t.wow_delta_30d >= 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {Math.abs(t.wow_delta_30d)}%
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Open Alerts</span>
                  <div className="flex items-center gap-2">
                    {t.open_critical > 0 && (
                      <Badge variant="destructive">🔴 {t.open_critical}</Badge>
                    )}
                    {t.open_warning > 0 && (
                      <Badge variant="secondary">🟡 {t.open_warning}</Badge>
                    )}
                    {t.open_critical === 0 && t.open_warning === 0 && (
                      <span className="text-sm text-muted-foreground">None</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Burn Rate</span>
                  <Badge
                    variant={
                      t.burn_status === 'excessive'
                        ? 'destructive'
                        : t.burn_status === 'elevated'
                        ? 'secondary'
                        : 'default'
                    }
                  >
                    {t.burn_24h_x.toFixed(1)}× {t.burn_status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">MTTA / MTTR</span>
                  <span className="text-sm font-mono">
                    {Math.round(t.mtta_ms / 1000)}s / {Math.round(t.mttr_ms / 1000)}s
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
