export function contextHint(route: string): string {
  if (route.startsWith('/organization')) {
    return 'Kontext: Organisation bearbeiten, Edit-Token (10 Min), Master-Passwort-Flow.';
  }
  if (route.startsWith('/admin')) {
    return 'Kontext: Administration (Users, Subscription, Compliance, QA, Wissensgraph).';
  }
  if (route.startsWith('/documents')) {
    return 'Kontext: Dokumente – Sheet-Flow für „Neues Dokument erstellen".';
  }
  return '';
}
