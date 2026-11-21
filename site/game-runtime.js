const CID = /^(?:b[a-z2-7]{10,}|Qm[1-9A-HJ-NP-Za-km-z]{44})$/;
const ADDRESS = /^0x[0-9a-f]{40}$/i;

export function gameLinks(game) {
    const links = game.payload.gameLinks;
    if (!Array.isArray(links)) return [];
    const names = new Set();
    return links.slice(0, 24).filter(link => {
        if (!link || !/^[a-z][a-z0-9-]{0,63}$/.test(link.name ?? "") || names.has(link.name) ||
            typeof link.label !== "string" || !link.label.trim() || link.label.length > 80 ||
            !ADDRESS.test(link.publisher ?? "") || typeof link.repo !== "string" || !link.repo ||
            typeof link.id !== "string" || !link.id || !["pin", "follow"].includes(link.mode) ||
            !CID.test(link.baseline?.cid ?? "") || !CID.test(link.baseline?.src ?? "")) return false;
        names.add(link.name);
        return true;
    });
}

export function resolveGameLink(link, records) {
    const head = records.find(row => row.publisher.toLowerCase() === link.publisher.toLowerCase() &&
        row.repo === link.repo && row.id === link.id);
    if (head && (head.type !== "game" || head.payload["@terms"] || head.payload.paid === true)) return null;
    const publicHead = CID.test(head?.cid ?? "") && CID.test(head.payload.src ?? "");
    if (publicHead && (link.mode === "follow" || head.cid === link.baseline.cid)) return head;

    // A linked game can declare a historical snapshot. Its claimed target provenance is
    // not verified by the current catalog, so it gets its own save namespace.
    return {
        publisher: link.publisher.toLowerCase(), repo: link.repo, id: link.id, type: "game",
        cid: link.baseline.cid, linkedSnapshot: true,
        payload: { title: link.label, src: link.baseline.src, tags: [] },
    };
}

export function gameDocument(content, gateway) {
    if (typeof content?.html === "string") return content.html;
    const build = content?.unityWeb;
    if (build?.version !== 1) throw new Error("Missing game entrypoint");
    const url = new URL(gateway, location.href);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid game gateway");
    function asset(cid) {
        if (!CID.test(cid ?? "")) throw new Error("Invalid Unity build file");
        return `${url.href.replace(/\/+$/, "")}/ipfs/${cid}`;
    }
    const config = {
        dataUrl: asset(build.data),
        frameworkUrl: asset(build.framework),
        codeUrl: asset(build.wasm),
        companyName: "Warehouse",
        productName: "Unity Web game",
        productVersion: "1",
    };
    const literal = value => JSON.stringify(value).replaceAll("<", "\\u003c");
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;background:#111;color:white;font:16px system-ui}canvas{width:100vw;height:100dvh;display:block}p{position:absolute;inset:1rem;pointer-events:none}</style></head>
<body><canvas aria-label="Unity game" tabindex="0"></canvas><p role="status">Loading Unity…</p><script>
const canvas = document.querySelector("canvas");
const status = document.querySelector("p");
const loader = document.createElement("script");
const fail = () => { status.textContent = "Could not start this Unity build."; };
loader.src = ${literal(asset(build.loader))};
loader.crossOrigin = "anonymous";
loader.onerror = fail;
loader.onload = async () => {
    try {
        await createUnityInstance(canvas, ${literal(config)}, progress => {
            status.textContent = "Loading Unity… " + Math.round(progress * 100) + "%";
        });
        status.remove();
        canvas.focus();
    } catch { fail(); }
};
document.head.append(loader);
</script></body></html>`;
}
