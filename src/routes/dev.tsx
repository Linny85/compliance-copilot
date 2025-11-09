import { DevToolsPage } from '../dev/DevToolsPage';

export default function DevRoute() {
  if (!import.meta.env.DEV) return null;
  return <DevToolsPage />;
}
