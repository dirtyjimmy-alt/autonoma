import { ZAI_MODEL } from "@autonoma/types";
import { InlineMp4VideoUploader } from "../object/video/inline-mp4-video-uploader";
import type { VideoUploader } from "../object/video/video-processor";
import { type CostFunction, inputCacheCostFunction } from "./costs";
import type { LanguageModel } from "./model-registry";
import { zaiProvider } from "./providers";

export interface ModelEntry {
    createModel: () => LanguageModel;
    pricing: CostFunction;
    createUploader?: () => VideoUploader;
}

const GLM_FLASH_ENTRY: ModelEntry = {
    createModel: () => zaiProvider.getModel(ZAI_MODEL.id),
    pricing: inputCacheCostFunction(ZAI_MODEL),
    createUploader: () => new InlineMp4VideoUploader(),
};

// Historical keys remain compatible with persisted run configurations. Every slot resolves
// directly to Z.ai; none of these aliases enables a fallback to its former provider.
export const MODEL_ENTRIES = {
    ZAI_GLM_FLASH: GLM_FLASH_ENTRY,
    GEMINI_3_FLASH_PREVIEW: GLM_FLASH_ENTRY,
    GEMINI_3_5_FLASH_LITE: GLM_FLASH_ENTRY,
    QWEN3_VL_32B: GLM_FLASH_ENTRY,
    MINISTRAL_8B: GLM_FLASH_ENTRY,
    GPT_OSS_120B: GLM_FLASH_ENTRY,
    MINIMAX_M3: GLM_FLASH_ENTRY,
};

export const OPENROUTER_MODEL_ENTRIES = MODEL_ENTRIES;
