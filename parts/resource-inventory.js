// CC0. Atomic resource transactions: a failed trade never consumes half its cost.
export function attach(object, { capacity = 12, initial = {}, weights = {}, onChange = () => {}, onReject = () => {} } = {}) {
    if (!Number.isFinite(capacity) || capacity < 0) throw new RangeError('Invalid capacity');
    const weight = key => Object.hasOwn(weights, key) ? weights[key] : 1;
    for (const n of Object.values(weights)) if (!Number.isFinite(n) || n < 0) throw new RangeError('Invalid weight');
    let counts = Object.assign(Object.create(null), initial), disposed = false;
    const load = c => Object.entries(c).reduce((s, [k,n]) => s + n * weight(k), 0);
    if (Object.values(counts).some(n=>!Number.isSafeInteger(n)||n<0) || load(counts)>capacity) throw new RangeError('Invalid initial inventory');
    return {
        count(key) { return counts[key] ?? 0; },
        get items() { return { ...counts }; }, get load() { return load(counts); }, get capacity() { return capacity; },
        transact(delta) {
            if (disposed) return false;
            const next = Object.assign(Object.create(null), counts);
            for (const [key,n] of Object.entries(delta)) {
                if (!Number.isSafeInteger(n) || !Number.isSafeInteger((next[key] ?? 0)+n) || (next[key] ?? 0)+n<0) { onReject('resources', delta, object); return false; }
                next[key] = (next[key] ?? 0)+n;
            }
            if (load(next)>capacity) { onReject('capacity', delta, object); return false; }
            counts = next; onChange({ ...counts }, { ...delta }, object); return true;
        },
        update() {}, dispose() { disposed = true; },
    };
}
