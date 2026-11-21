const ADDRESS = /^0x[0-9a-f]{40}$/i;
const REPO = "internet-slop-warehouse";

export function selectedPublisher(url) {
    const publisher = url.searchParams.get("publisher");
    return ADDRESS.test(publisher ?? "") ? publisher.toLowerCase() : null;
}

export function publisherURL(url, publisher) {
    const link = new URL(url);
    link.searchParams.delete("part");
    link.searchParams.delete("room");
    if (publisher) link.searchParams.set("publisher", publisher.toLowerCase());
    else link.searchParams.delete("publisher");
    link.hash = publisher ? "" : "publishers";
    return link.href;
}

export async function publisherRepo(publisher) {
    const url = new URL("https://fangorn.network/api/repos");
    url.searchParams.set("publisher", publisher);
    url.searchParams.set("k", "100");
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(7000) });
    if (!res.ok) throw new Error("Publisher registry unavailable");
    const { repos } = await res.json();
    if (!Array.isArray(repos)) throw new Error("Invalid publisher registry response");
    return repos.find(row => row.publisher?.toLowerCase() === publisher && row.repo === REPO) ?? null;
}

export const explorerURL = publisher => `https://fangorn.network/#/data/${publisher}/${REPO}`;
