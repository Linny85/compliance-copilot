import { useState } from 'react';
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

interface FormData {
  title: string;
  provider: string;
  date_completed: string;
  file: FileList;
  training_tag?: string;
}

export function UploadCertificateDialog() {
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<FormData>();
  const createMutation = useCreateTrainingCertificate();
  const selectedTrainingTag = watch('training_tag');

  const onSubmit = async (data: FormData) => {
    if (!data.file?.[0]) return;

    const input: CreateTrainingCertificateInput = {
      title: data.title,
      provider: data.provider,
      date_completed: data.date_completed,
      file: data.file[0],
      training_tag: data.training_tag,
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
          Zertifikat hochladen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schulungszertifikat hochladen</DialogTitle>
          <DialogDescription>
            Laden Sie Ihr Schulungszertifikat zur Prüfung hoch. Akzeptierte Formate: PDF, PNG, JPG (max. 10MB)
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <Label htmlFor="file">Zertifikat (PDF/Bild) *</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
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
            {errors.file && (
              <p className="text-sm text-destructive mt-1">{errors.file.message}</p>
            )}
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
