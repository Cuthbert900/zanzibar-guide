export type ModelProvider = "openai" | "gemini";

export type ModelTraffic = Record<ModelProvider, number>;

export const activeModelTraffic: ModelTraffic = {
  openai: 0,
  gemini: 0,
};

const COMPLEX_QUERY_PATTERN =
  /\b(itinerary|plan|planning|compare|comparison|step[- ]by[- ]step|detailed|multi[- ]day|budget|schedule|route|recommendations?)\b/i;

export function selectModelProvider(
  query: string,
  availableProviders: readonly ModelProvider[],
  traffic: ModelTraffic,
): ModelProvider | null {
  if (availableProviders.length === 0) return null;
  if (availableProviders.length === 1) return availableProviders[0];

  if (traffic.openai !== traffic.gemini) {
    return traffic.openai < traffic.gemini ? "openai" : "gemini";
  }

  const sentenceCount = query.match(/[?!.](?=\s|$)/g)?.length ?? 0;
  const isComplex = query.length >= 240 || sentenceCount > 1 || COMPLEX_QUERY_PATTERN.test(query);
  return isComplex ? "openai" : "gemini";
}

export async function withModelTraffic<T>(provider: ModelProvider, request: () => Promise<T>): Promise<T> {
  activeModelTraffic[provider] += 1;
  try {
    return await request();
  } finally {
    activeModelTraffic[provider] -= 1;
  }
}