import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t, ready } = useTranslation(['organization', 'common']);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!ready) return null;

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
      setError(t('organization:master.passwordMismatch', 'Passwords do not match'));
      return;
    }

    if (newPassword.length < 10) {
      setError(t('organization:master.weakPassword', 'Password must be at least 10 characters long'));
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
          const msg = t('organization:master.invalid', 'Invalid password');
          setError(data.attempts_remaining !== undefined ? `${msg} (${data.attempts_remaining} ${t('common:attemptsRemaining', 'attempts remaining')})` : msg);
        } else if (data.error === 'locked') {
          setError(t('organization:master.locked', 'Too many failed attempts. Account temporarily locked.'));
        } else if (data.error === 'weak_password') {
          setError(t('organization:master.weakPassword', 'Password is too weak'));
        } else {
          setError(t('organization:master.error', 'Failed to change password'));
        }
        return;
      }

      toast.success(t('organization:master.rotateSuccess', 'Master password changed successfully. All active editing sessions have been terminated.'));
      handleClose();
      onSuccess();
    } catch (err) {
      console.error('Rotation error:', err);
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
            <DialogTitle>{t('organization:master.rotateTitle', 'Change Master Password')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="old-password">{t('organization:master.currentPassword', 'Current Master Password')}</Label>
              <Input
                id="old-password"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder={t('organization:master.currentPasswordPlaceholder', 'Enter current password')}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">{t('organization:master.newPassword', 'New Master Password')}</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('organization:master.newPasswordPlaceholder', 'New password (min. 10 characters)')}
                required
                disabled={loading}
                minLength={10}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t('organization:master.confirmPassword', 'Confirm New Password')}</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('organization:master.confirmPasswordPlaceholder', 'Repeat new password')}
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
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('organization:master.rotate', 'Change Password')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
