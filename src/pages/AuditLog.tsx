import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { de, enUS } from "date-fns/locale";

interface AuditLogEntry {
  id: number;
  actor_id: string;
  action: string;
  entity: string;
  entity_id: string;
  payload: Json;
  ip?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export default function AuditLog() {
  const { t, i18n } = useTranslation(["common"]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs((data as AuditLogEntry[]) || []);
    } catch (error) {
      console.error("Failed to load audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEntityBadgeVariant = (entity: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      policy: "default",
      control: "secondary",
      evidence: "outline",
      deviation: "destructive",
      tenant: "default",
    };
    return variants[entity] || "outline";
  };

  const formatTimeAgo = (dateString: string) => {
    const locale = i18n.language === "de" ? de : enUS;
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale });
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("common.auditLog", "Audit Log")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>{t("common.loading")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.time", "Time")}</TableHead>
                  <TableHead>{t("common.action", "Action")}</TableHead>
                  <TableHead>{t("common.entity", "Entity")}</TableHead>
                  <TableHead>{t("common.entityId", "ID")}</TableHead>
                  <TableHead>{t("common.actor", "Actor")}</TableHead>
                  <TableHead>{t("common.details", "Details")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTimeAgo(log.created_at)}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {log.action}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getEntityBadgeVariant(log.entity)}>
                        {log.entity}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.entity_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.actor_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {log.payload && typeof log.payload === 'object' && Object.keys(log.payload).length > 0 && (
                        <details className="cursor-pointer">
                          <summary className="text-xs text-muted-foreground">
                            {t("common.showPayload", "Show payload")}
                          </summary>
                          <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto max-w-md">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </details>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
