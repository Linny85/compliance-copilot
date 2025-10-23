import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, AlertTriangle, Info } from "lucide-react";

interface Control {
  id: string;
  code: string;
  title: string;
  objective: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence_types: string[];
  frameworks: {
    code: string;
    title: string;
    version: string;
  };
}

export default function Controls() {
  const { t } = useTranslation(["common"]);
  const [controls, setControls] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadControls();
  }, []);

  const loadControls = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-controls', {
        body: {},
      });

      if (error) throw error;
      setControls(data.controls || []);
    } catch (error) {
      console.error("Failed to load controls:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityVariant = (severity: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      low: "outline",
      medium: "secondary",
      high: "default",
      critical: "destructive",
    };
    return variants[severity] || "outline";
  };

  const getSeverityIcon = (severity: string) => {
    const icons: Record<string, JSX.Element> = {
      low: <Info className="h-4 w-4" />,
      medium: <AlertCircle className="h-4 w-4" />,
      high: <AlertTriangle className="h-4 w-4" />,
      critical: <AlertTriangle className="h-4 w-4" />,
    };
    return icons[severity] || null;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("common.controls", "Controls")}</h1>
          <p className="text-muted-foreground">
            {t("common.controlsDesc", "Framework controls and requirements")}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("common.availableControls", "Available Controls")}</CardTitle>
          <CardDescription>
            {t("common.availableControlsDesc", "Compliance controls from frameworks like NIS2, ISO 27001, and DORA")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>{t("common.loading")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.code", "Code")}</TableHead>
                  <TableHead>{t("common.title", "Title")}</TableHead>
                  <TableHead>{t("common.framework", "Framework")}</TableHead>
                  <TableHead>{t("common.severity", "Severity")}</TableHead>
                  <TableHead>{t("common.evidenceTypes", "Evidence Types")}</TableHead>
                  <TableHead>{t("common.actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {controls.map((control) => (
                  <TableRow key={control.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      {control.code}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{control.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {control.objective}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {control.frameworks.code} {control.frameworks.version}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={getSeverityVariant(control.severity)}
                        className="gap-1"
                      >
                        {getSeverityIcon(control.severity)}
                        {control.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {control.evidence_types.slice(0, 3).map((type) => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                        {control.evidence_types.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{control.evidence_types.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        {t("common.createPolicy", "Create Policy")}
                      </Button>
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
