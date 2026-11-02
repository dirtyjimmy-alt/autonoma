import { logger as rootLogger } from "@autonoma/logger";
import { APIError } from "better-auth/api";
import { z } from "zod";

const logger = rootLogger.child({ name: "parseAuthentikProfile" });
const profileSchema = z.object({
    sub: z.string().min(1),
    email: z.email(),
    email_verified: z.literal(true),
    name: z.string().optional(),
    preferred_username: z.string().optional(),
});

export function parseAuthentikProfile(profile: unknown) {
    logger.info("Validating authentik identity");
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) {
        logger.warn("Refusing authentik identity without a verified email");
        throw new APIError("FORBIDDEN", { message: "A verified email address is required." });
    }
    logger.info("Validated authentik identity");
    return {
        id: parsed.data.sub,
        email: parsed.data.email,
        emailVerified: true,
        name: parsed.data.name ?? parsed.data.preferred_username ?? parsed.data.email,
    };
}
