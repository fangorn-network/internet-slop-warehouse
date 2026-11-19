// The text agents read, free of the common prompt-injection moves. A heuristic: it catches the blatant, not the clever.
const PATTERNS = [
    [/\b(ignore|disregard|forget)\b[^.\n]{0,40}\b(previous|prior|above|earlier|all|your)\b[^.\n]{0,20}\b(instructions|prompts?|rules|guidelines)\b/i, "tells the agent to ignore its instructions"],
    [/\byou are now\b[^.\n]{0,30}\b(DAN|jailbroken|developer mode|unrestricted)\b/i, "tries to jailbreak the agent"],
    [/\b(curl|wget|iwr|Invoke-WebRequest)\b[^\n|]{0,200}\|\s*(sudo\s+)?(ba|z|da)?sh\b/i, "pipes a download into a shell"],
    [/\bbase64\s+(-d|--decode)\b[^\n]{0,100}\|\s*(ba|z)?sh\b/i, "pipes decoded base64 into a shell"],
    [/\brm\s+-rf\s+(\/|~|\$HOME)(\s|$)/, "deletes a home or root directory"],
    [/(~|\$HOME)\/\.(ssh|aws|gnupg|fangorn)\b|\bid_rsa\b|\.aws\/credentials/i, "points at credentials"],
    [/[\u{E0000}-\u{E007F}]/u, "hides text in invisible Unicode tag characters"],
];

const textOf = (record, file) => {
    if (!file) return "";
    const s = new TextDecoder().decode(file);
    if (/^text\//.test(record.payload?.mime ?? "")) return s;
    try { const j = JSON.parse(s); return [j?.md, j?.text].filter((x) => typeof x === "string").join("\n"); } catch { return ""; }
};

export function validate(record, { file, params }) {
    const fields = params.fields ?? ["title", "description"];
    const texts = fields.map((f) => [f, record.payload?.[f]]).filter(([, v]) => typeof v === "string");
    if (params.file !== false) texts.push(["file", textOf(record, file)]);
    for (const [where, text] of texts)
        for (const [re, what] of PATTERNS) if (re.test(text)) return `its ${where} ${what}`;
    return true;
}
