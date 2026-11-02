/**
 * Lightweight Qdrant HTTP helper (minimal)
 *
 * - ensureCollection(collectionName, vectorSize)
 * - upsertVectors(collectionName, points[])
 * - searchVectors(collectionName, vector, top)
 *
 * This is a small, dependency-free wrapper using the Qdrant HTTP API.
 * It is intended as a scaffold; adapt to your Qdrant version and auth model as needed.
 */

const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

function qdrantHeaders() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (QDRANT_API_KEY) h["X-API-Key"] = QDRANT_API_KEY;
  return h;
}

export async function collectionExists(name: string): Promise<boolean> {
  const url = `${QDRANT_URL}/collections/${encodeURIComponent(name)}`;
  const res = await fetch(url, { method: "GET", headers: qdrantHeaders() });
  if (res.ok) return true;
  if (res.status === 404) return false;
  throw new Error(`Qdrant check failed: ${res.status} ${await res.text().catch(() => "")}`);
}

export async function ensureCollection(
  name: string,
  vectorSize = 32,
  distance: "Cos" | "Dot" | "Euclid" = "Cos",
): Promise<void> {
  if (await collectionExists(name)) {
    return;
  }

  // Try multiple payload variants to support different Qdrant versions/variants.
  const variants = [
    { name, vectors: { size: vectorSize, distance } },
    { name, vectors: { default: { size: vectorSize, distance } } },
    { name, vector_size: vectorSize, distance },
  ];

  let lastErr: any = null;

  for (const body of variants) {
    try {
      let res = await fetch(`${QDRANT_URL}/collections`, {
        method: "POST",
        headers: qdrantHeaders(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        // Try PUT /collections/{name} as an alternative for other Qdrant versions
        res = await fetch(`${QDRANT_URL}/collections/${encodeURIComponent(name)}`, {
          method: "PUT",
          headers: qdrantHeaders(),
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        console.info(`[vector] ensured collection "${name}" (size=${vectorSize}) using variant`);
        return;
      }

      lastErr = { status: res.status, text: await res.text().catch(() => "") };
    } catch (err) {
      lastErr = err;
    }
  }

  throw new Error(`Failed to create collection ${name}: ${JSON.stringify(lastErr)}`);
}

export type UpsertPoint = {
  id: string | number;
  vector: number[];
  payload?: Record<string, unknown>;
};

export async function upsertVectors(collection: string, points: UpsertPoint[]): Promise<any> {
  const url = `${QDRANT_URL}/collections/${encodeURIComponent(collection)}/points`;
  // Use upsert (PUT) with points; Qdrant accepts { points: [...] }
  const res = await fetch(url, {
    method: "PUT",
    headers: qdrantHeaders(),
    body: JSON.stringify({ points }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Qdrant upsert failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function searchVectors(collection: string, vector: number[], top = 5): Promise<any> {
  const url = `${QDRANT_URL}/collections/${encodeURIComponent(collection)}/points/search`;
  const res = await fetch(url, {
    method: "POST",
    headers: qdrantHeaders(),
    body: JSON.stringify({ vector, limit: top }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Qdrant search failed: ${res.status} ${text}`);
  }
  return res.json();
}
