/**
 * Codemod to add missing form attributes (name, id, autoComplete)
 * Usage: npx jscodeshift -t codemods/add-form-attrs.js "src/**/*.{tsx,jsx,ts,js}"
 * 
 * Heuristics:
 * - If name missing but id exists -> name=id
 * - If id missing but name exists -> id=name
 * - If both missing -> derive from placeholder or use line number
 * - autoComplete derived from name/id mapping, defaults to "off"
 */

const autocompleteMap = {
  email: 'email',
  username: 'username',
  user: 'username',
  givenname: 'given-name',
  firstname: 'given-name',
  familyname: 'family-name',
  lastname: 'family-name',
  street: 'address-line1',
  city: 'address-level2',
  postalcode: 'postal-code',
  zip: 'postal-code',
  country: 'country',
  phone: 'tel',
  tel: 'tel',
  password: 'current-password',
  newpassword: 'new-password',
  organization: 'organization',
  company: 'organization',
  url: 'url',
};

module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  const guessAutocomplete = (val = '') => {
    const key = String(val).toLowerCase();
    for (const k of Object.keys(autocompleteMap)) {
      if (key.includes(k)) return autocompleteMap[k];
    }
    return 'off'; // conservative default
  };

  root.find(j.JSXOpeningElement, { name: { type: 'JSXIdentifier', name: 'input' }})
    .forEach(path => {
      const attrs = path.node.attributes;

      const get = name => attrs.find(a => a.type === 'JSXAttribute' && a.name.name === name);
      const set = (name, value) => {
        attrs.push(j.jsxAttribute(
          j.jsxIdentifier(name), 
          typeof value === 'string' ? j.literal(value) : value
        ));
      };

      const nameAttr = get('name');
      const idAttr   = get('id');
      const acAttr   = get('autoComplete') || get('autocomplete');

      // Add missing id/name
      if (!nameAttr && idAttr) {
        set('name', idAttr.value);
      }
      if (!idAttr && nameAttr) {
        set('id', nameAttr.value);
      }

      if (!nameAttr && !idAttr) {
        // Try to use placeholder as base
        const ph = get('placeholder')?.value;
        const base = (ph && ph.type === 'Literal' && ph.value) 
          ? String(ph.value).replace(/\s+/g, '-').toLowerCase() 
          : `field-${path.node.loc?.start.line || 'x'}`;
        
        set('id', j.literal(base));
        set('name', j.literal(base));
      }

      // Add autocomplete if missing
      if (!acAttr) {
        const src = (get('name')?.value?.value) || (get('id')?.value?.value) || '';
        const guess = guessAutocomplete(src);
        set('autoComplete', j.literal(guess));
      }
    });

  return root.toSource({ quote: 'single' });
};
