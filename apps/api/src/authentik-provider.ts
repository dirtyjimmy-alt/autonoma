import { logger as rootLogger } from "@autonoma/logger";
import { genericOAuth } from "better-auth/plugins";
import { parseAuthentikProfile } from "./parse-authentik-profile";

const logger = rootLogger.child({ name: "authentikProvider" });

interface AuthentikConfig {
    issuer: string;
    clientId: string;
    clientSecret: string;
}

export function authentikProvider(config: AuthentikConfig): ReturnType<typeof genericOAuth> {
    logger.info("Configuring authentik OIDC", { issuer: config.issuer });
    const issuer = `${config.issuer.replace(/\/$/, "")}/`;
    return genericOAuth({
        config: [
            {
                providerId: "authentik",
                clientId: config.clientId,
                clientSecret: config.clientSecret,
                discoveryUrl: `${issuer}.well-known/openid-configuration`,
                issuer,
                pkce: true,
                scopes: ["openid", "profile", "email"],
                mapProfileToUser: parseAuthentikProfile,
            },
        ],
    });
}
