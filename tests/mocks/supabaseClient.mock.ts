// Lightweight chainable mock for supabase.from(...).select().not().order().limit()
// and supabase.storage.from("reports").download(...)

type Row = {
  id: string;
  title: string;
  status: string;
  report_generated_at: string | null;
  last_report_path: string | null;
};

let queryResult: Row[] = [];
let storageBlob: Blob | null = null;

export function setQueryResult(rows: Row[]) {
  queryResult = rows;
}
export function setStorageDownload(blob: Blob) {
  storageBlob = blob;
}

const selectChain = {
  not: () => selectChain,
  order: () => selectChain,
  limit: () => Promise.resolve({ data: queryResult, error: null }),
};

const supabase = {
  from: (_table: string) => ({
    select: (_fields: string) => selectChain,
  }),
  storage: {
    from: (_bucket: string) => ({
      download: async (_path: string) => {
        if (!storageBlob) return { data: null, error: new Error("No blob set") };
        return { data: storageBlob, error: null };
      },
    }),
  },
};

module.exports = { supabase, setQueryResult, setStorageDownload };
