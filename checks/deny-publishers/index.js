// Refuses records from the publishers in params.publishers.
export function validate(record, { publisher, params }) {
    const denied = (params.publishers ?? []).map((p) => p.toLowerCase());
    return !denied.includes(String(publisher).toLowerCase()) || "this publisher is denied";
}
