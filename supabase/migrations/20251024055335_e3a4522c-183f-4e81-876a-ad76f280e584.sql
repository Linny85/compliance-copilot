-- Dedup existing docs (keep most recent)
WITH dups AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY title, COALESCE(jurisdiction,''), COALESCE(lang,''),
                        COALESCE(doc_type,''), COALESCE(version,'')
           ORDER BY created_at DESC
         ) AS rn
  FROM helpbot_docs
)
DELETE FROM helpbot_docs
USING dups
WHERE helpbot_docs.id = dups.id
  AND dups.rn > 1;

-- Add checksum column
ALTER TABLE helpbot_docs
  ADD COLUMN IF NOT EXISTS file_sha256 TEXT;

-- Create unique index on checksum
CREATE UNIQUE INDEX IF NOT EXISTS uq_helpbot_docs_sha
  ON helpbot_docs(file_sha256)
  WHERE file_sha256 IS NOT NULL;

-- Create unique index on semantic fields
CREATE UNIQUE INDEX IF NOT EXISTS uq_helpbot_docs_semantic
  ON helpbot_docs(title, COALESCE(jurisdiction,'~'),
                  COALESCE(lang,''), COALESCE(doc_type,''),
                  COALESCE(version,'~'));

-- Prevent duplicate chunks (use DO block for conditional constraint)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_helpbot_chunks'
  ) THEN
    ALTER TABLE helpbot_chunks ADD CONSTRAINT uq_helpbot_chunks UNIQUE (doc_id, chunk_no);
  END IF;
END $$;