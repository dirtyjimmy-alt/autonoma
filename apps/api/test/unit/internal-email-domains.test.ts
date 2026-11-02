import { describe, expect, it } from "vitest";
import { InternalEmailDomains } from "../../src/internal-email-domains";

describe("InternalEmailDomains", () => {
    it("falls back to INTERNAL_DOMAIN alone when INTERNAL_EMAIL_DOMAINS is unset or blank", () => {
        for (const configured of [undefined, "", " , "]) {
            const domains = new InternalEmailDomains(configured, "autonoma.app");
            expect(domains.includes("staff@autonoma.app")).toBe(true);
            expect(domains.includes("someone@example.com")).toBe(false);
        }
    });

    it("treats the configured list as the whole list, so the cookie domain can differ from staff mail", () => {
        // INTERNAL_DOMAIN=shs.cx is the cookie parent; staff sign in as @sshs.ai.
        const domains = new InternalEmailDomains("sshs.ai,shs.cx", "shs.cx");
        expect(domains.includes("owner@sshs.ai")).toBe(true);
        expect(domains.includes("owner@shs.cx")).toBe(true);
        expect(domains.includes("owner@autonoma.app")).toBe(false);
    });

    it("does not imply INTERNAL_DOMAIN when the list names other domains only", () => {
        const domains = new InternalEmailDomains("sshs.ai", "shs.cx");
        expect(domains.includes("owner@sshs.ai")).toBe(true);
        expect(domains.includes("owner@shs.cx")).toBe(false);
    });

    it("normalises whitespace, case and a leading @ in the configuration and the address", () => {
        const domains = new InternalEmailDomains(" @SSHS.ai , shs.cx ", "shs.cx");
        expect(domains.includes("Owner@SSHS.AI")).toBe(true);
        expect(domains.includes("owner@shs.cx ")).toBe(true);
    });

    it("matches the whole domain, never a suffix or a subdomain", () => {
        const domains = new InternalEmailDomains("shs.cx", "shs.cx");
        expect(domains.includes("owner@notshs.cx")).toBe(false);
        expect(domains.includes("owner@mail.shs.cx")).toBe(false);
    });

    it("refuses an address without a domain part", () => {
        const domains = new InternalEmailDomains(undefined, "shs.cx");
        expect(domains.includes("owner")).toBe(false);
        expect(domains.includes("")).toBe(false);
    });
});
