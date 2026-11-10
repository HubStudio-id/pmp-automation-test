// Reads the text of a PDF given as base64 (unpdf, pure JS: works locally and in CI).
import { extractText, getDocumentProxy } from 'unpdf';

export async function pdfText(base64: string): Promise<{ text: string; pages: number }> {
  const pdf = await getDocumentProxy(new Uint8Array(Buffer.from(base64, 'base64')));
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  return { text: text as string, pages: totalPages };
}
