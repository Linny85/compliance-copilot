import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Loader2, RefreshCw, Ban, RotateCcw } from "lucide-react";
import { toast } from "sonner";

type EmailJob = {
  id: string;
  tenant_id: string;
  to_email: string;
  template_alias: string;
  status: string;
  retry_count: number;
  scheduled_at: string;
  sent_at?: string;
  last_error?: string;
};

type EmailEvent = {
  id: number;
  occurred_at: string;
  event_type: string;
  email?: string;
  message_id?: string;
};

export default function EmailAdmin() {
  const isAdmin = useIsAdmin();
  const [jobs, setJobs] = useState<EmailJob[]>([]);
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: j, error: jobError } = await supabase
        .from("email_jobs")
        .select("*")
        .order("scheduled_at", { ascending: false })
        .limit(200);

      if (jobError) throw jobError;
      setJobs(j || []);

      // Events via Service-Role Function (RLS-gesichert)
      const { data: eventsData, error: eventError } = await supabase.functions.invoke('events-list');
      
      if (eventError) {
        console.warn("Events not accessible:", eventError);
      } else {
        setEvents(eventsData?.data || []);
      }
    } catch (error: any) {
      toast.error("Fehler beim Laden: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const requeue = async (id: string) => {
    const { error } = await supabase
      .from("email_jobs")
      .update({
        status: "queued",
        scheduled_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", id);

    if (error) {
      toast.error("Fehler: " + error.message);
    } else {
      toast.success("Job wurde wieder in die Queue gelegt");
      load();
    }
  };

  const block = async (id: string) => {
    const { error } = await supabase
      .from("email_jobs")
      .update({ status: "blocked" })
      .eq("id", id);

    if (error) {
      toast.error("Fehler: " + error.message);
    } else {
      toast.success("Job wurde blockiert");
      load();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent": return "default";
      case "queued": return "secondary";
      case "sending": return "outline";
      case "failed": return "destructive";
      case "blocked": return "destructive";
      default: return "secondary";
    }
  };

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Kein Zugriff. Nur für Administratoren.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">E-Mail Administration</h1>
        <Button onClick={load} disabled={loading} variant="outline">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Lädt...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Aktualisieren
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>E-Mail Jobs ({jobs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="p-2 font-medium">Geplant</th>
                  <th className="p-2 font-medium">Status</th>
                  <th className="p-2 font-medium">Empfänger</th>
                  <th className="p-2 font-medium">Template</th>
                  <th className="p-2 font-medium">Versuche</th>
                  <th className="p-2 font-medium">Fehler</th>
                  <th className="p-2 font-medium text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 text-xs">
                      {format(new Date(j.scheduled_at), "dd.MM.yyyy HH:mm")}
                    </td>
                    <td className="p-2">
                      <Badge variant={getStatusColor(j.status)}>{j.status}</Badge>
                    </td>
                    <td className="p-2">{j.to_email}</td>
                    <td className="p-2 font-mono text-xs">{j.template_alias}</td>
                    <td className="p-2">{j.retry_count}</td>
                    <td className="p-2 max-w-xs truncate text-xs text-muted-foreground">
                      {j.last_error || "-"}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => requeue(j.id)}
                          disabled={j.status === "sent"}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => block(j.id)}
                          disabled={j.status === "sent" || j.status === "blocked"}
                        >
                          <Ban className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      Keine E-Mail-Jobs vorhanden
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>E-Mail Events ({events.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="p-2 font-medium">Zeit</th>
                  <th className="p-2 font-medium">Typ</th>
                  <th className="p-2 font-medium">E-Mail</th>
                  <th className="p-2 font-medium">Message ID</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 text-xs">
                      {format(new Date(e.occurred_at), "dd.MM.yyyy HH:mm:ss")}
                    </td>
                    <td className="p-2">
                      <Badge variant="outline">{e.event_type}</Badge>
                    </td>
                    <td className="p-2">{e.email || "-"}</td>
                    <td className="p-2 font-mono text-xs">{e.message_id || "-"}</td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                      Keine Events vorhanden oder nicht berechtigt
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
