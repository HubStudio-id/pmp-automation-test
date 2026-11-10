// DOCX edits for template-upload checks: a .docx is a zip; the body text lives in word/document.xml.
import AdmZip from 'adm-zip';

/** Heading of the field legend page at the end of every PMP letter template. Core's FieldScanner reads only the paragraphs
 *  before it (FieldScanner#without_legend) and the page is never published, so a field placed after it is never checked. */
const LEGEND_HEADING = 'KETERANGAN BIDANG ISIAN';

/** Returns a copy of the DOCX with `field` (e.g. «{{nama_faskes}}») added to the letter body, right after the first `anchor`
 *  (e.g. «{{nib}}») in the same text run, so it is one token that the scanner and the renderer both read and the page layout
 *  does not change. Throws when the anchor is missing or appears only on the legend page. */
export function withFieldInBody(docx: Buffer, anchor: string, field: string): Buffer {
  const zip = new AdmZip(docx);
  const xml = zip.readAsText('word/document.xml');
  const paragraphs = [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)];
  const plain = (p: string) => p.replace(/<[^>]+>/g, '');
  const legend = paragraphs.find((p) => plain(p[0]).includes(LEGEND_HEADING));
  const bodyEnd = legend?.index ?? xml.length;
  // The anchor must sit inside one w:t of a body paragraph: a token split over several runs would not be read as one field.
  const run = /<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g;
  let match: RegExpExecArray | null;
  while ((match = run.exec(xml)) && match.index < bodyEnd) {
    const at = match[1].indexOf(anchor);
    if (at < 0) continue;
    const start = match.index + match[0].indexOf('>') + 1 + at + anchor.length;
    zip.updateFile('word/document.xml', Buffer.from(`${xml.slice(0, start)} ${field}${xml.slice(start)}`, 'utf8'));
    return zip.toBuffer();
  }
  throw new Error(`word/document.xml has no «${anchor}» in one text run before the «${LEGEND_HEADING}» legend`);
}

/** A version label in the format the upload dialog asks for (vYYYY.NN) that no version of the template uses yet. */
export function freeVersionLabel(usedLabels: string[], year = new Date().getFullYear()): string {
  const used = new Set(usedLabels);
  const start = Date.now() % 100;
  for (let i = 0; i < 100; i += 1) {
    const label = `v${year}.${String((start + i) % 100).padStart(2, '0')}`;
    if (!used.has(label)) return label;
  }
  throw new Error(`no free v${year}.NN version label left`);
}
