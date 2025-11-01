import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MasterPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (editToken: string) => void;
}

export function MasterPasswordDialog({ open, onClose, onSuccess }: MasterPasswordDialogProps) {
  const { t } = useTranslation(['organization', 'common']);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: invokeError } = await supabase.functions.invoke('verify-master-pass', {
        body: { password }
      });

      if (invokeError) {
        setError(t('organization:master.error', 'Verification failed'));
        return;
      }

      if (data?.ok && data?.editToken) {
        onSuccess(data.editToken);
        setPassword('');
        handleClose();
      } else {
        setError(t('organization:master.fail', 'Invalid master password'));
      }
    } catch (err: any) {
      setError(err.message || t('organization:master.error', 'Verification failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('organization:master.title', 'Master Password')}</DialogTitle>
          <DialogDescription>
            {t('organization:master.desc', 'Enter the master password to edit organization details.')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="password"
              placeholder={t('organization:master.placeholder', 'Master password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={loading || !password.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common:verifying', 'Verifying...')}
                </>
              ) : (
                t('organization:master.confirm', 'Confirm')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
