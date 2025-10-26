import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Upload } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateTrainingCertificate } from '@/hooks/useTrainingCertificates';
import type { CreateTrainingCertificateInput } from '@/types/training';
import { useTranslation } from 'react-i18next';

interface FormData {
  title: string;
  provider: string;
  date_completed: string;
  file: FileList;
  training_tag?: string;
  verification_code?: string;
}

export function UploadCertificateDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<FormData>();
  const createMutation = useCreateTrainingCertificate();
  const selectedTrainingTag = watch('training_tag');
  const selectedFile = watch('file');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      setValue('file', dataTransfer.files);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!data.file?.[0]) return;

    const input: CreateTrainingCertificateInput = {
      title: data.title,
      provider: data.provider,
      date_completed: data.date_completed,
      file: data.file[0],
      training_tag: data.training_tag,
      verification_code: data.verification_code,
    };

    await createMutation.mutateAsync(input);
    reset();
    setOpen(false);
  };

  const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          {t('training.actions.upload')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('training.uploadTitle')}</DialogTitle>
          <DialogDescription>
            {t('training.uploadDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Drag & Drop Zone */}
          <div
            className={`relative flex h-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              {...register('file', {
                required: 'Bitte Datei auswählen',
                validate: {
                  fileType: (files) => {
                    const file = files?.[0];
                    if (!file) return true;
                    if (!ALLOWED_TYPES.includes(file.type)) {
                      return 'Nur PDF, PNG oder JPG erlaubt';
                    }
                    return true;
                  },
                  fileSize: (files) => {
                    const file = files?.[0];
                    if (!file) return true;
                    if (file.size > MAX_SIZE) {
                      return 'Datei zu groß (max. 10MB)';
                    }
                    return true;
                  },
                },
              })}
            />
            {selectedFile?.[0] ? (
              <div className="text-center">
                <p className="text-sm font-medium">{selectedFile[0].name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(selectedFile[0].size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">{t('training.dropZone')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('training.acceptedFormats')}</p>
              </div>
            )}
          </div>
          {errors.file && (
            <p className="text-sm text-destructive">{errors.file.message}</p>
          )}

          <div>
            <Label htmlFor="training_tag">Schulung auswählen (optional)</Label>
            <Select onValueChange={(value) => setValue('training_tag', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Wählen Sie eine Schulung" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nis2_basics">NIS2 Grundlagen</SelectItem>
                <SelectItem value="ai_act_awareness">EU AI Act Awareness</SelectItem>
                <SelectItem value="gdpr_basics">DSGVO Basis</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="title">Kurstitel *</Label>
            <Input
              id="title"
              {...register('title', { required: 'Bitte Titel angeben' })}
              placeholder="z.B. NIS2 Grundlagen"
            />
            {errors.title && (
              <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="provider">Anbieter *</Label>
            <Input
              id="provider"
              {...register('provider', { required: 'Bitte Anbieter angeben' })}
              placeholder="z.B. Norrland Innovate"
            />
            {errors.provider && (
              <p className="text-sm text-destructive mt-1">{errors.provider.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="date_completed">Abschlussdatum *</Label>
            <Input
              id="date_completed"
              type="date"
              {...register('date_completed', { required: 'Bitte Datum angeben' })}
            />
            {errors.date_completed && (
              <p className="text-sm text-destructive mt-1">{errors.date_completed.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="verification_code">Verifizierungscode (optional)</Label>
            <Input
              id="verification_code"
              {...register('verification_code')}
              placeholder="z.B. ABCDEF123456"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Wenn vorhanden, wird das Zertifikat automatisch verifiziert
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createMutation.isPending}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Wird hochgeladen...' : 'Hochladen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
