import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertCircle, Info } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SetMasterPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SetMasterPasswordDialog({ open, onClose, onSuccess }: SetMasterPasswordDialogProps) {
  const { t, ready } = useTranslation(['organization', 'common']);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ready) return null;

  const handleClose = () => {
    setPassword("");
    setConfirmPassword("");
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    // Client-side validation
    if (password.length < 10) {
      setError(t('organization:master.weakPassword', 'Password must be at least 10 characters long'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('organization:master.passwordMismatch', 'Passwords do not match'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error: invokeError } = await supabase.functions.invoke('set-master-code', {
        body: { master: password },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
      });

      if (invokeError) {
        console.error('Set master password error:', invokeError);
        setError(t('organization:master.error', 'Failed to set master password'));
        return;
      }

      if (data?.error) {
        if (data.error === 'weak_password') {
          setError(t('organization:master.weakPassword', 'Password is too weak'));
        } else if (data.error === 'unauthorized') {
          setError(t('organization:master.unauthorized', 'You do not have permission to set the master password'));
        } else {
          setError(t('organization:master.error', 'Failed to set master password'));
        }
        return;
      }

      if (data?.ok) {
        toast.success(t('organization:master.setSuccess', 'Master password set successfully'));
        setPassword('');
        setConfirmPassword('');
        handleClose();
        onSuccess();
      } else {
        setError(t('organization:master.error', 'Failed to set master password'));
      }
    } catch (err) {
      console.error('Unexpected error setting master password:', err);
      setError(t('organization:master.error', 'An unexpected error occurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('organization:master.setTitle', 'Set Master Password')}</DialogTitle>
            <DialogDescription>
              {t('organization:master.setDesc', 'Create a master password to protect organization settings. This password will be required for all critical changes.')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {t('organization:master.requirements', 'Password must be at least 10 characters long. Store it securely - it cannot be recovered if lost.')}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="new-password">
                {t('organization:master.newPassword', 'Master Password')}
              </Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('organization:master.placeholder', 'Enter master password')}
                required
                disabled={loading}
                minLength={10}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">
                {t('organization:master.confirmPassword', 'Confirm Password')}
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('organization:master.confirmPlaceholder', 'Confirm master password')}
                required
                disabled={loading}
                minLength={10}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              {t('organization:actions.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('organization:master.set', 'Set Password')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
