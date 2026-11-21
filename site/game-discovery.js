import { categoriesFor } from "./catalog.js";

export const gameKey = game => JSON.stringify([game.publisher.toLowerCase(), game.repo ?? "internet-slop-warehouse", game.id]);

export function gameHistory(scope) {
    const storageKey = "warehouse:game-history:v1:" + scope;
    let history;
    try { history = new Map(JSON.parse(localStorage.getItem(storageKey) ?? "[]")); }
    catch { history = new Map(); }
    function mark(game, patch) {
        const key = gameKey(game);
        const entry = { ...history.get(key), ...patch };
        history.delete(key);
        history.set(key, entry);
        if (history.size > 5000) history.delete(history.keys().next().value);
        try { localStorage.setItem(storageKey, JSON.stringify([...history])); }
        catch { /* Keep the current page's preferences if browser storage is unavailable. */ }
    }
    return {
        entry: game => history.get(gameKey(game)) ?? {},
        played(game) { mark(game, { played: true }); },
        vote(game, vote) { mark(game, { vote }); },
    };
}

// Shrink tiny vote samples toward neutral so one like cannot dominate a well-rated game.
export function communityRating([likes, dislikes]) {
    return (likes - dislikes) / (likes + dislikes + 8);
}

function features(game) {
    const tags = (game.payload.tags ?? []).map(tag => "tag:" + String(tag).trim().toLowerCase()).slice(0, 24);
    const categories = categoriesFor(game).filter(id => id !== "other").map(id => "genre:" + id);
    return new Set([...categories, ...tags]);
}

export function playNext(games, history, tally, count = 3) {
    const taste = new Map();
    for (const game of games) {
        const { vote } = history.entry(game);
        if (!vote) continue;
        for (const feature of features(game)) taste.set(feature, (taste.get(feature) ?? 0) + vote);
    }
    const eligible = [];
    for (const game of games) {
        const { played, vote } = history.entry(game);
        if (played || vote === -1) continue;
        let affinity = 0;
        for (const feature of features(game)) {
            const weight = Math.max(-3, Math.min(3, taste.get(feature) ?? 0));
            affinity += weight * (feature.startsWith("genre:") ? 2 : 1);
        }
        const rating = communityRating(tally(game));
        eligible.push({ game, affinity, rating });
    }
    eligible.sort((a, b) => b.affinity - a.affinity || b.rating - a.rating ||
        gameKey(a.game).localeCompare(gameKey(b.game)));
    return eligible.slice(0, count).map(({ game, affinity, rating }) => ({
        game,
        reason: affinity > 0 ? "Similar to games you liked" : rating > 0 ? "Liked by players" : "New to you",
    }));
}
