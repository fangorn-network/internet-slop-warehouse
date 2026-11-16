// Browse existing records without requiring publishers to migrate their metadata.
const genres = [
    ['action', 'Action & arcade', ['action', 'arcade', 'shooter', 'fps', 'combat', 'arena', 'survivor', 'bullet-hell']],
    ['adventure', 'Adventure & exploration', ['adventure', 'exploration', 'explore', 'walking-simulator', 'open-world', 'narrative', 'mystery']],
    ['survival', 'Survival & crafting', ['survival', 'crafting', 'homestead', 'settlement', 'building']],
    ['puzzle', 'Puzzle & strategy', ['puzzle', 'strategy', 'tactics', 'turn-based', 'tower-defense']],
    ['platformer', 'Platformers & racing', ['platformer', 'platforming', 'racing', 'driving', 'parkour']],
    ['simulation', 'Simulation & sandbox', ['simulation', 'simulator', 'sandbox', 'cozy', 'garden', 'gardening', 'physics']],
];
const assetTypes = [['models', '3D models'], ['images', 'Textures & images'], ['audio', 'Audio'], ['documents', 'Guides & documents'], ['packs', 'Asset packs']];
const behaviors = [['controller', 'Controls & movement'], ['ai', 'AI & behavior'], ['rule', 'Rules & systems'], ['camera', 'Cameras'], ['effect', 'Effects']];
const skills = [['recipe', 'Recipes'], ['guide', 'Skills']];
const normalize = value => String(value).trim().toLowerCase().replace(/[\s_]+/g, '-');
export function categoriesFor(record) {
    const p = record.payload;
    const tags = new Set((p.tags ?? []).map(normalize));
    let ids = [];
    if (record.type === 'game') ids = genres.filter(([, , words]) => words.some(word => tags.has(word))).map(([id]) => id);
    if (record.type === 'logic') ids = behaviors.filter(([id]) => normalize(p.kind ?? '') === id || tags.has(id)).map(([id]) => id);
    if (record.type === 'skill') ids = [tags.has('recipe') ? 'recipe' : 'guide'];
    if (record.type === 'asset') {
        const mime = (p.mime ?? '').toLowerCase().split(';')[0].trim();
        if (mime.startsWith('model/') || ['gltf', 'glb', 'model', '3d-model'].some(t => tags.has(t))) ids.push('models');
        if (mime.startsWith('image/')) ids.push('images');
        if (mime.startsWith('audio/')) ids.push('audio');
        if (mime.startsWith('text/') || mime === 'application/pdf') ids.push('documents');
        if (['application/zip', 'application/x-zip-compressed', 'application/gzip'].includes(mime) || tags.has('asset-pack')) ids.push('packs');
    }
    return ids.length ? ids : ['other'];
}
export function categoryOptions(records, kind) {
    const stock = records.filter(r => r.type === kind);
    const definitions = kind === 'game' ? genres : kind === 'asset' ? assetTypes : kind === 'skill' ? skills : kind === 'logic' ? behaviors : [];
    return [['all', 'All categories', stock.length], ...[...definitions, ['other', 'Other']].map(([id, label]) =>
        [id, label, stock.filter(r => categoriesFor(r).includes(id)).length]).filter(([, , count]) => count > 0)];
}
