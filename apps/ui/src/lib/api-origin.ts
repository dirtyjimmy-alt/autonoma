import { isPreviewHostname } from "@autonoma/types";
import { env } from "env";

/**
 * The API origin for data-plane calls that must bypass CloudFront: the app
 * host (autonoma.app) sits behind CloudFront, whose WAF/buffering can 403 or
 * mangle request bodies (a large `apply_config` document, a password
 * containing characters that trip injection rules) and interfere with
 * streaming HTTP. `api.<app-host>` is direct to the ALB, off CloudFront.
 * Localhost and per-PR previews reach the API cross-origin at VITE_API_URL,
 * and so does a deployment that publishes its API on a hostname of its own
 * (an https VITE_API_URL off the UI's host): there is no `api.<app-host>` to
 * derive, the configured origin is the API.
 */
export function getApiOrigin(): string {
    const isPreview = isPreviewHostname(window.location.hostname, env.VITE_INTERNAL_DOMAIN);
    const isLocalhost = window.location.hostname === "localhost";
    const configured = new URL(env.VITE_API_URL);
    const hasDedicatedApiHost = configured.protocol === "https:" && configured.hostname !== window.location.hostname;
    if (isPreview || isLocalhost || hasDedicatedApiHost) return env.VITE_API_URL;
    return `https://api.${window.location.hostname}`;
}
