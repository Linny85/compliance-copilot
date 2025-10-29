import { useState, useEffect } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Building2, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Vendor {
  id: string;
  name: string;
  category: string;
  criticality: string;
  status: string;
  latest_status: string;
  latest_risk: string;
  latest_score: string;
}

export default function Vendors() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  
  // Onboarding dialog
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: "",
    category: "SaaS",
    criticality: "med"
  });

  useEffect(() => {
    loadVendors();
  }, [search, statusFilter, riskFilter]);

  const loadVendors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (riskFilter) params.set('risk', riskFilter);

      const { data, error } = await supabase.functions.invoke('vendors-list', {
        body: { params: Object.fromEntries(params) }
      });

      if (error) throw error;
      setVendors(data?.vendors ?? []);
    } catch (error: any) {
      console.error('Error loading vendors:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboard = async () => {
    if (!newVendor.name) {
      toast.error(t('vendors.error.name_required'));
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('vendors-onboard', {
        body: newVendor
      });

      if (error) throw error;
      
      toast.success(t('vendors.success.onboarded'));
      setOnboardOpen(false);
      setNewVendor({ name: "", category: "SaaS", criticality: "med" });
      loadVendors();
      
      // Navigate to new vendor
      if (data?.vendor?.id) {
        navigate(`/vendors/${data.vendor.id}`);
      }
    } catch (error: any) {
      console.error('Error onboarding vendor:', error);
      toast.error(error.message);
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'low':
        return <Badge variant="secondary">{t('vendors.risk.low')}</Badge>;
      case 'med':
        return <Badge variant="default">{t('vendors.risk.med')}</Badge>;
      case 'high':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{t('vendors.risk.high')}</Badge>;
      case 'critical':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{t('vendors.risk.critical')}</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('vendors.title')}</h1>
          <p className="text-muted-foreground">{t('vendors.subtitle')}</p>
        </div>
        
        <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('vendors.action.onboard')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('vendors.dialog.onboard_title')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t('vendors.field.name')}</label>
                <Input
                  value={newVendor.name}
                  onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                  placeholder={t('vendors.field.name_placeholder')}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">{t('vendors.field.category')}</label>
                <Select value={newVendor.category} onValueChange={(v) => setNewVendor({ ...newVendor, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SaaS">SaaS</SelectItem>
                    <SelectItem value="IaaS">IaaS</SelectItem>
                    <SelectItem value="Consulting">Consulting</SelectItem>
                    <SelectItem value="DataProcessor">Data Processor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">{t('vendors.field.criticality')}</label>
                <Select value={newVendor.criticality} onValueChange={(v) => setNewVendor({ ...newVendor, criticality: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('vendors.criticality.low')}</SelectItem>
                    <SelectItem value="med">{t('vendors.criticality.med')}</SelectItem>
                    <SelectItem value="high">{t('vendors.criticality.high')}</SelectItem>
                    <SelectItem value="critical">{t('vendors.criticality.critical')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={handleOnboard} className="w-full">{t('vendors.action.save')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('vendors.search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('vendors.filter.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('vendors.filter.all')}</SelectItem>
              <SelectItem value="new">{t('vendors.status.new')}</SelectItem>
              <SelectItem value="in_review">{t('vendors.status.in_review')}</SelectItem>
              <SelectItem value="approved">{t('vendors.status.approved')}</SelectItem>
              <SelectItem value="restricted">{t('vendors.status.restricted')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('vendors.filter.risk')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('vendors.filter.all')}</SelectItem>
              <SelectItem value="low">{t('vendors.risk.low')}</SelectItem>
              <SelectItem value="med">{t('vendors.risk.med')}</SelectItem>
              <SelectItem value="high">{t('vendors.risk.high')}</SelectItem>
              <SelectItem value="critical">{t('vendors.risk.critical')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">{t('common:loading')}</div>
        ) : vendors.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{t('vendors.empty')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('vendors.field.name')}</TableHead>
                <TableHead>{t('vendors.field.category')}</TableHead>
                <TableHead>{t('vendors.field.criticality')}</TableHead>
                <TableHead>{t('vendors.field.status')}</TableHead>
                <TableHead>{t('vendors.field.risk')}</TableHead>
                <TableHead>{t('vendors.field.score')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((vendor) => (
                <TableRow
                  key={vendor.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/vendors/${vendor.id}`)}
                >
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell>{vendor.category}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{t(`vendors.criticality.${vendor.criticality}`)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t(`vendors.status.${vendor.status}`)}</Badge>
                  </TableCell>
                  <TableCell>{getRiskBadge(vendor.latest_risk)}</TableCell>
                  <TableCell>{vendor.latest_score ? `${(parseFloat(vendor.latest_score) * 100).toFixed(0)}%` : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
