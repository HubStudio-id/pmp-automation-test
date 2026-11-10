// Minimal typing for the parts of adm-zip the suite uses (src/utils/docx.ts).
declare module 'adm-zip' {
  class AdmZip {
    constructor(data?: Buffer);
    readAsText(entryName: string): string;
    updateFile(entryName: string, content: Buffer): void;
    toBuffer(): Buffer;
  }
  export default AdmZip;
}
