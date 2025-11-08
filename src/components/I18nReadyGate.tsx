import { useTranslation } from 'react-i18next';

export function I18nReadyGate({ ns, children }: { ns: string[]; children: React.ReactNode }) {
  const { ready } = useTranslation(ns, { useSuspense: false });
  if (!ready) return null;
  return <>{children}</>;
}
