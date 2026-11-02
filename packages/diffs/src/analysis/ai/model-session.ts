import {
    CostCollector,
    type LanguageModel,
    MODEL_ENTRIES,
    type ModelOptions,
    ModelRegistry,
    type VideoModel,
} from "@autonoma/ai";
import { logger as rootLogger } from "@autonoma/logger";
import { ZAI_MODEL } from "@autonoma/types";

const logger = rootLogger.child({ name: "openModelSession" });
const MODEL_ID = ZAI_MODEL.id;

export type InvestigationModelName = "smart-video" | "classifier" | "reporter" | "impact";

export interface InvestigationModelConfig {
    classifierModelId?: string;
    reporterModelId?: string;
    impactModelId?: string;
    videoModelId?: string;
}

export interface ModelSession {
    getModel(options: ModelOptions<InvestigationModelName>): LanguageModel;
    getVideoModel(options: ModelOptions<InvestigationModelName>): VideoModel;
    readonly costCollector: CostCollector;
}

export function openModelSession(config: InvestigationModelConfig): ModelSession {
    logger.info("Opening Z.ai investigation model session");
    for (const modelId of Object.values(config)) {
        if (modelId != null && modelId !== MODEL_ID) {
            throw new Error(`Unsupported investigation model "${modelId}"; configure ${MODEL_ID}`);
        }
    }
    const registry = new ModelRegistry<InvestigationModelName>({
        models: {
            "smart-video": MODEL_ENTRIES.ZAI_GLM_FLASH,
            classifier: MODEL_ENTRIES.ZAI_GLM_FLASH,
            reporter: MODEL_ENTRIES.ZAI_GLM_FLASH,
            impact: MODEL_ENTRIES.ZAI_GLM_FLASH,
        },
    });
    const costCollector = new CostCollector();
    logger.info("Opened Z.ai investigation model session");
    return {
        getModel: (options) => registry.getModel(options, costCollector),
        getVideoModel: (options) => registry.getVideoModel(options, costCollector),
        costCollector,
    };
}
