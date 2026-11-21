// Public GLB slots. The accepted contract and fallback live in the immutable game release.
const MODEL = "model/gltf-binary";
const CID = /^(?:b[a-z2-7]{10,}|Qm[1-9A-HJ-NP-Za-km-z]{44})$/;
const ADDRESS = /^0x[0-9a-f]{40}$/i;

export async function resolveDependencies(slots, records, gateway) {
    if (slots === undefined) return null;
    if (!Array.isArray(slots) || !slots.length || slots.length > 64) throw new Error("Invalid game dependencies");
    const resolved = new Map();
    for (const slot of slots) {
        const { name, mode, publisher, repo, id, baseline, contract } = slot ?? {};
        if (!/^[a-z][a-z0-9-]{0,63}$/.test(name ?? "") || resolved.has(name) ||
            !["pin", "follow"].includes(mode) || !ADDRESS.test(publisher ?? "") ||
            typeof repo !== "string" || typeof id !== "string" || !repo || !id ||
            !CID.test(baseline?.cid ?? "") || !CID.test(baseline?.src ?? "") ||
            (mode === "follow" && (typeof contract !== "string" || !contract))) {
            throw new Error("Invalid game dependency slot");
        }
        const head = mode === "follow" && records.find(row =>
            row.publisher.toLowerCase() === publisher.toLowerCase() && row.repo === repo && row.id === id);
        const payload = head?.payload;
        const current = head?.type === "asset" && payload?.mime === MODEL &&
            payload.publicModel?.channel === "stable" && payload.publicModel.contract === contract &&
            !payload["@terms"] && CID.test(head.cid) && CID.test(payload.src);
        const candidates = current && head.cid !== baseline.cid
            ? [{ cid: head.cid, src: payload.src }, baseline] : [baseline];
        resolved.set(name, candidates.map(({ cid, src }) => {
            const url = new URL(`${gateway.replace(/\/+$/, "")}/ipfs/${src}`, location.href);
            if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid asset gateway");
            return { cid, url: url.href };
        }));
    }
    return Object.fromEntries(await Promise.all([...resolved].map(async ([name, candidates]) => {
        for (const candidate of candidates) {
            if (await availableModel(candidate.url)) return [name, candidate];
        }
        throw new Error(`No available model for ${name}`);
    })));
}


async function availableModel(url) {
    try {
        const response = await fetch(url, { headers: { Range: "bytes=0-11" }, signal: AbortSignal.timeout(5000) });
        if (!response.body) return false;
        const reader = response.body.getReader();
        try {
            if (!response.ok) return false;
            const header = new Uint8Array(12);
            let offset = 0;
            while (offset < header.length) {
                const { done, value } = await reader.read();
                if (done) return false;
                const chunk = value.subarray(0, header.length - offset);
                header.set(chunk, offset);
                offset += chunk.length;
            }
            const view = new DataView(header.buffer);
            return view.getUint32(0, true) === 0x46546c67 &&
                view.getUint32(4, true) === 2 && view.getUint32(8, true) >= 20;
        } finally {
            void reader.cancel().catch(() => {});
        }
    } catch {
        return false;
    }
}
