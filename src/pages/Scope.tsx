import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Building2, FileText, Plus, Search, Server, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ScopeUnit {
  id: string;
  kind: 'business_unit' | 'process' | 'system' | 'vendor';
  name: string;
  owner_id?: string;
  created_at: string;
}

interface Control {
  id: string;
  code: string;
  title: string;
  frameworks?: {
    code: string;
    title: string;
  };
}

export default function Scope() {
  const { t } = useTranslation(["scope", "common"]);
  const { toast } = useToast();
  const [units, setUnits] = useState<ScopeUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterKind, setFilterKind] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitKind, setNewUnitKind] = useState<string>("business_unit");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<ScopeUnit | null>(null);
  const [controlSearch, setControlSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Control[]>([]);
  const [selectedControl, setSelectedControl] = useState<Control | null>(null);
  const [assignStatus, setAssignStatus] = useState<string>("in_scope");
  const [assignNote, setAssignNote] = useState("");

  useEffect(() => {
    loadUnits();
  }, [filterKind]);

  const loadUnits = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("scope_units")
        .select("*")
        .order("kind")
        .order("name");

      if (filterKind !== "all") {
        query = query.eq("kind", filterKind);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUnits((data || []) as ScopeUnit[]);
    } catch (error) {
      console.error("Failed to load scope units:", error);
      toast({
        title: t("scope:errors.load_failed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const searchControls = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("controls")
        .select(`
          id, code, title,
          frameworks:frameworks(code, title)
        `)
        .or(`code.ilike.%${query}%,title.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Control search failed:", error);
    }
  };

  const handleCreateUnit = async () => {
    if (!newUnitName.trim()) return;

    try {
      const { error } = await supabase.functions.invoke("upsert-scope-unit", {
        body: { kind: newUnitKind, name: newUnitName.trim() },
      });

      if (error) throw error;

      toast({
        title: t("scope:success.unit_created"),
      });

      setDialogOpen(false);
      setNewUnitName("");
      loadUnits();
    } catch (error: any) {
      console.error("Failed to create unit:", error);
      toast({
        title: t("scope:errors.create_failed"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAssignControl = async () => {
    if (!selectedControl || !selectedUnit) return;

    try {
      const { error } = await supabase.functions.invoke("assign-control", {
        body: {
          control_id: selectedControl.id,
          unit_id: selectedUnit.id,
          status: assignStatus,
          note: assignNote.trim() || null,
        },
      });

      if (error) throw error;

      toast({
        title: t("scope:success.control_assigned"),
      });

      setAssignDialogOpen(false);
      setSelectedControl(null);
      setControlSearch("");
      setAssignNote("");
      setSearchResults([]);
    } catch (error: any) {
      console.error("Failed to assign control:", error);
      toast({
        title: t("scope:errors.assign_failed"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case "business_unit":
        return <Building2 className="h-5 w-5" />;
      case "process":
        return <FileText className="h-5 w-5" />;
      case "system":
        return <Server className="h-5 w-5" />;
      case "vendor":
        return <Truck className="h-5 w-5" />;
      default:
        return <Building2 className="h-5 w-5" />;
    }
  };

  const getKindColor = (kind: string) => {
    const colors: Record<string, string> = {
      business_unit: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      process: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      system: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      vendor: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    };
    return colors[kind] || colors.business_unit;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("scope:title")}</h1>
          <p className="text-muted-foreground mt-2">{t("scope:subtitle")}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("scope:actions.new_unit")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("scope:dialogs.create_unit.title")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="unit-kind">{t("scope:fields.kind")}</Label>
                <Select value={newUnitKind} onValueChange={setNewUnitKind}>
                  <SelectTrigger id="unit-kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business_unit">{t("scope:kinds.business_unit")}</SelectItem>
                    <SelectItem value="process">{t("scope:kinds.process")}</SelectItem>
                    <SelectItem value="system">{t("scope:kinds.system")}</SelectItem>
                    <SelectItem value="vendor">{t("scope:kinds.vendor")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="unit-name">{t("scope:fields.name")}</Label>
                <Input
                  id="unit-name"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  placeholder={t("scope:fields.name_placeholder")}
                />
              </div>
              <Button onClick={handleCreateUnit} className="w-full">
                {t("scope:actions.create")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("scope:filters.title")}</CardTitle>
            <Select value={filterKind} onValueChange={setFilterKind}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("scope:filters.all")}</SelectItem>
                <SelectItem value="business_unit">{t("scope:kinds.business_unit")}</SelectItem>
                <SelectItem value="process">{t("scope:kinds.process")}</SelectItem>
                <SelectItem value="system">{t("scope:kinds.system")}</SelectItem>
                <SelectItem value="vendor">{t("scope:kinds.vendor")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t("common:loading")}</p>
        </div>
      ) : units.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("scope:empty_state")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {units.map((unit) => (
            <Card key={unit.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <Badge className={getKindColor(unit.kind)}>
                        <span className="flex items-center gap-1">
                          {getKindIcon(unit.kind)}
                          {t(`scope:kinds.${unit.kind}`)}
                        </span>
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">{unit.name}</CardTitle>
                  </div>
                  <Dialog
                    open={assignDialogOpen && selectedUnit?.id === unit.id}
                    onOpenChange={(open) => {
                      setAssignDialogOpen(open);
                      if (open) setSelectedUnit(unit);
                      else {
                        setSelectedUnit(null);
                        setSelectedControl(null);
                        setControlSearch("");
                        setSearchResults([]);
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        {t("scope:actions.assign_control")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t("scope:dialogs.assign_control.title")}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>{t("scope:fields.control")}</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              className="pl-10"
                              value={controlSearch}
                              onChange={(e) => {
                                setControlSearch(e.target.value);
                                searchControls(e.target.value);
                              }}
                              placeholder={t("scope:fields.control_search_placeholder")}
                            />
                          </div>
                          {searchResults.length > 0 && (
                            <div className="mt-2 border rounded-md max-h-48 overflow-y-auto">
                              {searchResults.map((control) => (
                                <button
                                  key={control.id}
                                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                                  onClick={() => {
                                    setSelectedControl(control);
                                    setControlSearch(`${control.code} - ${control.title}`);
                                    setSearchResults([]);
                                  }}
                                >
                                  <div className="font-mono text-xs text-muted-foreground">
                                    {control.code}
                                  </div>
                                  <div className="font-medium">{control.title}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {control.frameworks?.code}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <Label>{t("scope:fields.status")}</Label>
                          <Select value={assignStatus} onValueChange={setAssignStatus}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="in_scope">{t("scope:status.in_scope")}</SelectItem>
                              <SelectItem value="out_of_scope">{t("scope:status.out_of_scope")}</SelectItem>
                              <SelectItem value="exception">{t("scope:status.exception")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>{t("scope:fields.note")}</Label>
                          <Textarea
                            value={assignNote}
                            onChange={(e) => setAssignNote(e.target.value)}
                            placeholder={t("scope:fields.note_placeholder")}
                            rows={3}
                          />
                        </div>
                        <Button
                          onClick={handleAssignControl}
                          disabled={!selectedControl}
                          className="w-full"
                        >
                          {t("scope:actions.assign")}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
