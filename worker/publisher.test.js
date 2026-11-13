import { test, expect } from "vitest";
import { memoryNetwork } from "@fangorn-network/sdk/lib/test/testbed.js";
import { MEM_DOMAIN } from "@fangorn-network/sdk/lib/test/mem-registry.js";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { publishPartAs } from "./tools.js";
import { REPO } from "../part.js";

test("the warehouse publishes a part into the publisher's own repo, on the publisher's signature only", async () => {
    const net = memoryNetwork();
    const store = await net.client(), alice = privateKeyToAccount(generatePrivateKey()), mallory = privateKeyToAccount(generatePrivateKey());
    const as = (signer) => ({ fangorn: store, owner: alice.address, domain: MEM_DOMAIN, sign: (td) => signer.signTypedData(td) });
    const crate = { type: "asset", id: "crate", title: "crate", bytes: new Uint8Array([1, 2, 3]), mime: "application/octet-stream" };

    const r = await publishPartAs(as(alice), crate);
    expect(r.publisher).toBe(alice.address.toLowerCase());
    const rec = await store.engine.readRecord(alice.address, REPO, "crate");
    expect(rec.cid).toBe(r.cid);
    expect(await store.engine.readRecord(store.getAddress(), REPO, "crate").catch(() => null)).toBeFalsy(); // not the warehouse's

    // a second commit builds on alice's head, and pins without a publisher are hers
    await publishPartAs(as(alice), { type: "game", id: "g", title: "g", content: "<title>g</title>", uses: [{ id: "crate" }] });
    expect((await store.engine.readRecord(alice.address, REPO, "g")).payload.uses[0]).toMatchObject({ publisher: alice.address.toLowerCase(), id: "crate" });

    // anyone else's signature is refused before anything is sent
    await expect(publishPartAs(as(mallory), { ...crate, id: "evil" })).rejects.toThrow(/isn't your wallet's/);
    expect(await store.engine.readRecord(alice.address, REPO, "evil").catch(() => null)).toBeFalsy();
});
