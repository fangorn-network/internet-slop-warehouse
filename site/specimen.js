// Games as specimens: what each carries (every part it pins, all the way down) and its dark matter, the code in its
// own page that isn't any credited part. A part's shape comes from its content address, so it looks the same in
// every game that carries it. Read from the view alone, plus file sizes (weigh).

const pinKey = (p) => `${p.publisher}/${p.id}`, key = (r) => `${r.publisher}/${r.id}`;
export const CODE = new Set(["game", "logic", "source", "skill"]);

/** { records, carried: game → Set(part keys), hosts: part → Set(game keys) } */
export function graph(view) {
    const records = new Map(view.records.map((r) => [key(r), r])), carried = new Map(), hosts = new Map();
    for (const g of view.records.filter((r) => r.type === "game")) {
        const seen = new Set();
        const walk = (k) => { if (seen.has(k)) return; seen.add(k); for (const u of records.get(k)?.payload.uses ?? []) walk(pinKey(u)); };
        for (const u of g.payload.uses ?? []) walk(pinKey(u));
        carried.set(key(g), seen);
        for (const k of seen) (hosts.get(k) ?? hosts.set(k, new Set()).get(k)).add(key(g));
    }
    return { records, carried, hosts };
}

// The gateway compresses JSON, so there's no Content-Length to HEAD: code is weighed by reading it. Files are
// immutable and cached for a year. ponytail: a game's page is downloaded once to weigh it; sizes in the view would remove this.
const weights = new Map();
export const weigh = (url) => weights.get(url) ?? weights.set(url, fetch(url).then(async (res) => {
    let n = 0; for await (const chunk of res.body) n += chunk.length;
    return n;
}).catch(() => 0)).get(url);

/** A game's composition, with sizes → { dark (0–100), logic, assets, own, borrowed } */
export async function weighGame(g, { records, carried }, fileURL) {
    const parts = [...carried.get(key(g))].map((k) => records.get(k)).filter(Boolean);
    const code = parts.filter((r) => CODE.has(r.type)), sizes = new Map();
    await Promise.all([g, ...code].map(async (r) => sizes.set(key(r), await weigh(fileURL(r)))));
    const own = Math.max(sizes.get(key(g)), 200), borrowed = code.reduce((n, r) => n + sizes.get(key(r)), 0);
    return { dark: Math.round((own / (own + borrowed)) * 100), logic: code.length, assets: parts.filter((r) => r.type === "asset").length, own, borrowed, sizes };
}

export const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const rng = (seed) => () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) ^ Math.imul(seed ^ (seed >>> 13), 3266489909)) >>> 0) / 4294967296;
/** A closed, slightly irregular blob around (x, y): the same seed draws the same shape. */
export function blob(x, y, r, seed, wobble = 0.12, n = 9) {
    const rnd = rng(seed), pts = Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 + rnd() * 0.3, rr = r * (1 + wobble * (rnd() * 2 - 1)); return [x + Math.cos(a) * rr, y + Math.sin(a) * rr]; });
    const p = (i) => pts[(i + n) % n], f = (v) => v.toFixed(1);
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
        const [a, b, c, e] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
        d += `C${f(b[0] + (c[0] - a[0]) / 6)} ${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)} ${f(c[1] - (e[1] - b[1]) / 6)} ${f(c[0])} ${f(c[1])}`;
    }
    return d + "Z";
}
export const colour = (r) => !r ? "none" : r.type === "logic" || r.type === "source" ? "#e5ff50" : r.type === "skill" ? "#ea9d65"
    : /gltf|model/.test(r.payload.mime ?? "") ? "#d6d7bd" : /^image\//.test(r.payload.mime ?? "") ? "#9fb38a" : /^audio\//.test(r.payload.mime ?? "") ? "#7fb7a8" : "#8a8f7c";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const SEED = 600;   // an asset's area, in bytes of code: one seed each

/** A part's glyph: its blob, alone. */
export const glyph = (r, size = 44) => `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><path d="${blob(size / 2, size / 2, size * 0.38, hash(r.cid))}" fill="${colour(r)}" fill-opacity=".85"/></svg>`;

/** A game as an SVG dish (viewBox 200): dark matter plus every part it carries, packed. `sizes` from weighGame. */
export function dish(g, { records, carried }, sizes, { packSiblings, packEnclose }) {
    const k = key(g), cells = [{ dark: true, r: Math.sqrt(Math.max(sizes.get(k) ?? 0, 200)) }];
    for (const pk of carried.get(k)) {
        const r = records.get(pk);
        cells.push({ k: pk, rec: r, r: Math.sqrt(r && CODE.has(r.type) ? Math.max(sizes.get(pk) ?? 0, SEED) : SEED) });
    }
    cells.sort((a, b) => b.r - a.r);
    packSiblings(cells);
    const e = packEnclose(cells), s = 92 / e.r;
    const body = cells.map((c) => {
        const x = 100 + (c.x - e.x) * s, y = 100 + (c.y - e.y) * s, r = c.r * s * 0.93;
        if (c.dark) return `<path d="${blob(x, y, r, hash(k), 0.16, 12)}" fill="#050704" stroke="#2f3826"/>`;
        const shape = r < 2.2 ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${Math.max(r, 0.8).toFixed(1)}"` : `<path d="${blob(x, y, r, hash(c.rec?.cid ?? c.k))}"`;
        return c.rec ? `${shape} data-k="${esc(c.k)}" fill="${colour(c.rec)}" fill-opacity=".85" stroke="#0b0f09" stroke-width=".6"/>`
            : `${shape} data-k="${esc(c.k)}" fill="none" stroke="#ea9d65" stroke-dasharray="2 2"/>`;
    }).join("");
    return `<svg class="dish" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="97" fill="none" stroke="#3d4630" stroke-dasharray="3 4"/><g class="culture">${body}</g></svg>`;
}
