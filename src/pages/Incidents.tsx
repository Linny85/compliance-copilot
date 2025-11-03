import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  reported_at: string;
  resolved_at?: string;
}

const Incidents = () => {
  const { t } = useTranslation(['common']);
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [newIncident, setNewIncident] = useState({
    title: "",
    description: "",
    severity: "medium",
    status: "open",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    setCompanyId(profile.company_id);

    const { data: incidentsData } = await supabase
      .from("security_incidents")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("reported_at", { ascending: false });

    setIncidents(incidentsData || []);
    setLoading(false);
  };

  const handleCreateIncident = async () => {
    if (!companyId) return;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("security_incidents")
      .insert({
        ...newIncident,
        company_id: companyId,
        reported_by: user?.id,
        reported_at: new Date().toISOString(),
      });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Sicherheitsvorfall erfolgreich gemeldet");
    setDialogOpen(false);
    setNewIncident({
      title: "",
      description: "",
      severity: "medium",
      status: "open",
    });
    loadData();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-destructive";
      case "high": return "bg-orange-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-blue-500";
      default: return "bg-muted";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolved": return <CheckCircle className="h-4 w-4" />;
      case "investigating": return <Clock className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sicherheitsvorfälle</h1>
          <p className="text-muted-foreground mt-2">
            Melden und verwalten Sie sicherheitsrelevante Ereignisse
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Vorfall melden
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Sicherheitsvorfall melden</DialogTitle>
              <DialogDescription>
                Erfassen Sie einen neuen Sicherheitsvorfall für Ihre Organisation
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Titel des Vorfalls *</Label>
                <Input
                  id="title"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  placeholder="z.B. Unbefugter Zugriff auf Kundendaten"
                />
              </div>

              <div>
                <Label htmlFor="description">Beschreibung *</Label>
                <Textarea
                  id="description"
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                  placeholder="Detaillierte Beschreibung des Vorfalls..."
                  rows={5}
                />
              </div>

              <div>
                <Label htmlFor="severity">Schweregrad</Label>
                <Select
                  value={newIncident.severity}
                  onValueChange={(value) => setNewIncident({ ...newIncident, severity: value })}
                >
                  <SelectTrigger id="severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Niedrig</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                    <SelectItem value="critical">Kritisch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleCreateIncident}
                disabled={!newIncident.title || !newIncident.description}
              >
                Vorfall melden
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12">Lädt...</div>
      ) : incidents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Keine Vorfälle gemeldet</h3>
            <p className="text-muted-foreground mb-4">
              Melden Sie Sicherheitsvorfälle, um sie nachzuverfolgen
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ersten Vorfall melden
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {incidents.map((incident) => (
            <Card key={incident.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(incident.status)}
                      <CardTitle className="text-xl">{incident.title}</CardTitle>
                    </div>
                    <CardDescription>{incident.description}</CardDescription>
                  </div>
                  <Badge className={getSeverityColor(incident.severity)}>
                    {incident.severity}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Gemeldet: {new Date(incident.reported_at).toLocaleString('de-DE')}</span>
                  {incident.resolved_at && (
                    <span>Gelöst: {new Date(incident.resolved_at).toLocaleString('de-DE')}</span>
                  )}
                  <Badge variant="outline">{incident.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Incidents;
