// Code a game runs, scanned for what a sandboxed iframe still allows: mining, phishing, and calling out. A heuristic.
const HOSTS = ["unpkg.com", "cdn.jsdelivr.net", "esm.sh", "cdnjs.cloudflare.com", "ga.jspm.io", "cdn.skypack.dev", "ipfs-test.fangorn.network", "ipfs.fangorn.network"];
const BAD = [
    [/coinhive|coin-hive|cryptonight|cryptoloot|webminerpool|coinimp|minero\.cc|\bxmrig\b/i, "looks like a crypto miner"],
    [/<input\b[^>]*\btype\s*=\s*["']?password/i, "asks for a password"],
    [/<form\b[^>]*\baction\s*=\s*["']?(https?:)?\/\//i, "has a form that posts off-site"],
    [/navigator\s*\.\s*sendBeacon\s*\(/, "sends beacons"],
];
// Where code reaches another host: script src, static and dynamic imports, fetch, sockets, event sources, workers.
const REACH = /(?:<script\b[^>]*\bsrc\s*=\s*["']|\bfrom\s*["']|\bimport\s*\(\s*["']|\bfetch\s*\(\s*["']|new\s+(?:WebSocket|EventSource|Worker)\s*\(\s*["'])((?:https?|wss?):)?\/\/([^/"'\s:]+)/gi;

const codeOf = (file) => {
    if (!file) return null;
    try { const j = JSON.parse(new TextDecoder().decode(file)); return [j?.html, j?.js, j?.code].find((x) => typeof x === "string") ?? null; } catch { return null; }
};

export function validate(record, { file, params }) {
    const code = codeOf(file);
    if (code == null) return true; // not code (an asset, a skill): not this check's business
    for (const [re, what] of BAD) if (re.test(code)) return `it ${what}`;
    const hosts = params.hosts ?? HOSTS;
    for (const [, , host] of code.matchAll(REACH))
        if (!hosts.some((h) => host === h || host.endsWith("." + h))) return `it loads from or talks to ${host}, which isn't allowed (${hosts.join(", ")})`;
    return true;
}
