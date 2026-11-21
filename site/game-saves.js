const MESSAGE = "warehouse:game-save";
const MAX_SIZE = 256 * 1024;

function update(entries, operation, key, value, limit) {
    const next = new Map(entries);
    if (operation === "set") next.set(key, value);
    if (operation === "remove") next.delete(key);
    if (operation === "clear") next.clear();
    if (JSON.stringify([...next]).length > limit) {
        throw new DOMException("Game save storage is full", "QuotaExceededError");
    }
    return next;
}

function readSaves(key) {
    try {
        return new Map(JSON.parse(localStorage.getItem(key) ?? "[]"));
    } catch {
        return new Map();
    }
}

export function gameSaves() {
    let active;
    const temporary = new Map();

    window.addEventListener("message", event => {
        const { data } = event;
        if (!active || event.source !== active.frame.contentWindow || event.origin !== "null" ||
            data?.type !== MESSAGE || data.session !== active.session) return;
        const { operation, key, value } = data;
        if (!["set", "remove", "clear"].includes(operation) ||
            typeof key !== "string" || typeof value !== "string" ||
            key.length + value.length > MAX_SIZE) return;
        const storageKey = active.key;
        try {
            const next = update(temporary.get(storageKey) ?? readSaves(storageKey), operation, key, value, MAX_SIZE);
            try {
                if (next.size) localStorage.setItem(storageKey, JSON.stringify([...next]));
                else localStorage.removeItem(storageKey);
                temporary.delete(storageKey);
            } catch {
                temporary.set(storageKey, next);
            }
        } catch {
            // Another tab may have filled the same game's storage since this frame started.
        }
    });

    return {
        disconnect() { active = undefined; },
        connect(frame, api, record, toScript) {
            const key = "warehouse:save:v1:" + JSON.stringify([
                api, record.publisher.toLowerCase(), record.repo ?? "internet-slop-warehouse", record.id,
            ]);
            const session = Array.from(crypto.getRandomValues(new Uint32Array(4))).join("-");
            active = { frame, key, session };
            const entries = [...(temporary.get(key) ?? readSaves(key))];
            return `(${installStorage})(${toScript(entries)},${toScript(session)},${toScript(MESSAGE)},${toScript(location.origin)},${MAX_SIZE},${update});`;
        },
    };
}

// This function runs inside the opaque-origin game document before game code.
function installStorage(initial, session, type, origin, limit, updateEntries) {
    let entries = new Map(initial);
    const post = parent.postMessage.bind(parent);
    const change = (operation, key = "", value = "") => {
        entries = updateEntries(entries, operation, key, value, limit);
        post({ type, session, operation, key, value }, origin === "null" ? "*" : origin);
    };
    const methods = {
        get length() { return entries.size; },
        key(index) { return [...entries.keys()][index >>> 0] ?? null; },
        getItem(key) { return entries.get(String(key)) ?? null; },
        setItem(key, value) { change("set", String(key), String(value)); },
        removeItem(key) { change("remove", String(key)); },
        clear() { change("clear"); },
    };
    const storage = new Proxy(methods, {
        get(target, key) { return Reflect.has(target, key) ? Reflect.get(target, key) : entries.get(key); },
        set(_target, key, value) { methods.setItem(key, value); return true; },
        deleteProperty(_target, key) { methods.removeItem(key); return true; },
        has(target, key) { return Reflect.has(target, key) || entries.has(key); },
        ownKeys() { return [...entries.keys()]; },
        getOwnPropertyDescriptor(_target, key) {
            if (entries.has(key)) return { configurable: true, enumerable: true, writable: true, value: entries.get(key) };
        },
    });
    Object.defineProperty(window, "localStorage", { value: storage });
}
