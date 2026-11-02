export type SourceKind =
  | "cms"
  | "faq"
  | "alert"
  | "opendata"
  | "brochure"
  | "tourism-data"
  | "weather"
  | "fx"
  | "vision"
  | "inventory";

export type SourceConfidence = "high" | "medium" | "low";

export interface CitationSource {
  id: string;
  kind: SourceKind;
  title: string;
  detail?: string;
  url?: string;
  page?: number;
  confidence?: SourceConfidence;
}
