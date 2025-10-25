/**
 * Custom ESLint plugin for Norrland form validation
 * Checks for proper id/name and autocomplete attributes on form controls
 */
'use strict';

const hasAttr = (node, name) =>
  node.openingElement.attributes?.some(a =>
    a.type === 'JSXAttribute' && a.name?.name === name
  );

const getAttrValue = (node, name) => {
  const attr = node.openingElement.attributes?.find(a =>
    a.type === 'JSXAttribute' && a.name?.name === name
  );
  if (!attr) return null;
  if (!attr.value) return true; // boolean attr
  if (attr.value.type === 'Literal') return attr.value.value;
  if (attr.value.type === 'JSXExpressionContainer' && attr.value.expression.type === 'Literal')
    return attr.value.expression.value;
  return null;
};

module.exports = {
  rules: {
    // 1) Require at least id OR name on form controls
    'input-has-name-or-id': {
      meta: { 
        type: 'problem', 
        docs: { description: 'Require id or name on input-like controls' },
        messages: {
          missingIdOrName: '<{{tag}}> should have at least an "id" or "name" attribute.'
        }
      },
      create(context) {
        return {
          JSXOpeningElement(node) {
            const tag = node.name && node.name.name;
            if (!tag || !['input','select','textarea'].includes(tag)) return;

            const hasName = hasAttr({ openingElement: node }, 'name');
            const hasId   = hasAttr({ openingElement: node }, 'id');
            if (!(hasName || hasId)) {
              context.report({
                node,
                messageId: 'missingIdOrName',
                data: { tag }
              });
            }
          },
        };
      },
    },

    // 2) Encourage proper autocomplete on input fields
    'input-has-autocomplete': {
      meta: { 
        type: 'suggestion', 
        docs: { description: 'Encourage proper autocomplete on input fields' },
        messages: {
          missingSuggestion: '<input> is missing "autoComplete". Suggested value: "{{suggestion}}".',
          missingGeneric: '<input> is missing "autoComplete". Add a suitable value (or "off" if intentional).'
        }
      },
      create(context) {
        const mapByName = new Map(Object.entries({
          email: 'email',
          username: 'username',
          user: 'username',
          givenName: 'given-name',
          firstName: 'given-name',
          familyName: 'family-name',
          lastName: 'family-name',
          street: 'address-line1',
          city: 'address-level2',
          postalCode: 'postal-code',
          zip: 'postal-code',
          country: 'country',
          phone: 'tel',
          tel: 'tel',
          password: 'current-password',
          newPassword: 'new-password',
          organization: 'organization',
          company: 'organization',
          url: 'url',
        }));

        return {
          JSXOpeningElement(node) {
            const tag = node.name && node.name.name;
            if (tag !== 'input') return;

            const hasAuto = hasAttr({ openingElement: node }, 'autoComplete') || hasAttr({ openingElement: node }, 'autocomplete');
            if (hasAuto) return;

            // Heuristic: derive suggestion from name / id
            const n = (getAttrValue({ openingElement: node }, 'name') || getAttrValue({ openingElement: node }, 'id') || '')
              .toString().toLowerCase();

            let suggestion = null;
            for (const [k, v] of mapByName.entries()) {
              if (n.includes(k.toLowerCase())) { suggestion = v; break; }
            }

            context.report({
              node,
              messageId: suggestion ? 'missingSuggestion' : 'missingGeneric',
              data: { suggestion }
            });
          },
        };
      },
    },
  },
};
