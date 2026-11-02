import { describe, expect, it } from "vitest";
import { parseAuthentikProfile } from "../../src/parse-authentik-profile";

describe("authentik identity boundary", () => {
    it("accepts a verified identity and uses its immutable subject", () => {
        expect(
            parseAuthentikProfile({
                sub: "subject-123",
                email: "person@example.com",
                email_verified: true,
                preferred_username: "person",
            }),
        ).toEqual({ id: "subject-123", email: "person@example.com", emailVerified: true, name: "person" });
    });

    it.each([false, undefined, "true"])("refuses an unverified email (%s)", (emailVerified) => {
        expect(() =>
            parseAuthentikProfile({
                sub: "subject-123",
                email: "person@example.com",
                email_verified: emailVerified,
            }),
        ).toThrow("A verified email address is required.");
    });

    it("refuses identities without an email or subject", () => {
        expect(() => parseAuthentikProfile({ sub: "subject-123", email_verified: true })).toThrow();
        expect(() => parseAuthentikProfile({ email: "person@example.com", email_verified: true })).toThrow();
    });
});
