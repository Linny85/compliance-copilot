import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Brain, Network, Sparkles, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Relation {
  id: string;
  relation: string;
  weight: number;
  support_count: number;
  inferred: boolean;
  last_feedback: string | null;
  source_entity: {
    id: string;
    label: string;
    type: string;
    lang: string;
  };
  target_entity: {
    id: string;
    label: string;
    type: string;
    lang: string;
  };
}

interface InferenceLog {
  id: string;
  reasoning: string;
  created_at: string;
  entity_source: {
    label: string;
  };
  entity_target: {
    label: string;
  };
}

export default function GraphManager() {
  const { toast } = useToast();
  const [relations, setRelations] = useState<Relation[]>([]);
  const [inferenceLogs, setInferenceLogs] = useState<InferenceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [inferenceLoading, setInferenceLoading] = useState<string | null>(null);

  async function loadRelations() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("helpbot_relations")
        .select(`
          id,
          relation,
          weight,
          support_count,
          inferred,
          last_feedback,
          source_entity:source(id, label, type, lang),
          target_entity:target(id, label, type, lang)
        `)
        .order("weight", { ascending: false })
        .limit(100);

      if (error) throw error;
      setRelations(data as any ?? []);
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

  async function loadInferenceLogs() {
    try {
      const { data, error } = await supabase
        .from("helpbot_inference_logs")
        .select(`
          id,
          reasoning,
          created_at,
          entity_source:entity_source(label),
          entity_target:entity_target(label)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setInferenceLogs(data as any ?? []);
    } catch (error: any) {
      console.error("Error loading inference logs:", error);
    }
  }

  async function runInference(relationId: string) {
    setInferenceLoading(relationId);
    try {
      const { data, error } = await supabase.functions.invoke("helpbot-graph-learn", {
        body: { relation_id: relationId },
      });

      if (error) throw error;

      toast({
        title: "🧠 Inferenz erfolgreich",
        description: `${data.inferred ?? 0} neue Relationen generiert`,
      });

      await Promise.all([loadRelations(), loadInferenceLogs()]);
    } catch (error: any) {
      toast({
        title: "Inferenz fehlgeschlagen",
        description: error?.message ?? "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setInferenceLoading(null);
    }
  }

  useEffect(() => {
    loadRelations();
    loadInferenceLogs();
  }, []);

  const inferredRelations = relations.filter(r => r.inferred);
  const manualRelations = relations.filter(r => !r.inferred);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Network className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Graph Manager</h1>
            <p className="text-sm text-muted-foreground">
              Verwalten und analysieren Sie den Knowledge Graph
            </p>
          </div>
        </div>
        <Button onClick={() => { loadRelations(); loadInferenceLogs(); }} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Aktualisieren
        </Button>
      </div>

      <Tabs defaultValue="relations" className="w-full">
        <TabsList>
          <TabsTrigger value="relations">
            <Network className="h-4 w-4 mr-2" />
            Relationen ({relations.length})
          </TabsTrigger>
          <TabsTrigger value="inferred">
            <Sparkles className="h-4 w-4 mr-2" />
            Inferiert ({inferredRelations.length})
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Brain className="h-4 w-4 mr-2" />
            Inferenz-Logs ({inferenceLogs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="relations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alle Relationen</CardTitle>
              <CardDescription>
                Semantische Beziehungen im Knowledge Graph mit adaptiven Gewichtungen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : manualRelations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Keine Relationen vorhanden.
                </p>
              ) : (
                <div className="space-y-3">
                  {manualRelations.map((rel) => (
                    <div
                      key={rel.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono">
                            {rel.source_entity?.label}
                          </Badge>
                          <span className="text-sm text-muted-foreground">→</span>
                          <Badge variant="secondary">{rel.relation}</Badge>
                          <span className="text-sm text-muted-foreground">→</span>
                          <Badge variant="outline" className="font-mono">
                            {rel.target_entity?.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Gewicht: {rel.weight.toFixed(2)}</span>
                          <span>Support: {rel.support_count}</span>
                          <span>Sprache: {rel.source_entity?.lang?.toUpperCase()}</span>
                          {rel.last_feedback && (
                            <span>
                              Letztes Feedback: {new Date(rel.last_feedback).toLocaleDateString('de-DE')}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runInference(rel.id)}
                        disabled={inferenceLoading === rel.id}
                      >
                        {inferenceLoading === rel.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Analysiere...
                          </>
                        ) : (
                          <>
                            <Brain className="h-4 w-4 mr-2" />
                            Inferenz starten
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inferred" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Inferierte Relationen
              </CardTitle>
              <CardDescription>
                Automatisch abgeleitete Beziehungen durch Graph Learning
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inferredRelations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Noch keine inferierten Relationen. Starten Sie eine Inferenz bei einer Relation.
                </p>
              ) : (
                <div className="space-y-3">
                  {inferredRelations.map((rel) => (
                    <div
                      key={rel.id}
                      className="flex items-start justify-between p-4 border border-dashed border-primary/30 rounded-lg bg-primary/5"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono">
                            {rel.source_entity?.label}
                          </Badge>
                          <span className="text-sm text-muted-foreground">→</span>
                          <Badge variant="secondary">{rel.relation}</Badge>
                          <span className="text-sm text-muted-foreground">→</span>
                          <Badge variant="outline" className="font-mono">
                            {rel.target_entity?.label}
                          </Badge>
                          <Badge variant="default" className="ml-2">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Inferiert
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Gewicht: {rel.weight.toFixed(2)}</span>
                          <span>Support: {rel.support_count}</span>
                          <span>Sprache: {rel.source_entity?.lang?.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Inferenz-Protokolle
              </CardTitle>
              <CardDescription>
                Begründungen und Analysen der Graph-Learning-Engine
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inferenceLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Keine Inferenz-Protokolle vorhanden.
                </p>
              ) : (
                <div className="space-y-4">
                  {inferenceLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 border rounded-lg bg-card space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="font-mono">
                            {log.entity_source?.label}
                          </Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge variant="outline" className="font-mono">
                            {log.entity_target?.label}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString('de-DE')}
                        </span>
                      </div>
                      <div className="p-3 bg-muted/50 rounded text-sm leading-relaxed">
                        {log.reasoning}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
