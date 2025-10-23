import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";

interface EvidenceRequest {
  id: string;
  title: string;
  description?: string;
  due_at?: string;
  status: string;
  created_at: string;
  control_id: string;
}

interface Evidence {
  id: string;
  file_path: string;
  file_size: number;
  mime_type?: string;
  verdict: string;
  uploaded_at: string;
  reviewed_at?: string;
  note?: string;
  control_id: string;
}

// SHA-256 hash helper
async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function EvidencePage() {
  const { t } = useTranslation(["evidence", "common"]);
  const { toast } = useToast();
  const [requests, setRequests] = useState<EvidenceRequest[]>([]);
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newControlId, setNewControlId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadControlId, setUploadControlId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [reviewVerdict, setReviewVerdict] = useState<string>("pass");
  const [reviewNote, setReviewNote] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqRes, evRes] = await Promise.all([
        supabase.from("evidence_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("evidences").select("*").order("uploaded_at", { ascending: false }),
      ]);

      if (reqRes.error) throw reqRes.error;
      if (evRes.error) throw evRes.error;

      setRequests(reqRes.data || []);
      setEvidences(evRes.data || []);
    } catch (error) {
      console.error("Failed to load evidence data:", error);
      toast({
        title: t("evidence:errors.create_failed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!newTitle.trim() || !newControlId) return;

    try {
      const { error } = await supabase.functions.invoke("create-evidence-request", {
        body: {
          control_id: newControlId,
          title: newTitle.trim(),
          description: newDescription.trim() || null,
        },
      });

      if (error) throw error;

      toast({ title: t("evidence:success.request_created") });
      setRequestDialogOpen(false);
      setNewTitle("");
      setNewDescription("");
      setNewControlId("");
      loadData();
    } catch (error: any) {
      console.error("Failed to create request:", error);
      toast({
        title: t("evidence:errors.create_failed"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadControlId) return;

    setUploading(true);
    try {
      // 1. Get presigned upload URL
      const { data: urlData, error: urlError } = await supabase.functions.invoke("get-upload-url", {
        body: {
          control_id: uploadControlId,
          filename: uploadFile.name,
        },
      });

      if (urlError) throw urlError;

      // 2. Upload file directly to storage
      const uploadRes = await fetch(urlData.signedUrl, {
        method: 'PUT',
        body: uploadFile,
        headers: {
          'Content-Type': uploadFile.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload failed: ${uploadRes.statusText}`);
      }

      // 3. Calculate hash and submit evidence
      const hash = await sha256Hex(uploadFile);

      const { error: submitError } = await supabase.functions.invoke("submit-evidence", {
        body: {
          control_id: uploadControlId,
          file_path: urlData.path,
          file_size: uploadFile.size,
          mime_type: uploadFile.type,
          hash_sha256: hash,
        },
      });

      if (submitError) throw submitError;

      toast({ title: t("evidence:success.uploaded") });
      setUploadDialogOpen(false);
      setUploadFile(null);
      setUploadControlId("");
      loadData();
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast({
        title: t("evidence:errors.upload_failed"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedEvidence || !reviewVerdict) return;

    try {
      const { error } = await supabase.functions.invoke("review-evidence", {
        body: {
          evidence_id: selectedEvidence.id,
          verdict: reviewVerdict,
          note: reviewNote.trim() || null,
        },
      });

      if (error) throw error;

      toast({ title: t("evidence:success.review_saved") });
      setReviewDialogOpen(false);
      setSelectedEvidence(null);
      setReviewNote("");
      loadData();
    } catch (error: any) {
      console.error("Review failed:", error);
      toast({
        title: t("evidence:errors.review_failed"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      fulfilled: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      expired: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    };
    return colors[status] || colors.open;
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case "pass":
        return <CheckCircle2 className="h-4 w-4" />;
      case "fail":
        return <XCircle className="h-4 w-4" />;
      case "warn":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getVerdictColor = (verdict: string) => {
    const colors: Record<string, string> = {
      pending: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
      pass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      fail: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      warn: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    };
    return colors[verdict] || colors.pending;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("evidence:title")}</h1>
          <p className="text-muted-foreground mt-2">{t("evidence:subtitle")}</p>
        </div>
      </div>

      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList>
          <TabsTrigger value="requests">{t("evidence:tabs.requests")}</TabsTrigger>
          <TabsTrigger value="evidence">{t("evidence:tabs.evidence")}</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  {t("evidence:actions.newRequest")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("evidence:actions.newRequest")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{t("evidence:fields.control")}</Label>
                    <Input
                      value={newControlId}
                      onChange={(e) => setNewControlId(e.target.value)}
                      placeholder="Control UUID"
                    />
                  </div>
                  <div>
                    <Label>{t("evidence:fields.title")}</Label>
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder={t("evidence:fields.title")}
                    />
                  </div>
                  <div>
                    <Label>{t("evidence:fields.description")}</Label>
                    <Textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleCreateRequest} className="w-full">
                    {t("common:save")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t("common:loading")}</p>
            </div>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t("evidence:empty.noRequests")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {requests.map((req) => (
                <Card key={req.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <CardTitle className="text-xl">{req.title}</CardTitle>
                        {req.description && (
                          <p className="text-sm text-muted-foreground">{req.description}</p>
                        )}
                        <Badge className={getStatusColor(req.status)}>
                          {t(`evidence:status.${req.status}`)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="evidence" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  {t("evidence:actions.upload")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("evidence:actions.upload")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{t("evidence:fields.control")}</Label>
                    <Input
                      value={uploadControlId}
                      onChange={(e) => setUploadControlId(e.target.value)}
                      placeholder="Control UUID"
                    />
                  </div>
                  <div>
                    <Label>{t("evidence:fields.file")}</Label>
                    <Input
                      type="file"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <Button onClick={handleUpload} disabled={uploading} className="w-full">
                    {uploading ? t("common:loading") : t("evidence:actions.upload")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t("common:loading")}</p>
            </div>
          ) : evidences.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t("evidence:empty.noEvidence")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {evidences.map((ev) => (
                <Card key={ev.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={getVerdictColor(ev.verdict)}>
                            <span className="flex items-center gap-1">
                              {getVerdictIcon(ev.verdict)}
                              {t(`evidence:verdict.${ev.verdict}`)}
                            </span>
                          </Badge>
                        </div>
                        <p className="text-sm font-mono text-muted-foreground">
                          {ev.file_path.split('/').pop()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(ev.file_size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <Dialog
                        open={reviewDialogOpen && selectedEvidence?.id === ev.id}
                        onOpenChange={(open) => {
                          setReviewDialogOpen(open);
                          if (open) setSelectedEvidence(ev);
                          else setSelectedEvidence(null);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            {t("evidence:actions.review")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t("evidence:actions.review")}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>{t("evidence:fields.verdict")}</Label>
                              <Select value={reviewVerdict} onValueChange={setReviewVerdict}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pass">{t("evidence:verdict.pass")}</SelectItem>
                                  <SelectItem value="fail">{t("evidence:verdict.fail")}</SelectItem>
                                  <SelectItem value="warn">{t("evidence:verdict.warn")}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>{t("evidence:fields.note")}</Label>
                              <Textarea
                                value={reviewNote}
                                onChange={(e) => setReviewNote(e.target.value)}
                                rows={3}
                              />
                            </div>
                            <Button onClick={handleReview} className="w-full">
                              {t("common:save")}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
