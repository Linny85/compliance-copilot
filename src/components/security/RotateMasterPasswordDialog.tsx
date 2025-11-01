import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface RotateMasterPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RotateMasterPasswordDialog({ open, onClose, onSuccess }: RotateMasterPasswordDialogProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Die neuen Passwörter stimmen nicht überein");
      return;
    }

    if (newPassword.length < 10) {
      setError("Das neue Passwort muss mindestens 10 Zeichen lang sein");
      return;
    }

    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('rotate-master-code', {
        body: { oldPassword, newPassword }
      });

      if (fnError) throw fnError;

      if (data?.error) {
        if (data.error === 'invalid_old_password') {
          setError(`Altes Passwort ist falsch. ${data.attempts_remaining !== undefined ? `Verbleibende Versuche: ${data.attempts_remaining}` : ''}`);
        } else if (data.error === 'locked') {
          setError('Zu viele Fehlversuche. Konto ist vorübergehend gesperrt.');
        } else if (data.error === 'weak_password') {
          setError('Das neue Passwort ist zu schwach');
        } else {
          setError('Fehler beim Ändern des Passworts');
        }
        return;
      }

      toast.success("Master-Passwort erfolgreich geändert. Alle aktiven Bearbeitungssitzungen wurden beendet.");
      handleClose();
      onSuccess();
    } catch (err) {
      console.error('Rotation error:', err);
      setError('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Master-Passwort ändern</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="old-password">Aktuelles Master-Passwort</Label>
              <Input
                id="old-password"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Aktuelles Passwort eingeben"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Neues Master-Passwort</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Neues Passwort (min. 10 Zeichen)"
                required
                disabled={loading}
                minLength={10}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Neues Passwort bestätigen</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Neues Passwort wiederholen"
                required
                disabled={loading}
                minLength={10}
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Passwort ändern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
