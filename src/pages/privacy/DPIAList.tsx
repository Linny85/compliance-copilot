import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, FileText } from "lucide-react";
import { format, startOfDay, isBefore } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useTranslation } from "react-i18next";

const TZ = "Europe/Stockholm";

const isOverdue = (iso?: string | null, status?: string) => {
  if (!iso) return false;
  if (status === "approved" || status === "archived") return false;
  const dueLocal = startOfDay(toZonedTime(iso, TZ));
  const nowLocal = startOfDay(toZonedTime(new Date(), TZ));
  return isBefore(dueLocal, nowLocal);
};

interface DPIARecord {
  id: string;
  title: string;
  status: string;
  risk_level: string | null;
  process_name: string | null;
  vendor_name: string | null;
  created_at: string;
  due_at: string | null;
}

interface DpiaListResponse {
  items: DPIARecord[];
}

interface DpiaCreateResponse {
  record: {
    id: string;
  };
}

type CreatePayload = {
  title: string;
  process_id?: string;
  vendor_id?: string;
};

export default function DPIAList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation(['privacy', 'common']);
  const [records, setRecords] = useState<DPIARecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [riskFilter, setRiskFilter] = useState<string>("");
  const [showNew, setShowNew] = useState(false);

  // New DPIA form
  const [newTitle, setNewTitle] = useState("");
  const [newScope, setNewScope] = useState<"process" | "vendor">("process");
  const [newScopeId, setNewScopeId] = useState("");

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (riskFilter) params.risk = riskFilter;
      if (search) params.search = search;

      const { data, error } = await supabase.functions.invoke<DpiaListResponse>("dpia-list", {
        body: params,
      });

      if (error) throw error;
      setRecords(data?.items || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: t('privacy:dpiaList.toast.loadError', 'Error loading DPIAs'), description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [riskFilter, search, statusFilter, t, toast]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleCreate = async () => {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      toast({ title: t('privacy:dpiaList.toast.titleRequired', 'Title required'), variant: "destructive" });
      return;
    }

    try {
      const payload: CreatePayload = { title: trimmedTitle };
      if (newScope === "process" && newScopeId) payload.process_id = newScopeId;
      if (newScope === "vendor" && newScopeId) payload.vendor_id = newScopeId;

      const { data, error } = await supabase.functions.invoke<DpiaCreateResponse>("dpia-create", { body: payload });

      if (error) throw error;
      if (!data?.record?.id) throw new Error(t('privacy:dpiaList.toast.createMissingId', 'DPIA identifier missing')); 
      toast({ title: t('privacy:dpiaList.toast.created', 'DPIA created') });
      setShowNew(false);
      setNewTitle("");
      setNewScopeId("");
      navigate(`/privacy/dpia/${data.record.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: t('privacy:dpiaList.toast.createError', 'Error creating DPIA'), description: message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "secondary",
      submitted: "default",
      in_review: "default",
      scored: "default",
      approved: "default",
      rejected: "destructive",
      archived: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{t(`privacy:dpiaList.status.${status}`, status)}</Badge>;
  };

  const getRiskBadge = (risk: string | null) => {
    if (!risk) return <span className="text-muted-foreground">{t('privacy:dpiaList.risk.none', '-')}</span>;
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      low: "default",
      med: "secondary",
      high: "destructive",
      critical: "destructive",
    };
    return <Badge variant={variants[risk] || "outline"}>{t(`privacy:dpiaList.risk.${risk}`, risk)}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('privacy:dpiaList.title', 'Data Protection Impact Assessments (DPIA)')}
          </CardTitle>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('privacy:dpiaList.actions.new', 'New DPIA')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('privacy:dpiaList.dialog.title', 'Create New DPIA')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t('privacy:dpiaList.form.title', 'Title')}</Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={t('privacy:dpiaList.form.titlePlaceholder', 'DPIA Title')}
                  />
                </div>
                <div>
                  <Label>{t('privacy:dpiaList.form.scope', 'Scope')}</Label>
                  <Select value={newScope} onValueChange={(value: "process" | "vendor") => setNewScope(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="process">{t('privacy:dpiaList.scope.process', 'Process')}</SelectItem>
                      <SelectItem value="vendor">{t('privacy:dpiaList.scope.vendor', 'Vendor')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('privacy:dpiaList.form.scopeId', 'Scope ID (optional)')}</Label>
                  <Input
                    value={newScopeId}
                    onChange={(e) => setNewScopeId(e.target.value)}
                    placeholder={t('privacy:dpiaList.form.scopePlaceholder', 'UUID')}
                  />
                </div>
                <Button onClick={handleCreate} className="w-full">
                  {t('privacy:dpiaList.actions.create', 'Create')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('privacy:dpiaList.search.placeholder', 'Search DPIAs...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('privacy:dpiaList.filters.status', 'Status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('privacy:dpiaList.filters.all', 'All')}</SelectItem>
                <SelectItem value="open">{t('privacy:dpiaList.status.open', 'Open')}</SelectItem>
                <SelectItem value="submitted">{t('privacy:dpiaList.status.submitted', 'Submitted')}</SelectItem>
                <SelectItem value="scored">{t('privacy:dpiaList.status.scored', 'Scored')}</SelectItem>
                <SelectItem value="approved">{t('privacy:dpiaList.status.approved', 'Approved')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('privacy:dpiaList.filters.risk', 'Risk')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('privacy:dpiaList.filters.all', 'All')}</SelectItem>
                <SelectItem value="low">{t('privacy:dpiaList.risk.low', 'Low')}</SelectItem>
                <SelectItem value="med">{t('privacy:dpiaList.risk.med', 'Medium')}</SelectItem>
                <SelectItem value="high">{t('privacy:dpiaList.risk.high', 'High')}</SelectItem>
                <SelectItem value="critical">{t('privacy:dpiaList.risk.critical', 'Critical')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p>{t('privacy:dpiaList.loading', 'Loading...')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('privacy:dpiaList.table.title', 'Title')}</TableHead>
                  <TableHead>{t('privacy:dpiaList.table.status', 'Status')}</TableHead>
                  <TableHead>{t('privacy:dpiaList.table.risk', 'Risk')}</TableHead>
                  <TableHead>{t('privacy:dpiaList.table.process', 'Process')}</TableHead>
                  <TableHead>{t('privacy:dpiaList.table.vendor', 'Vendor')}</TableHead>
                  <TableHead>{t('privacy:dpiaList.table.due', 'Due')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {t('privacy:dpiaList.empty', 'No DPIAs found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((rec) => (
                    <TableRow key={rec.id} className="cursor-pointer" onClick={() => navigate(`/privacy/dpia/${rec.id}`)}>
                      <TableCell className="font-medium">{rec.title}</TableCell>
                      <TableCell>{getStatusBadge(rec.status)}</TableCell>
                      <TableCell>{getRiskBadge(rec.risk_level)}</TableCell>
                      <TableCell>{rec.process_name || t('privacy:dpiaList.emptyValue', '-')}</TableCell>
                      <TableCell>{rec.vendor_name || t('privacy:dpiaList.emptyValue', '-')}</TableCell>
                      <TableCell>
                        {rec.due_at ? (
                          <div className="flex items-center gap-2">
                            {format(new Date(rec.due_at), 'PPP')}
                            {isOverdue(rec.due_at, rec.status) && (
                              <Badge variant="destructive" className="text-xs">{t('privacy:dpiaList.badges.overdue', 'Overdue')}</Badge>
                            )}
                          </div>
                        ) : (
                          t('privacy:dpiaList.emptyValue', '-')
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
