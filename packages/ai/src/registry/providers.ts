import { logger as rootLogger } from "@autonoma/logger";
import { ZAI_MODEL } from "@autonoma/types";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { env } from "../env";
import type { LanguageModel } from "./model-registry";
import { zaiFetch } from "./zai-fetch";

const logger = rootLogger.child({ name: "zaiProvider" });

// The OpenRouter SDK supplies the Chat Completions transport, including video_url
// encoding. Its base URL is pinned to Z.ai, so no request goes through OpenRouter.
export const zaiProvider = {
    getModel(modelId: typeof ZAI_MODEL.id): LanguageModel {
        logger.info("Resolving Z.ai model", { modelId });
        const provider = createOpenRouter({
            apiKey: env.ZAI_API_KEY,
            baseURL: ZAI_MODEL.baseUrl,
            fetch: zaiFetch,
        });
        return provider.languageModel(modelId);
    },
};
