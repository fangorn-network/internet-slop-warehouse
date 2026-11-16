// CC0. Engine-independent health, grace periods and explicit revival. Seconds everywhere.
export function attach(object, { max = 100, initial = max, invulnerability = 0.6,
    modifyDamage = amount => amount, onChange = () => {}, onDeath = () => {}, onRevive = () => {},
} = {}) {
    if (!Number.isFinite(max) || max <= 0 || !Number.isFinite(initial) || !Number.isFinite(invulnerability) || invulnerability < 0) throw new RangeError('Invalid health options');
    let value = Math.max(0, Math.min(max, initial)), grace = 0, disposed = false;
    const valid = n => Number.isFinite(n) && n > 0;
    return {
        get value() { return value; }, get max() { return max; },
        get dead() { return value === 0; }, get invulnerable() { return grace > 0; },
        damage(amount, source) {
            if (disposed || !value || grace > 0 || !valid(amount)) return 0;
            const adjusted = modifyDamage(amount, source, object);
            if (!valid(adjusted)) return 0;
            const lost = Math.min(value, adjusted); value -= lost; grace = invulnerability;
            onChange(value, -lost, source, object);
            if (!value) onDeath(object, source);
            return lost;
        },
        heal(amount) {
            if (disposed || !value || !valid(amount)) return 0;
            const gained = Math.min(max - value, amount); value += gained;
            if (gained) onChange(value, gained, null, object);
            return gained;
        },
        revive(amount = max) {
            if (disposed || value || !valid(amount)) return false;
            value = Math.min(max, amount); grace = invulnerability;
            onRevive(object); onChange(value, value, null, object); return true;
        },
        update(dt) { if (!disposed && Number.isFinite(dt) && dt > 0) grace = Math.max(0, grace - dt); },
        dispose() { disposed = true; },
    };
}
