import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function IncidentNew() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Titel ist erforderlich');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Nicht angemeldet');
        return;
      }

      // Get company_id from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!profile?.company_id) {
        toast.error('Keine Firma zugeordnet');
        return;
      }

      const { error } = await supabase
        .from('security_incidents')
        .insert({
          company_id: profile.company_id,
          title: title.trim(),
          description: description.trim() || null,
          severity,
          status: 'open'
        });

      if (error) throw error;

      toast.success('Sicherheitsvorfall erfolgreich gemeldet');
      navigate('/incidents');
    } catch (error: any) {
      console.error('[IncidentNew] Error:', error);
      toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Sicherheitsvorfall melden</CardTitle>
          <CardDescription>
            Erfassen Sie einen neuen Sicherheitsvorfall für Ihre Organisation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">
                Titel des Vorfalls <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="z. B. Unbefugter Zugriff auf Kundendaten"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                rows={6}
                placeholder="Was ist passiert? Welche Systeme/Personen sind betroffen?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Schweregrad</Label>
              <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
                <SelectTrigger id="severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Niedrig</SelectItem>
                  <SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="high">Hoch</SelectItem>
                  <SelectItem value="critical">Kritisch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? 'Wird gemeldet...' : 'Vorfall melden'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/incidents')}
              >
                Abbrechen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
