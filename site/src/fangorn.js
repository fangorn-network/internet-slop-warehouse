// The page's door to Fangorn: read a publisher's record and the file it points at, from the chain and storage.
// Bundled into ../fangorn.js (npm run build). Reads only: the key is a throwaway, nothing is signed.
import { Fangorn, FangornConfig, SupportedNetworks } from "@fangorn-network/sdk";
import { generatePrivateKey } from "viem/accounts";

const clients = {};
const reader = (network) => (clients[network] ??= Fangorn.create({
    privateKey: generatePrivateKey(),
    config: { ...FangornConfig, ...SupportedNetworks[network] },
    storage: { signedUrl: {} },
}));

/** The record `publisher/repo/id` points at a JSON file in `payload.src`: that file, and the record. */
export async function readPointed({ network, publisher, repo, id }) {
    const fangorn = reader(network);
    const record = await fangorn.engine.readRecord(publisher, repo, id);
    if (!record) throw new Error(`no record ${publisher}/${repo}/${id} on ${network}`);
    const file = JSON.parse(new TextDecoder().decode(await fangorn.getStorage().getFile(record.payload.src)));
    return { record, file };
}

/** The repo's head commit: cheap (one contract read), to tell when to read again. */
export const headOf = ({ network, publisher, repo }) => reader(network).onChainTip(publisher, repo);
