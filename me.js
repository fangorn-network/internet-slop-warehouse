// Who is publishing. On the sandbox (the default): a sandbox key by name, AS=bob (default alice).
// With NETWORK=baseSepolia (or arbitrumSepolia): your fangorn CLI identity, ~/.fangorn/config.json.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { privateKeyToAccount } from "viem/accounts";
import { client } from "@fangorn-network/westmarch/client";
import { readSandbox } from "@fangorn-network/westmarch/sandbox";

export function me() {
    const network = process.env.NETWORK ?? "sandbox";
    if (network !== "sandbox") {
        const cfg = JSON.parse(readFileSync(join(homedir(), ".fangorn", "config.json"), "utf8"));
        if (!cfg.privateKey) throw new Error("~/.fangorn/config.json has no privateKey: run `fangorn init`");
        // ponytail: signed-url storage only (what a config without a Pinata JWT uses)
        const deployment = cfg.signedUrlWorkerUrl ? { signedUrlWorker: cfg.signedUrlWorkerUrl.replace(/\/$/, "") } : {};
        const fangorn = client({ network, deployment }, cfg.privateKey);
        return { fangorn, name: "you", network, resolve: (who) => who };
    }
    const sandbox = process.env.SANDBOX ?? ".sandbox", { keys } = readSandbox(sandbox);
    const name = process.env.AS ?? "alice";
    if (!keys[name]) throw new Error(`AS=${name}: one of ${Object.keys(keys).join(", ")}`);
    const resolve = (who) => keys[who] ? privateKeyToAccount(keys[who]).address : who;
    return { fangorn: client({ network: "sandbox", sandbox }, keys[name]), name, network, resolve };
}
