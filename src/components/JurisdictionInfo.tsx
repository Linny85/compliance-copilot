import { jurisdictionByIso2 } from "@/lib/jurisdictions";

export function JurisdictionInfo({ iso2 }: { iso2?: string }) {
  const j = jurisdictionByIso2(iso2);
  if (!j) return null;
  
  return (
    <div className="mt-3 rounded-lg border p-3 text-sm">
      <div><strong>DPA:</strong> {j.dpa_name}{j.dpa_abbrev ? ` (${j.dpa_abbrev})` : ""}</div>
      {j.national_law && <div><strong>Law:</strong> {j.national_law}</div>}
      {j.dpa_url && (
        <div className="truncate">
          <strong>URL:</strong> <a className="underline" href={j.dpa_url} target="_blank" rel="noreferrer">{j.dpa_url}</a>
        </div>
      )}
    </div>
  );
}
