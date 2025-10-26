import { useEffect, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, FileText, AlertTriangle, ShieldCheck } from "lucide-react";

interface Framework {
  code: string;
  title: string;
  version: string;
}

interface Control {
  id: string;
  code: string;
  title: string;
  objective: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence_types: string[];
  frameworks: Framework; // Backend returns 'frameworks' (singular object)
}

export default function Controls() {
  const { tx } = useI18n();
  const [controls, setControls] = useState<Control[]>([]);
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [selectedFramework, setSelectedFramework] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFrameworks();
    loadControls();
  }, [selectedFramework]);

  const loadFrameworks = async () => {
    try {
      const { data, error } = await supabase
        .from("frameworks")
        .select("code, title, version")
        .order("code");

      if (error) throw error;
      setFrameworks(data || []);
    } catch (error) {
      console.error("Failed to load frameworks:", error);
    }
  };

  const loadControls = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("list-controls", {
        body: {
          framework: selectedFramework === "all" ? undefined : selectedFramework,
          page: 1,
          pageSize: 100,
        },
      });

      if (error) throw error;
      setControls(data?.controls || []);
    } catch (error) {
      console.error("Failed to load controls:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string): string => {
    const colors: Record<string, string> = {
      low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    return colors[severity] || colors.low;
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === 'critical' || severity === 'high') {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <ShieldCheck className="h-4 w-4" />;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{tx("controls.title")}</h1>
          <p className="text-muted-foreground mt-2">
            {tx("controls.subtitle")}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{tx("controls.filters.title")}</CardTitle>
            <Select value={selectedFramework} onValueChange={setSelectedFramework}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={tx("controls.filters.allFrameworks")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tx("controls.filters.allFrameworks")}</SelectItem>
                {frameworks.map((fw) => (
                  <SelectItem key={fw.code} value={fw.code}>
                    {fw.code} - {fw.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{tx("common.loading")}</p>
        </div>
      ) : controls.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{tx("controls.empty.noControls")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {controls.map((control) => (
            <Card key={control.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono text-xs">
                        {control.code}
                      </Badge>
                      <Badge className={getSeverityColor(control.severity)}>
                        <span className="flex items-center gap-1">
                          {getSeverityIcon(control.severity)}
                          {tx(`common.severity.${control.severity}`)}
                        </span>
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">{control.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {control.frameworks?.code} - {control.frameworks?.title} ({control.frameworks?.version})
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    {tx("controls.actions.createPolicy")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">{tx("controls.labels.objective")}</h4>
                    <p className="text-sm text-muted-foreground">{control.objective}</p>
                  </div>
                  {control.evidence_types && control.evidence_types.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">{tx("controls.labels.evidenceTypes")}</h4>
                      <div className="flex flex-wrap gap-2">
                        {control.evidence_types.map((type) => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
