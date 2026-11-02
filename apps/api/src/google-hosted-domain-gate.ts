import { parseDomainList } from "./parse-domain-list";

/**
 * Restricts Google sign-in to the Workspace domains named in `GOOGLE_ALLOWED_HD`.
 *
 * `hd` is Google's own statement of which Workspace domain administers the account, and a consumer
 * account carries none. The id token claim is what gates: the `hd` *request* parameter only
 * pre-selects an account in Google's chooser, and the user can still pick another. Unset admits
 * every Google account, which is what every existing deployment had.
 */
export class GoogleHostedDomainGate {
    private readonly allowed: ReadonlySet<string>;

    constructor(configured: string | undefined) {
        this.allowed = parseDomainList(configured);
    }

    get enabled(): boolean {
        return this.allowed.size > 0;
    }

    allows(hostedDomain: string | undefined): boolean {
        if (!this.enabled) return true;
        if (hostedDomain == null) return false;
        return this.allowed.has(hostedDomain.trim().toLowerCase());
    }
}
