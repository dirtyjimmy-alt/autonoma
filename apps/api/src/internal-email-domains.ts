import { parseDomainList } from "./parse-domain-list";

/**
 * Which email domains mark an account as internal - dropped into the internal organization as an
 * admin on its first sign-in (see `ensureOrgMembership` in auth.ts).
 *
 * `INTERNAL_DOMAIN` has two jobs: it is the parent of the cross-subdomain session cookie, and it
 * was the one internal email domain. Those coincide only when staff mail runs on the domain the app
 * is served from. `INTERNAL_EMAIL_DOMAINS` separates them. When it is set it is the whole list -
 * `INTERNAL_DOMAIN` is internal only if named there - and when it is unset the list is
 * `INTERNAL_DOMAIN` alone, which is what every existing deployment had.
 */
export class InternalEmailDomains {
    private readonly domains: ReadonlySet<string>;

    constructor(configured: string | undefined, internalDomain: string) {
        const parsed = parseDomainList(configured);
        this.domains = parsed.size > 0 ? parsed : parseDomainList(internalDomain);
    }

    includes(email: string): boolean {
        const at = email.lastIndexOf("@");
        if (at < 0) return false;
        const domain = email
            .slice(at + 1)
            .trim()
            .toLowerCase();
        return this.domains.has(domain);
    }
}
