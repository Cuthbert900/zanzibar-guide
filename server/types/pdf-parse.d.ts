declare module "pdf-parse" {
  export class PDFParse {
    constructor(opts: { data: Buffer | Uint8Array });
    getText(): Promise<{ text?: string }>;
    destroy(): Promise<void>;
  }
}
