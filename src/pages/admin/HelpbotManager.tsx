import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Database } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

interface HelpbotDoc {
  id: string;
  title: string;
  jurisdiction: string | null;
  lang: string;
  doc_type: string;
  created_at: string;
}

export default function HelpbotManager() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [docs, setDocs] = useState<HelpbotDoc[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [jurisdiction, setJurisdiction] = useState("EU");
  const [lang, setLang] = useState("de");
  const [docType, setDocType] = useState("law");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function loadDocs() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("helpbot_docs")
        .select("id, title, jurisdiction, lang, doc_type, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocs(data ?? []);
    } catch (error: any) {
      toast({
        title: "Fehler beim Laden",
        description: error?.message ?? "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function upload() {
    if (!file) {
      toast({
        title: "Keine Datei",
        description: "Bitte wählen Sie eine PDF-Datei aus",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "Datei zu groß",
        description: "Die Datei darf maximal 20 MB groß sein",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast({
        title: "Ungültiger Dateityp",
        description: "Nur PDF-Dateien werden unterstützt",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("jurisdiction", jurisdiction);
      form.append("lang", lang);
      form.append("doc_type", docType);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/helpbot-upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: form,
        }
      );

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || `Upload failed (${res.status})`);
      }

      const data = await res.json();

      toast({
        title: data.dedup ? "Dokument bereits vorhanden" : "Upload erfolgreich",
        description: data.dedup
          ? `${file.name} – bereits in der Datenbank`
          : data.ingested?.chunks 
            ? `${file.name} – ${data.ingested.chunks} Chunks angelegt`
            : `${file.name} hochgeladen`,
        variant: data.dedup ? "default" : "default",
      });

      setFile(null);
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      await loadDocs();
    } catch (error: any) {
      toast({
        title: "Upload fehlgeschlagen",
        description: error?.message ?? "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    loadDocs();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Database className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Helpbot Manager</h1>
          <p className="text-sm text-muted-foreground">
            Verwalten Sie Dokumente für den Norrland Guide
          </p>
        </div>
      </div>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Neues Dokument hochladen
          </CardTitle>
          <CardDescription>
            Laden Sie PDF-Dateien hoch, um sie dem Norrland Guide hinzuzufügen (max. 20 MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">PDF-Datei</Label>
            <input
              id="file-upload"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                Ausgewählt: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiktion</Label>
              <Select value={jurisdiction} onValueChange={setJurisdiction}>
                <SelectTrigger id="jurisdiction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EU">EU</SelectItem>
                  <SelectItem value="DE">Deutschland</SelectItem>
                  <SelectItem value="SE">Schweden</SelectItem>
                  <SelectItem value="NO">Norwegen</SelectItem>
                  <SelectItem value="FI">Finnland</SelectItem>
                  <SelectItem value="DK">Dänemark</SelectItem>
                  <SelectItem value="IS">Island</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lang">Sprache</Label>
              <Select value={lang} onValueChange={setLang}>
                <SelectTrigger id="lang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="sv">Svenska</SelectItem>
                  <SelectItem value="no">Norsk</SelectItem>
                  <SelectItem value="fi">Suomi</SelectItem>
                  <SelectItem value="da">Dansk</SelectItem>
                  <SelectItem value="is">Íslenska</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-type">Dokumenttyp</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger id="doc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="law">Gesetz</SelectItem>
                  <SelectItem value="guideline">Richtlinie</SelectItem>
                  <SelectItem value="product-doc">Produktdokumentation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={upload} disabled={uploading || !file} className="w-full md:w-auto">
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird hochgeladen...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Hochladen
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Vorhandene Dokumente</CardTitle>
          <CardDescription>
            {docs.length} Dokument{docs.length !== 1 ? 'e' : ''} in der Datenbank
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Keine Dokumente vorhanden. Laden Sie das erste Dokument hoch.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium text-foreground">Titel</th>
                    <th className="text-left p-3 font-medium text-foreground">Jurisdiktion</th>
                    <th className="text-left p-3 font-medium text-foreground">Sprache</th>
                    <th className="text-left p-3 font-medium text-foreground">Typ</th>
                    <th className="text-left p-3 font-medium text-foreground">Erstellt</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3 text-foreground">{d.title}</td>
                      <td className="p-3 text-muted-foreground">{d.jurisdiction ?? '—'}</td>
                      <td className="p-3 text-muted-foreground">{d.lang?.toUpperCase()}</td>
                      <td className="p-3 text-muted-foreground">
                        {d.doc_type === 'law' ? 'Gesetz' : 
                         d.doc_type === 'guideline' ? 'Richtlinie' : 
                         'Produktdokumentation'}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(d.created_at).toLocaleDateString('de-DE')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
