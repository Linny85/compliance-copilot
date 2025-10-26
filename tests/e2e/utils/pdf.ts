import pdf from 'pdf-parse';
import * as fs from 'fs/promises';

export async function pdfText(filePath: string) {
  const buf = await fs.readFile(filePath);
  const data = await pdf(buf);
  return (data.text || '').replace(/\s+/g, ' ').trim();
}
