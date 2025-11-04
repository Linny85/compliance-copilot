import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import IncidentTitleCombobox from '@/components/incidents/IncidentTitleCombobox';

const INCIDENT_SUGGEST: Record<string, { severity: 'low'|'medium'|'high'|'critical'; hint: string }> = {
  'Unbefugter Zugriff auf Kundendaten': {
    severity: 'high',
    hint: 'Unbefugter Zugriff auf personenbezogene Kundendaten festgestellt. Betroffene Systeme: ____. Zeitraum: ____. Mögliche Datensätze: ____.'
  },
  'Kontoübernahme / kompromittiertes Administratorkonto': {
    severity: 'critical',
    hint: 'Administratorkonto kompromittiert. Erste verdächtige Aktivität am ____. Betroffene Systeme/Rechte: ____. Sofortmaßnahmen: Passwort-Reset, Session-Invalidation, MFA-Prüfung.'
  },
  'Datenexfiltration': {
    severity: 'critical',
    hint: 'Anzeichen für Datenabfluss über ____. Betroffene Datentypen: ____. Übertragungsumfang: ____. Quelle/Ziel: ____. Netzwerktraces vorhanden: __/Nein.'
  },
  'Ransomware-Befall mit Systemverschlüsselung': {
    severity: 'critical',
    hint: 'Systemverschlüsselung durch Ransomware erkannt. Betroffene Systeme: ____. Erstentdeckung: ____. Backup-Status: ____. IOC/Signatur: ____.'
  },
  'DDoS-Attacke auf Produktivsysteme': {
    severity: 'high',
    hint: 'Anhaltende DDoS-Attacke auf ____. Beginn: ____. Verkehrsprofil: ____. Mitigation: ____. Auswirkungen: ____.'
  },
  'Kritischer Dienst-/Systemausfall': {
    severity: 'high',
    hint: 'Kritischer Dienst ___ ausgefallen. Abhängigkeiten: ____. SLA-Auswirkung: ____. Workaround: ____.'
  },
  'Malware-Ausbruch im Unternehmensnetz': {
    severity: 'high',
    hint: 'Malware-Ausbreitung auf __ Hosts. Erster Fund: ____. Signatur/Variante: ____. Isolationsmaßnahmen: ____.'
  },
  'Unauthorized access to customer data': {
    severity: 'high',
    hint: 'Unauthorized access to personal customer data detected. Affected systems: ____. Timeframe: ____. Potential records: ____.'
  },
  'Account takeover / compromised admin account': {
    severity: 'critical',
    hint: 'Admin account compromised. First suspicious activity on ____. Affected systems/permissions: ____. Immediate actions: password reset, session invalidation, MFA check.'
  },
  'Data exfiltration': {
    severity: 'critical',
    hint: 'Evidence of data exfiltration via ____. Affected data types: ____. Transfer volume: ____. Source/destination: ____. Network traces available: __/No.'
  },
  'Ransomware infection with encryption': {
    severity: 'critical',
    hint: 'System encryption detected by ransomware. Affected systems: ____. First detected: ____. Backup status: ____. IOC/signature: ____.'
  },
  'DDoS attack on production systems': {
    severity: 'high',
    hint: 'Ongoing DDoS attack on ____. Start time: ____. Traffic profile: ____. Mitigation: ____. Impact: ____.'
  },
  'Critical service/system outage': {
    severity: 'high',
    hint: 'Critical service ___ failed. Dependencies: ____. SLA impact: ____. Workaround: ____.'
  },
  'Malware outbreak in corporate network': {
    severity: 'high',
    hint: 'Malware spread to __ hosts. First detection: ____. Signature/variant: ____. Isolation measures: ____.'
  },
  'Obehörig åtkomst till kunddata': {
    severity: 'high',
    hint: 'Obehörig åtkomst till personuppgifter i kunddata upptäckt. Berörda system: ____. Tidsperiod: ____. Möjliga dataposter: ____.'
  },
  'Kontokapning / komprometterat adminkonto': {
    severity: 'critical',
    hint: 'Administratörskonto komprometterat. Första misstänkta aktivitet den ____. Berörda system/rättigheter: ____. Omedelbara åtgärder: lösenordsåterställning, sessionsupphävning, MFA-kontroll.'
  },
  'Dataexfiltrering': {
    severity: 'critical',
    hint: 'Tecken på dataläckage via ____. Berörda datatyper: ____. Överföringsvolym: ____. Källa/mål: ____. Nätverksspår tillgängliga: __/Nej.'
  },
  'Ransomware-infektion med kryptering': {
    severity: 'critical',
    hint: 'Systemkryptering upptäckt av ransomware. Berörda system: ____. Första upptäckt: ____. Backup-status: ____. IOC/signatur: ____.'
  },
  'DDoS-attack mot produktionssystem': {
    severity: 'high',
    hint: 'Pågående DDoS-attack mot ____. Starttid: ____. Trafikprofil: ____. Mitigation: ____. Påverkan: ____.'
  },
  'Kritiskt tjänst-/systemavbrott': {
    severity: 'high',
    hint: 'Kritisk tjänst ___ har fallit. Beroenden: ____. SLA-påverkan: ____. Workaround: ____.'
  },
  'Skadlig kod-utbrott i företagsnätet': {
    severity: 'high',
    hint: 'Malware spridning till __ värdar. Första upptäckt: ____. Signatur/variant: ____. Isoleringsåtgärder: ____.'
  }
};

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
            <IncidentTitleCombobox
              value={title}
              onChange={(v) => {
                setTitle(v);
                const s = INCIDENT_SUGGEST[v];
                if (s) {
                  // Nur vorschlagen, falls Feld noch leer bzw. unverändert
                  setSeverity((prev) => prev === 'medium' ? s.severity : prev);
                  setDescription((prev) => prev?.trim() ? prev : s.hint);
                }
              }}
            />

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
