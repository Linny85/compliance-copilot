import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export function VerifyByCodeDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const extractCode = (input: string): string => {
    // Extract code from URL like verify.norrland-innovate.com/cert/CODE or just CODE
    const match = input.trim().match(/[A-Za-z0-9]{6,}/);
    return match?.[0] || '';
  };

  const handleSubmit = async () => {
    const code = extractCode(value);
    if (!code) {
      toast.error('Bitte geben Sie einen gültigen Code ein');
      return;
    }

    setIsVerifying(true);
    try {
      // TODO: Implement actual verification API call
      // const response = await api.certs.verifyCode(code);
      
      // Mock verification for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Zertifikat erfolgreich verifiziert');
      setOpen(false);
      setValue('');
    } catch (error) {
      toast.error('Verifizierung fehlgeschlagen. Bitte überprüfen Sie den Code.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CheckCircle className="h-4 w-4 mr-2" />
          {t('training.actions.verifyByCode')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('training.verifyDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('training.verifyDialog.placeholder')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t('training.verifyDialog.placeholder')}
            className="w-full"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isVerifying}
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={isVerifying || !value.trim()}>
              {isVerifying ? t('common.loading') : t('training.verifyDialog.submit')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
