/**
 * POST /api/admin-save
 * Saves site content edited in settings.html and commits it to GitHub,
 * which triggers a Vercel redeploy.
 *
 * Body: {
 *   files: {                     // filename -> parsed JSON content
 *     "creations.json": [...],
 *     "events.json": {...},
 *     "site.json": {...}
 *   },
 *   images: [{ name, dataUrl }]  // new uploads, data:image/jpeg;base64,...
 * }
 *
 * Images referenced by creations cards are stored under assets/creations/.
 *
 * NOTE: no password gate. Anyone with the settings URL can publish changes,
 * so keep the URL private. All changes are committed to git history.
 *
 * Env: GITHUB_PAT (fine-grained token, Contents read+write
 * on the site repo), GITHUB_REPO (owner/repo, default stndfella42-code/krafting-with-kay)
 */

const ALLOWED_FILES = ["creations.json", "events.json", "site.json"];
const REPO = process.env.GITHUB_REPO || "stndfella42-code/krafting-with-kay";
const BRANCH = "main";

function bad(res, code, msg) {
  return res.status(code).json({ ok: false, error: msg });
}

function validateFile(name, content) {
  if (name === "creations.json") {
    if (!Array.isArray(content)) return "creations must be a list";
    for (const c of content) {
      if (!c || typeof c.title !== "string" || typeof c.description !== "string")
        return "each creation needs a title and description";
    }
  }
  if (name === "events.json") {
    if (!content || typeof content !== "object") return "events must be an object";
    const r = content.recurring;
    if (!r || typeof r.title !== "string" || typeof r.dayOfWeek !== "number")
      return "recurring session needs a title and weekday";
    if (r.dayOfWeek < 0 || r.dayOfWeek > 6) return "weekday must be 0-6";
    if (!Array.isArray(content.events)) return "events must include an events list";
  }
  if (name === "site.json") {
    if (!content || typeof content !== "object" || Array.isArray(content))
      return "site must be an object";
  }
  return null;
}

async function gh(path, token, opts = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`GitHub ${res.status} on ${path}: ${t.slice(0, 200)}`);
  }
  return res.status === 204 ? null : res.json();
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return bad(res, 405, "POST only");

  const token = process.env.GITHUB_PAT;
  if (!token) return bad(res, 500, "Publishing isn't configured yet.");

  const { files, images } = req.body || {};
  if (!files || typeof files !== "object") return bad(res, 400, "Nothing to save.");

  // Validate every file before touching the repo.
  const names = Object.keys(files).filter((n) => ALLOWED_FILES.includes(n));
  if (!names.length) return bad(res, 400, "Nothing to save.");
  for (const n of names) {
    const err = validateFile(n, files[n]);
    if (err) return bad(res, 400, `Problem with ${n}: ${err}`);
  }

  try {
    // Current head commit and its tree.
    const ref = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`, token);
    const headSha = ref.object.sha;
    const headCommit = await gh(`/repos/${REPO}/git/commits/${headSha}`, token);
    const baseTree = headCommit.tree.sha;

    const treeItems = [];

    // New image uploads -> assets/creations/<name>
    const uploads = Array.isArray(images) ? images : [];
    for (const img of uploads) {
      if (!img || typeof img.name !== "string" || typeof img.dataUrl !== "string") continue;
      const m = img.dataUrl.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
      if (!m) continue;
      const safe = img.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
      if (!safe) continue;
      const buf = Buffer.from(m[2], "base64");
      if (!buf.length || buf.length > 8 * 1024 * 1024) continue;
      const blob = await gh(`/repos/${REPO}/git/blobs`, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: buf.toString("base64"), encoding: "base64" }),
      });
      treeItems.push({ path: `assets/creations/${safe}`, mode: "100644", type: "blob", sha: blob.sha });
    }

    // Content files.
    for (const n of names) {
      const text = JSON.stringify(files[n], null, 2) + "\n";
      const blob = await gh(`/repos/${REPO}/git/blobs`, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, encoding: "utf-8" }),
      });
      treeItems.push({ path: n, mode: "100644", type: "blob", sha: blob.sha });
    }

    const tree = await gh(`/repos/${REPO}/git/trees`, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base_tree: baseTree, tree: treeItems }),
    });
    const commit = await gh(`/repos/${REPO}/git/commits`, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Update site content via settings page",
        tree: tree.sha,
        parents: [headSha],
      }),
    });
    await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, token, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sha: commit.sha }),
    });

    return res.status(200).json({ ok: true, commit: commit.sha.slice(0, 7) });
  } catch (e) {
    console.error("admin-save failed:", e.message);
    return bad(res, 502, "Could not publish. Try again in a minute.");
  }
};
