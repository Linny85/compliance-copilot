import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Search, AlertTriangle, Shield, FileWarning, Plus, Trash2 } from "lucide-react";

interface ScopeItem {
  scope_id: string;
  scope_type: string;
  name: string;
}

interface MatrixItem {
  control_id: string;
  scope_type: string;
  scope_id: string;
  owner_id: string;
  effective_mode: string;
  exception_flag: boolean;
  exception_reason: string | null;
  has_conflict: boolean;
  conflict_kind: string | null;
  controls: {
    code: string;
    title: string;
    frameworks: { code: string; title: string };
  };
  profiles: { full_name: string };
}

export default function ScopeMatrix() {
  const { t } = useTranslation();
  const [scopeType, setScopeType] = useState<'orgunit' | 'asset' | 'process'>('orgunit');
  const [scopes, setScopes] = useState<ScopeItem[]>([]);
  const [selectedScope, setSelectedScope] = useState<ScopeItem | null>(null);
  const [matrixItems, setMatrixItems] = useState<MatrixItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showConflicts, setShowConflicts] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Dialogs
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [exceptionDialogOpen, setExceptionDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<MatrixItem | null>(null);

  // Form states
  const [assignMode, setAssignMode] = useState<'inherit' | 'override'>('inherit');
  const [exceptionReason, setExceptionReason] = useState("");

  useEffect(() => {
    loadScopes();
  }, [scopeType]);

  useEffect(() => {
    if (selectedScope) {
      loadMatrix();
    }
  }, [selectedScope, search, showConflicts]);

  const loadScopes = async () => {
    setLoading(true);
    try {
      let query;
      if (scopeType === 'orgunit') {
        query = supabase.from('orgunits').select('id, name, tenant_id');
      } else if (scopeType === 'asset') {
        query = supabase.from('assets').select('id, name, tenant_id');
      } else {
        query = supabase.from('processes').select('id, name, tenant_id');
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data ?? []).map(d => ({
        scope_id: d.id,
        scope_type: scopeType,
        name: d.name
      }));

      setScopes(mapped);
      if (mapped.length > 0 && !selectedScope) {
        setSelectedScope(mapped[0]);
      }
    } catch (error: any) {
      console.error('Error loading scopes:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMatrix = async () => {
    if (!selectedScope) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        scope_type: selectedScope.scope_type,
        scope_id: selectedScope.scope_id,
        only_conflicts: showConflicts ? 'true' : 'false'
      });
      if (search) params.set('search', search);

      const { data, error } = await supabase.functions.invoke('scope-matrix-list', {
        body: { params: Object.fromEntries(params) }
      });

      if (error) throw error;
      setMatrixItems(data?.items ?? []);
    } catch (error: any) {
      console.error('Error loading matrix:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!currentItem || !selectedScope) return;

    try {
      const { error } = await supabase.functions.invoke('scope-matrix-assign', {
        body: {
          control_id: currentItem.control_id,
          scope_ref: { type: selectedScope.scope_type, id: selectedScope.scope_id },
          owner_id: currentItem.owner_id,
          inheritance_rule: assignMode,
          exception_flag: false
        }
      });

      if (error) throw error;
      toast.success(t('matrix.success.assigned'));
      setAssignDialogOpen(false);
      loadMatrix();
    } catch (error: any) {
      console.error('Error assigning:', error);
      toast.error(error.message);
    }
  };

  const handleSetException = async () => {
    if (!currentItem || !selectedScope || !exceptionReason.trim()) {
      toast.error(t('matrix.error.exception_reason_required'));
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('scope-matrix-assign', {
        body: {
          control_id: currentItem.control_id,
          scope_ref: { type: selectedScope.scope_type, id: selectedScope.scope_id },
          owner_id: currentItem.owner_id,
          inheritance_rule: 'none',
          exception_flag: true,
          exception_reason: exceptionReason
        }
      });

      if (error) throw error;
      toast.success(t('matrix.success.exception_set'));
      setExceptionDialogOpen(false);
      setExceptionReason("");
      loadMatrix();
    } catch (error: any) {
      console.error('Error setting exception:', error);
      toast.error(error.message);
    }
  };

  const handleUnassign = async (item: MatrixItem) => {
    if (!selectedScope) return;

    try {
      const { error } = await supabase.functions.invoke('scope-matrix-unassign', {
        body: {
          control_id: item.control_id,
          scope_ref: { type: selectedScope.scope_type, id: selectedScope.scope_id }
        }
      });

      if (error) throw error;
      toast.success(t('matrix.success.unassigned'));
      loadMatrix();
    } catch (error: any) {
      console.error('Error unassigning:', error);
      toast.error(error.message);
    }
  };

  const handleFixConflicts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('scope-matrix-fix-conflicts', {
        body: { dedupe: true }
      });

      if (error) throw error;
      toast.success(t('matrix.success.conflicts_fixed', { count: data?.fixed ?? 0 }));
      loadMatrix();
    } catch (error: any) {
      console.error('Error fixing conflicts:', error);
      toast.error(error.message);
    }
  };

  const getModeBadge = (mode: string, hasConflict: boolean) => {
    if (hasConflict) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{t('matrix.badge.conflict')}</Badge>;
    }
    
    switch (mode) {
      case 'direct':
        return <Badge variant="secondary">{t('matrix.badge.direct')}</Badge>;
      case 'override':
        return <Badge variant="default">{t('matrix.badge.override')}</Badge>;
      case 'exception':
        return <Badge variant="destructive" className="gap-1"><FileWarning className="h-3 w-3" />{t('matrix.badge.exception')}</Badge>;
      default:
        return <Badge>{mode}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('matrix.title')}</h1>
          <p className="text-muted-foreground">{t('matrix.subtitle')}</p>
        </div>
        <Button onClick={handleFixConflicts} variant="outline" className="gap-2">
          <Shield className="h-4 w-4" />
          {t('matrix.action.fix_conflicts')}
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Scope Picker */}
        <Card className="col-span-3 p-4">
          <Tabs value={scopeType} onValueChange={(v) => setScopeType(v as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="orgunit" className="flex-1">{t('scope.kinds.business_unit')}</TabsTrigger>
              <TabsTrigger value="asset" className="flex-1">{t('scope.kinds.system')}</TabsTrigger>
              <TabsTrigger value="process" className="flex-1">{t('scope.kinds.process')}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-4 space-y-2">
            {scopes.map(scope => (
              <Button
                key={scope.scope_id}
                variant={selectedScope?.scope_id === scope.scope_id ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setSelectedScope(scope)}
              >
                {scope.name}
              </Button>
            ))}
          </div>
        </Card>

        {/* Right: Matrix Table */}
        <Card className="col-span-9 p-6">
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('matrix.search_controls')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showConflicts ? "default" : "outline"}
              onClick={() => setShowConflicts(!showConflicts)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {t('matrix.show_conflicts_only')}
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
          ) : matrixItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t('matrix.no_assignments')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox />
                  </TableHead>
                  <TableHead>{t('matrix.control')}</TableHead>
                  <TableHead>{t('matrix.framework')}</TableHead>
                  <TableHead>{t('matrix.owner')}</TableHead>
                  <TableHead>{t('matrix.mode')}</TableHead>
                  <TableHead className="text-right">{t('matrix.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixItems.map(item => (
                  <TableRow key={`${item.control_id}-${item.scope_id}`}>
                    <TableCell>
                      <Checkbox />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.controls?.code}</div>
                      <div className="text-sm text-muted-foreground">{item.controls?.title}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.controls?.frameworks?.code}</Badge>
                    </TableCell>
                    <TableCell>{item.profiles?.full_name ?? '-'}</TableCell>
                    <TableCell>{getModeBadge(item.effective_mode, item.has_conflict)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog open={assignDialogOpen && currentItem?.control_id === item.control_id} onOpenChange={setAssignDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => setCurrentItem(item)}>
                              {t('matrix.action.assign')}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t('matrix.dialog.assign_title')}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Select value={assignMode} onValueChange={(v) => setAssignMode(v as any)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="inherit">{t('matrix.mode.inherit')}</SelectItem>
                                  <SelectItem value="override">{t('matrix.mode.override')}</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button onClick={handleAssign} className="w-full">{t('matrix.action.save')}</Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Dialog open={exceptionDialogOpen && currentItem?.control_id === item.control_id} onOpenChange={setExceptionDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => setCurrentItem(item)}>
                              <FileWarning className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t('matrix.dialog.exception_title')}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Textarea
                                placeholder={t('matrix.exception_reason_placeholder')}
                                value={exceptionReason}
                                onChange={(e) => setExceptionReason(e.target.value)}
                                rows={4}
                              />
                              <Button onClick={handleSetException} className="w-full">{t('matrix.action.set_exception')}</Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button size="sm" variant="ghost" onClick={() => handleUnassign(item)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
