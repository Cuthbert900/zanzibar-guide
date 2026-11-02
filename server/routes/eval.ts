import { Router } from "express";
import { readFileSync } from "fs";
import path from "path";
import { trackEvent } from "../lib/store";
import { generateTourismReply } from "../chat";
import { EVAL_DIR } from "../lib/paths";

export const evalRouter = Router();

evalRouter.post("/run", async (_req, res) => {
  try {
    const goldenPath = path.join(EVAL_DIR, "golden.json");
    const golden = JSON.parse(readFileSync(goldenPath, "utf-8")) as {
      cases: Array<{
        id: string;
        question: string;
        expectAnyLocationIds?: string[];
        expectContentIncludes?: string[];
        expectAlertOrFaq?: boolean;
      }>;
    };

    const results: Array<{ id: string; pass: boolean; detail?: string }> = [];
    for (const c of golden.cases) {
      try {
        const data = await generateTourismReply([{ role: "user", content: c.question }], {
          sessionId: `eval_ui_${c.id}`,
        });
        const locIds = (data.locations || []).map((l) => l.id);
        let failDetail: string | undefined;
        if (c.expectAnyLocationIds?.length) {
          const hit = c.expectAnyLocationIds.some((id) => locIds.includes(id));
          if (!hit) failDetail = `locs [${locIds.join(",")}]`;
        }
        if (!failDetail) {
          for (const needle of c.expectContentIncludes || []) {
            if (!data.content?.toLowerCase().includes(needle.toLowerCase())) {
              failDetail = `missing ${needle}`;
              break;
            }
          }
        }
        if (!failDetail && c.expectAlertOrFaq) {
          const ok =
            (data.alerts?.length || 0) > 0 ||
            (data.faqLinks?.length || 0) > 0 ||
            /visa|safe|health/i.test(data.content || "");
          if (!ok) failDetail = "no safety/faq";
        }
        results.push(failDetail ? { id: c.id, pass: false, detail: failDetail } : { id: c.id, pass: true });
      } catch (err) {
        results.push({ id: c.id, pass: false, detail: err instanceof Error ? err.message : "error" });
      }
    }

    const passed = results.filter((r) => r.pass).length;
    const failed = results.length - passed;
    await trackEvent({
      type: "eval_run",
      channel: "web",
      intent: "quality",
      meta: { passed, failed },
    });

    res.json({
      data: {
        ranAt: new Date().toISOString(),
        passed,
        failed,
        passRate: results.length ? Math.round((passed / results.length) * 100) : 0,
        results,
      },
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Eval failed" });
  }
});
