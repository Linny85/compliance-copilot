import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, FileText } from "lucide-react";
import { format } from "date-fns";

interface DPIARecord {
  id: string;
  title: string;
  status: string;
  risk_level: string | null;
  process_name: string | null;
  vendor_name: string | null;
  created_at: string;
  due_at: string | null;
}

export default function DPIAList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [records, setRecords] = useState<DPIARecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [riskFilter, setRiskFilter] = useState<string>("");
  const [showNew, setShowNew] = useState(false);

  // New DPIA form
  const [newTitle, setNewTitle] = useState("");
  const [newScope, setNewScope] = useState<"process" | "vendor">("process");
  const [newScopeId, setNewScopeId] = useState("");

  useEffect(() => {
    loadRecords();
  }, [statusFilter, riskFilter, search]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (riskFilter) params.risk = riskFilter;
      if (search) params.search = search;

      const { data, error } = await supabase.functions.invoke("dpia-list", {
        body: params,
      });

      if (error) throw error;
      setRecords(data.items || []);
    } catch (err: any) {
      toast({ title: "Error loading DPIAs", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }

    try {
      const payload: any = { title: newTitle };
      if (newScope === "process" && newScopeId) payload.process_id = newScopeId;
      if (newScope === "vendor" && newScopeId) payload.vendor_id = newScopeId;

      const { data, error } = await supabase.functions.invoke("dpia-create", { body: payload });

      if (error) throw error;
      toast({ title: "DPIA created" });
      setShowNew(false);
      setNewTitle("");
      setNewScopeId("");
      navigate(`/privacy/dpia/${data.record.id}`);
    } catch (err: any) {
      toast({ title: "Error creating DPIA", description: err.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "secondary",
      submitted: "default",
      in_review: "default",
      scored: "default",
      approved: "default",
      rejected: "destructive",
      archived: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getRiskBadge = (risk: string | null) => {
    if (!risk) return <span className="text-muted-foreground">-</span>;
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      low: "default",
      med: "secondary",
      high: "destructive",
      critical: "destructive",
    };
    return <Badge variant={variants[risk] || "outline"}>{risk}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Data Protection Impact Assessments (DPIA)
          </CardTitle>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New DPIA
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New DPIA</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="DPIA Title" />
                </div>
                <div>
                  <Label>Scope</Label>
                  <Select value={newScope} onValueChange={(v: any) => setNewScope(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="process">Process</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Scope ID (optional)</Label>
                  <Input value={newScopeId} onChange={(e) => setNewScopeId(e.target.value)} placeholder="UUID" />
                </div>
                <Button onClick={handleCreate} className="w-full">
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search DPIAs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="scored">Scored</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="med">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Process</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No DPIAs found
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((rec) => (
                    <TableRow key={rec.id} className="cursor-pointer" onClick={() => navigate(`/privacy/dpia/${rec.id}`)}>
                      <TableCell className="font-medium">{rec.title}</TableCell>
                      <TableCell>{getStatusBadge(rec.status)}</TableCell>
                      <TableCell>{getRiskBadge(rec.risk_level)}</TableCell>
                      <TableCell>{rec.process_name || "-"}</TableCell>
                      <TableCell>{rec.vendor_name || "-"}</TableCell>
                      <TableCell>
                        {rec.due_at ? (
                          <div className="flex items-center gap-2">
                            {format(new Date(rec.due_at), 'PPP')}
                            {new Date(rec.due_at) < new Date() && rec.status !== "approved" && rec.status !== "archived" && (
                              <Badge variant="destructive" className="text-xs">Overdue</Badge>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
