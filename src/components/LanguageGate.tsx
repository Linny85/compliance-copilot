import { useTranslation } from 'react-i18next';

interface LanguageGateProps {
  children: React.ReactNode;
}

/**
 * LanguageGate prevents UI flickering by ensuring i18n is fully initialized
 * before rendering children. This is critical to avoid language switching loops.
 */
export function LanguageGate({ children }: LanguageGateProps) {
  const { ready } = useTranslation('common');
  
  // Don't render until i18n is ready
  if (!ready) {
    return null; // Or return a minimal skeleton/spinner
  }

  return <>{children}</>;
}
