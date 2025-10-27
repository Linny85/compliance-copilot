// Event-basierte Router-Bridge, damit globale Komponenten (außerhalb des Routers)
// Navigation auslösen können, ohne useNavigate() direkt zu benutzen.
export type NavigationEvent = {
  path: string;
  replace?: boolean;
};

export const navigateGlobal = (path: string, replace = false) => {
  window.dispatchEvent(
    new CustomEvent<NavigationEvent>('norrly:navigate', { detail: { path, replace } })
  );
};
