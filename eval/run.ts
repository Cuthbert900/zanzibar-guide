/**
 * Eval harness — runs scripted questions against /api/chat and checks golden expectations.
 * Usage: BASE_URL=http://127.0.0.1:3001 npx tsx eval/run.ts
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";

interface Case {
  id: string;
  question: string;
  expectAnyLocationIds?: string[];
  expectContentIncludes?: string[];
  expectAlertOrFaq?: boolean;
}

interface Golden {
  cases: Case[];
}

async function run() {
  const golden = JSON.parse(readFileSync(path.join(__dirname, "golden.json"), "utf-8")) as Golden;
  let passed = 0;
  let failed = 0;

  for (const c of golden.cases) {
    process.stdout.write(`• ${c.id} … `);
    try {
      const res = await fetch(`${BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: c.question, sessionId: `eval_${c.id}` }),
      });
      const data = (await res.json()) as {
        content?: string;
        locations?: Array<{ id: string }>;
        faqLinks?: unknown[];
        alerts?: unknown[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const locIds = (data.locations || []).map((l) => l.id);
      if (c.expectAnyLocationIds?.length) {
        const hit = c.expectAnyLocationIds.some((id) => locIds.includes(id));
        if (!hit) throw new Error(`expected one of [${c.expectAnyLocationIds}] got [${locIds}]`);
      }
      for (const needle of c.expectContentIncludes || []) {
        if (!data.content?.toLowerCase().includes(needle.toLowerCase())) {
          throw new Error(`content missing "${needle}"`);
        }
      }
      if (c.expectAlertOrFaq) {
        const ok = (data.alerts?.length || 0) > 0 || (data.faqLinks?.length || 0) > 0 || /visa|safe|health/i.test(data.content || "");
        if (!ok) throw new Error("expected alerts/faq or safety content");
      }
      console.log("PASS");
      passed += 1;
    } catch (err) {
      console.log("FAIL", err instanceof Error ? err.message : err);
      failed += 1;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

run();
