import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { toast } from 'sonner';

interface CertificateDownloadButtonProps {
  filePath: string;
  title: string;
}

export function CertificateDownloadButton({ filePath, title }: CertificateDownloadButtonProps) {
  const { data: signedUrl, isLoading } = useSignedUrl('training-certificates', filePath);

  const handleDownload = () => {
    if (!signedUrl) {
      toast.error('Download-Link konnte nicht generiert werden');
      return;
    }
    window.open(signedUrl, '_blank');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDownload}
      disabled={isLoading || !signedUrl}
      title={`${title} herunterladen`}
      aria-label={`Zertifikat ${title} herunterladen`}
    >
      <Download className="h-4 w-4" />
    </Button>
  );
}
