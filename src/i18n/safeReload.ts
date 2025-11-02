import i18n from '@/i18n/init';

export async function safeReload(namespaces?: string[] | string) {
  const lngs = i18n.languages?.length ? i18n.languages : [i18n.resolvedLanguage || i18n.language || 'de'];
  const ns   = namespaces || (Array.isArray(i18n.options.ns) ? i18n.options.ns : [i18n.options.defaultNS || 'norrly']);
  await i18n.reloadResources(lngs, ns);
}
