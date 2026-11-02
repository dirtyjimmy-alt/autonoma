/**
 * A comma-separated list of domains from the environment, normalised for comparison with the domain
 * part of an email address or an id token claim: trimmed, lower-cased, a leading `@` dropped, empty
 * entries ignored. A `Set` because every caller asks "is this domain one of them?".
 */
export function parseDomainList(raw: string | undefined): ReadonlySet<string> {
    const domains = (raw ?? "")
        .split(",")
        .map((entry) => entry.trim().toLowerCase().replace(/^@/, ""))
        .filter((entry) => entry.length > 0);
    return new Set(domains);
}
