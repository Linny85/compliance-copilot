export type AppMode = 'demo' | 'trial' | 'prod';

export function getAppMode(): AppMode {
  return (import.meta.env.VITE_APP_MODE as AppMode) || 'trial';
}

export const isDemo = () => getAppMode() === 'demo';
export const isTrial = () => getAppMode() === 'trial';
export const isProd = () => getAppMode() === 'prod';

// Komfort-Flags
export const isReadOnly = () => isDemo();               // Nur in Demo schreibgeschützt
export const shouldWatermark = () => isTrial();         // Trial erhält Wasserzeichen
export const canSendEmails = () => !isDemo();           // In Demo keine Mails
export const canGenerateDocs = () => !isDemo();         // Dokumente nur in Trial/Prod
