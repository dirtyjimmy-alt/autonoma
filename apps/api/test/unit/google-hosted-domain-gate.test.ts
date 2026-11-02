import { describe, expect, it } from "vitest";
import { GoogleHostedDomainGate } from "../../src/google-hosted-domain-gate";

describe("GoogleHostedDomainGate", () => {
    it("admits every account, including consumer ones, when GOOGLE_ALLOWED_HD is unset or blank", () => {
        for (const configured of [undefined, "", " , "]) {
            const gate = new GoogleHostedDomainGate(configured);
            expect(gate.enabled).toBe(false);
            expect(gate.allows(undefined)).toBe(true);
            expect(gate.allows("anything.example")).toBe(true);
        }
    });

    it("admits only the listed Workspace domains once configured", () => {
        const gate = new GoogleHostedDomainGate("sshs.ai,shs.cx");
        expect(gate.enabled).toBe(true);
        expect(gate.allows("sshs.ai")).toBe(true);
        expect(gate.allows("shs.cx")).toBe(true);
        expect(gate.allows("autonoma.app")).toBe(false);
    });

    it("rejects an account without an hd claim, which is how Google marks a consumer account", () => {
        const gate = new GoogleHostedDomainGate("sshs.ai");
        expect(gate.allows(undefined)).toBe(false);
        expect(gate.allows("")).toBe(false);
    });

    it("normalises whitespace, case and a leading @ in the configuration and the claim", () => {
        const gate = new GoogleHostedDomainGate(" @SSHS.ai , shs.cx ");
        expect(gate.allows("SSHS.AI")).toBe(true);
        expect(gate.allows(" shs.cx ")).toBe(true);
    });

    it("matches the whole domain, never a suffix or a subdomain", () => {
        const gate = new GoogleHostedDomainGate("shs.cx");
        expect(gate.allows("notshs.cx")).toBe(false);
        expect(gate.allows("mail.shs.cx")).toBe(false);
    });
});
