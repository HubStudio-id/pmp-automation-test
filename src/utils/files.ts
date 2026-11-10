// Test files built at run time in the OS temp folder (never committed): PDFs of an exact byte size.
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** A file that starts like a PDF and is padded to exactly `bytes` bytes. */
export function pdfOfSize(name: string, bytes: number): string {
  const header = Buffer.from('%PDF-1.4\n% QA regression size probe\n');
  const trailer = Buffer.from('\n%%EOF\n');
  const padding = Buffer.alloc(Math.max(0, bytes - header.length - trailer.length), 0x20);
  const path = join(mkdtempSync(join(tmpdir(), 'qa-regression-')), name);
  writeFileSync(path, Buffer.concat([header, padding, trailer]));
  return path;
}
