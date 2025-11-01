export const ROUTES = {
  controls: '/controls',
  evidence: '/evidence',
  audit: {
    list: '/audit',
    new: '/audit/new',
  },
  training: '/admin/training-certificates',
  billing: '/billing',
  admin: '/admin',
  documents: {
    list: '/documents',
    new: '/documents/new'
  }
} as const;
