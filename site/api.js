// A client for a westmarch Worker: the generic API every deployment serves (westmarch worker/API.md).
// Nothing here is warehouse-specific; give it a base URL and it talks to any app.
// ponytail: one file in site/ for now; lift it into its own package when a second app wants it.

/** @param {string} base  the deployment, e.g. https://internet-slop-warehouse-sepolia.fangorn.network */
export function westmarch(base) {
    base = base.replace(/\/+$/, "");
    async function call(path, init) {
        const res = await fetch(base + path, init);
        const body = await res.json().catch(() => null);
        if (!res.ok) throw Object.assign(new Error(body?.error ?? `${path}: HTTP ${res.status}`), { status: res.status });
        return body;
    }
    let manifest;
    return {
        base,
        /** { name, network, gateway, repos, types, publish, mcp, connect? }: fetched once. */
        manifest: () => (manifest ??= call("/api.json").catch((e) => { manifest = null; throw e; })),
        /** { root, stitch, gateway, records }: every indexed record. 404 until the first cron run. */
        view: () => call("/view.json", { cache: "no-store" }),
        /** Records by meaning, best first, each with a score. */
        search: (q, { k = 10, type } = {}) =>
            call(`/search?${new URLSearchParams({ q, k: String(k), ...(type ? { type } : {}) })}`),
        /** Into the grant holder's own repo: { repo?, record: { id, type, payload }, file?, pin? } → { cid, txHash, … }. */
        publish: (token, request) => call("/publish", {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
            body: JSON.stringify(request),
        }),
    };
}

/** Where a row's file lives: `<gateway>/ipfs/<src>`. */
export const fileURL = (gateway, row) => `${gateway}/ipfs/${row.payload.src}`;
