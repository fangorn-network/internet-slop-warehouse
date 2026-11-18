// The page's own Worker: static files from site/, plus likes/dislikes in D1 at /api/votes.
// Votes aren't on Fangorn: they're opinions about records, not records.
// ponytail: one vote per part per IP (hashed); NAT'd households share one. Turnstile if stuffing shows up.
const PART = /^0x[0-9a-f]{40}\/[\w.-]{1,100}$/i;

async function voter(req, env) {
    const ip = req.headers.get("cf-connecting-ip") ?? "local";
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${env.VOTE_SALT ?? "slop"}:${ip}`));
    return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function tallies(db, who) {
    const [all, mine] = await db.batch([
        db.prepare("SELECT part, SUM(v = 1) AS up, SUM(v = -1) AS down FROM votes GROUP BY part"),
        db.prepare("SELECT part, v FROM votes WHERE voter = ?").bind(who),
    ]);
    return {
        tally: Object.fromEntries(all.results.map((r) => [r.part, [r.up, r.down]])),
        mine: Object.fromEntries(mine.results.map((r) => [r.part, r.v])),
    };
}

export default {
    async fetch(req, env) {
        const url = new URL(req.url);
        if (url.pathname !== "/api/votes") return env.ASSETS.fetch(req);
        const db = env.VOTES, who = await voter(req, env);
        if (req.method === "POST") {
            const body = await req.json().catch(() => ({}));
            const part = String(body.part ?? "").toLowerCase(), v = body.v;
            if (!PART.test(part) || ![1, -1, 0].includes(v)) return Response.json({ error: "want { part: '0x…/id', v: 1 | -1 | 0 }" }, { status: 400 });
            await (v === 0
                ? db.prepare("DELETE FROM votes WHERE part = ? AND voter = ?").bind(part, who)
                : db.prepare("INSERT INTO votes (part, voter, v) VALUES (?, ?, ?) ON CONFLICT (part, voter) DO UPDATE SET v = excluded.v").bind(part, who, v)
            ).run();
        } else if (req.method !== "GET") return new Response(null, { status: 405 });
        return Response.json(await tallies(db, who), { headers: { "cache-control": "no-store" } });
    },
};
