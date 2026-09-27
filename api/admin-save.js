// POST /api/admin-save
// Body: { password, creations: [...], images: [{ path, content (base64) }] }
// Verifies the admin password, commits creations.json + any uploaded images
// to the GitHub repo. Vercel auto-redeploys from the push.
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { password, creations, images } = req.body || {};
  if (!process.env.KWK_ADMIN_PASSWORD || password !== process.env.KWK_ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Bad password" });
  }
  if (!process.env.GITHUB_PAT) {
    return res.status(500).json({ error: "Publishing isn't configured yet." });
  }
  const owner = "stndfella42-code";
  const repo = "krafting-with-kay";
  const headers = {
    Authorization: `Bearer ${process.env.GITHUB_PAT}`,
    "Content-Type": "application/json",
    "User-Agent": "kwk-admin-save",
  };

  async function putFile(path, contentB64, message) {
    let sha;
    const get = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=main`,
      { headers }
    );
    if (get.ok) sha = (await get.json()).sha;
    else if (get.status !== 404) throw new Error(`GitHub read failed for ${path}`);
    const put = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ message, content: contentB64, sha, branch: "main" }),
    });
    if (!put.ok) throw new Error(`GitHub save failed for ${path}: ${(await put.text()).slice(0, 200)}`);
  }

  try {
    for (const img of images || []) {
      await putFile(img.path, img.content, `KwK settings: upload ${img.path}`);
    }
    await putFile(
      "creations.json",
      Buffer.from(JSON.stringify(creations, null, 2)).toString("base64"),
      "KwK settings: update creations"
    );
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
