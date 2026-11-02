import { Router } from "express";
import { patchCms, readCms, writeCms } from "../lib/cmsStore";
import { appendAudit, listAudit } from "../lib/audit";

export const adminRouter = Router();

const ADMIN_KEYS: Record<string, "editor" | "viewer"> = {
  [process.env.ADMIN_KEY || "travelguide-admin"]: "editor",
  [process.env.ADMIN_VIEWER_KEY || "travelguide-viewer"]: "viewer",
};

function authAdmin(req: { headers: Record<string, unknown> }): { role: "editor" | "viewer"; key: string } | null {
  const key = String(req.headers["x-admin-key"] || "");
  const role = ADMIN_KEYS[key];
  if (!role) return null;
  return { role, key };
}

adminRouter.use((req, res, next) => {
  const auth = authAdmin(req);
  if (!auth) {
    res.status(401).json({
      error: "Invalid admin key (x-admin-key). editor: travelguide-admin · viewer: travelguide-viewer",
    });
    return;
  }
  (req as { adminRole?: string }).adminRole = auth.role;
  (req as { adminKey?: string }).adminKey = auth.key.slice(0, 8);
  next();
});

adminRouter.get("/me", (req, res) => {
  res.json({ data: { role: (req as { adminRole?: string }).adminRole } });
});

adminRouter.get("/cms", (_req, res) => {
  res.json({ data: readCms() });
});

adminRouter.get("/audit", (req, res) => {
  res.json({ data: listAudit(80), role: (req as { adminRole?: string }).adminRole });
});

adminRouter.put("/cms", async (req, res) => {
  if ((req as { adminRole?: string }).adminRole !== "editor") {
    res.status(403).json({ error: "Viewer role cannot save CMS changes" });
    return;
  }
  const body = req.body as ReturnType<typeof readCms>;
  if (!body?.attractions || !body?.faqs || !body?.alerts) {
    res.status(400).json({ error: "attractions, faqs, alerts required" });
    return;
  }
  const data = await writeCms(body);
  await appendAudit({
    actor: "admin",
    role: "editor",
    action: "cms.put",
    detail: `attractions=${body.attractions.length} faqs=${body.faqs.length} alerts=${body.alerts.length}`,
  });
  res.json({ data });
});

adminRouter.patch("/cms", async (req, res) => {
  if ((req as { adminRole?: string }).adminRole !== "editor") {
    res.status(403).json({ error: "Viewer role cannot patch CMS" });
    return;
  }
  const data = await patchCms(req.body);
  await appendAudit({ actor: "admin", role: "editor", action: "cms.patch", detail: JSON.stringify(Object.keys(req.body || {})) });
  res.json({ data });
});
