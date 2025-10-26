import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface AuditTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  report_generated_at: string | null;
  created_at: string;
}

export default function AuditTasks() {
  const [tasks, setTasks] = useState<AuditTask[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      const { data, error } = await supabase
        .from("audit_tasks")
        .select("id, title, status, priority, due_date, report_generated_at, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Failed to load audit tasks:", error);
      toast.error("Failed to load audit tasks");
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string): "default" | "secondary" | "destructive" | "outline" {
    const colors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "outline",
      "in-progress": "secondary",
      completed: "default",
      cancelled: "destructive",
    };
    return colors[status] || "outline";
  }

  function getPriorityColor(priority: string): "default" | "secondary" | "destructive" {
    const colors: Record<string, "default" | "secondary" | "destructive"> = {
      low: "secondary",
      medium: "default",
      high: "destructive",
    };
    return colors[priority] || "default";
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Audit Tasks</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Audit Tasks</h1>
          <p className="text-muted-foreground mt-2">Post-implementation reviews and compliance audits</p>
        </div>
        <Button onClick={() => navigate("/audit/new")}>
          <Plus className="w-4 h-4 mr-2" />
          New Audit Task
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tasks</CardTitle>
          <CardDescription>{tasks.length} audit tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Report</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/audit/${task.id}`)}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(task.status)}>{task.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    {task.due_date ? (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}</span>
                      </div>
                    ) : (
                      "–"
                    )}
                  </TableCell>
                  <TableCell>
                    {task.report_generated_at ? (
                      <Badge variant="outline" className="gap-1">
                        <FileText className="w-3 h-3" />
                        Generated
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">No report</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/audit/${task.id}`); }}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
