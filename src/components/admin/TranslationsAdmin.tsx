import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, RefreshCw, Search, Globe } from "lucide-react";
import { toast } from "sonner";

type Translation = {
  id: string;
  tenant_id?: string | null;
  namespace: string;
  tkey: string;
  locale: string;
  text: string;
  version: number;
  approved: boolean;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
};

type TranslationsAdminProps = {
  fnUrl: string;
  adminSecret: string;
  tenantId?: string | null;
};

export default function TranslationsAdmin({
  fnUrl,
  adminSecret,
  tenantId = null,
}: TranslationsAdminProps) {
  const [rows, setRows] = useState<Translation[]>([]);
  const [ns, setNs] = useState("controls");
  const [locale, setLocale] = useState("de");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  async function list() {
    setLoading(true);
    try {
      const url = new URL(`${fnUrl}/i18n-admin/list`);
      url.searchParams.set("namespace", ns);
      url.searchParams.set("locale", locale);
      if (tenantId) url.searchParams.set("tenant_id", tenantId);

      const res = await fetch(url.toString(), {
        headers: { "x-admin-secret": adminSecret },
      });

      if (!res.ok) {
        throw new Error(`Failed to load translations: ${res.statusText}`);
      }

      const json = await res.json();
      let data = json?.data ?? [];

      if (query) {
        data = data.filter((r: Translation) =>
          String(r.tkey).toLowerCase().includes(query.toLowerCase())
        );
      }

      setRows(data);
    } catch (error) {
      console.error("Error loading translations:", error);
      toast.error("Failed to load translations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    list();
  }, [ns, locale, tenantId]);

  async function upsert(row: Partial<Translation>) {
    try {
      const res = await fetch(`${fnUrl}/i18n-admin/upsert`, {
        method: "POST",
        headers: {
          "x-admin-secret": adminSecret,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: row.id,
          tenant_id: tenantId,
          namespace: row.namespace ?? ns,
          tkey: row.tkey,
          locale: row.locale ?? locale,
          text: row.text,
          approved: row.approved ?? false,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to upsert: ${res.statusText}`);
      }

      toast.success("Translation updated");
      list();
    } catch (error) {
      console.error("Error upserting translation:", error);
      toast.error("Failed to update translation");
    }
  }

  async function approve(id: string, approved: boolean) {
    try {
      const res = await fetch(`${fnUrl}/i18n-admin/approve`, {
        method: "POST",
        headers: {
          "x-admin-secret": adminSecret,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, approved }),
      });

      if (!res.ok) {
        throw new Error(`Failed to approve: ${res.statusText}`);
      }

      toast.success(approved ? "Translation approved" : "Approval revoked");
      list();
    } catch (error) {
      console.error("Error approving translation:", error);
      toast.error("Failed to update approval status");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Translation Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs text-muted-foreground">Namespace</label>
            <Input
              value={ns}
              onChange={(e) => setNs(e.target.value)}
              placeholder="controls"
            />
          </div>
          <div className="w-24">
            <label className="text-xs text-muted-foreground">Locale</label>
            <Input
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              placeholder="de"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground">Search Key</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="catalog.AI_ACT..."
                className="pl-8"
              />
            </div>
          </div>
          <Button onClick={list} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Reload
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No translations found. Try adjusting filters.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{r.namespace}</Badge>
                        <Badge variant="outline">{r.locale}</Badge>
                        {r.tenant_id ? (
                          <Badge variant="secondary">Tenant</Badge>
                        ) : (
                          <Badge variant="default">Global</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">v{r.version}</span>
                      </div>
                      <code className="text-xs mt-1 block break-all">{r.tkey}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.approved ? (
                        <Badge className="gap-1" variant="default">
                          <CheckCircle2 className="h-3 w-3" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge className="gap-1" variant="secondary">
                          <XCircle className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant={r.approved ? "outline" : "default"}
                        onClick={() => approve(r.id, !r.approved)}
                      >
                        {r.approved ? "Revoke" : "Approve"}
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    defaultValue={r.text}
                    rows={3}
                    onBlur={(e) => upsert({ ...r, text: e.target.value })}
                    className="font-mono text-sm"
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
