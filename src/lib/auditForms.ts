/**
 * Runtime form audit utility
 * Checks all form controls in the DOM for missing attributes
 * 
 * Usage (in browser console):
 * import { auditForms } from '@/lib/auditForms';
 * auditForms();
 */

export interface FormIssue {
  index: number;
  tag: string;
  identifier: string;
  issue: string;
}

export function auditForms(): FormIssue[] {
  const issues: FormIssue[] = [];
  
  document.querySelectorAll('input, select, textarea').forEach((el, i) => {
    const tag = el.tagName.toLowerCase();
    const id = el.getAttribute('id');
    const name = el.getAttribute('name');
    const ac = el.getAttribute('autocomplete');
    
    // Check for associated label
    const hasLabel = !!(
      (id && document.querySelector(`label[for="${id}"]`)) || 
      el.closest('label') || 
      el.hasAttribute('aria-label') || 
      el.hasAttribute('aria-labelledby')
    );

    const identifier = id || name || `element-${i}`;

    if (!id && !name) {
      issues.push({
        index: i,
        tag,
        identifier,
        issue: 'Missing both id and name attributes'
      });
    }
    
    if (!ac && tag === 'input') {
      issues.push({
        index: i,
        tag,
        identifier,
        issue: 'Missing autocomplete attribute'
      });
    }
    
    if (!hasLabel) {
      issues.push({
        index: i,
        tag,
        identifier,
        issue: 'No associated label (for/aria-label/aria-labelledby or wrapping <label>)'
      });
    }
  });

  if (issues.length > 0) {
    console.group('🔍 Form Audit Results');
    console.table(issues);
    console.groupEnd();
  } else {
    console.log('✅ No form issues found!');
  }

  return issues;
}

// Export to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).auditForms = auditForms;
}
