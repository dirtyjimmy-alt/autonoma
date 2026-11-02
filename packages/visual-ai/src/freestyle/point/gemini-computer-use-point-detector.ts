import { MODEL_ENTRIES, ModelRegistry, ObjectGenerator } from "@autonoma/ai";
import type { ScreenResolution, Screenshot } from "@autonoma/image";
import { logger as rootLogger } from "@autonoma/logger";
import type { FunctionCall } from "@google/genai";
import z from "zod";
import { PointDetector } from "./point-detector";

export class GeminiNoToolCallsError extends Error {
    constructor(public readonly instruction: string) {
        super("No tool call was returned by the Gemini model");
    }
}

export class GeminiInvalidToolCallsError extends Error {
    constructor(
        public readonly instruction: string,
        public readonly toolCalls: FunctionCall[],
    ) {
        super(
            `Invalid tool calls were returned by the Gemini model for instruction "${instruction}": ${toolCalls.map((toolCall) => toolCall.name).join(", ")}`,
        );
    }
}

export type GeminiComputerUseToolName =
    | "open_web_browser"
    | "wait_5_seconds"
    | "go_back"
    | "go_forward"
    | "search"
    | "navigate"
    | "click_at"
    | "hover_at"
    | "type_text_at"
    | "key_combination"
    | "scroll_document"
    | "scroll_at"
    | "drag_and_drop";

const clickAtToolSchema = z.object({
    name: z.literal("click_at"),
    args: z.object({
        x: z.number(),
        y: z.number(),
    }),
});

const computeUseToolSchema = z.discriminatedUnion("name", [clickAtToolSchema]);
export type GoogleToolCall = z.infer<typeof computeUseToolSchema>;

/** Compatibility adapter for callers of the former computer-use model. */
export class GeminiComputerUseModel {
    private readonly logger = rootLogger.child({ name: this.constructor.name });
    private readonly generator: ObjectGenerator<{ x: number; y: number }>;

    constructor(systemPrompt: string) {
        const registry = new ModelRegistry({ models: { pointer: MODEL_ENTRIES.ZAI_GLM_FLASH } });
        this.generator = new ObjectGenerator({
            model: registry.getModel({ model: "pointer", tag: "computer-use-point" }),
            schema: z.object({ x: z.number().min(0).max(1000), y: z.number().min(0).max(1000) }),
            systemPrompt: systemPrompt + " Return the click point as x and y coordinates normalized to 0–1000.",
        });
    }

    public async request(
        screenshot: Screenshot,
        instruction: string,
        resolution: ScreenResolution,
    ): Promise<GoogleToolCall[]> {
        this.logger.info("Locating a click point with Z.ai", { resolution });
        const point = await this.generator.generate({ userPrompt: instruction, images: [screenshot] });
        const result: GoogleToolCall = {
            name: "click_at",
            args: {
                x: Math.round((point.x / 1000) * resolution.width),
                y: Math.round((point.y / 1000) * resolution.height),
            },
        };
        this.logger.info("Located click point with Z.ai");
        return [result];
    }
}

export class FreestyleClickNoItemFoundError extends Error {
    constructor(public readonly instruction: string) {
        super(`No item found for instruction "${instruction}"`);
    }
}

export class FreestyleClickToolCallsError extends Error {
    constructor(public readonly instruction: string) {
        super(`Multiple tool calls for instruction "${instruction}"`);
    }
}

export class FreestyleClickNoClickAtToolCallError extends Error {
    constructor(public readonly instruction: string) {
        super(`No click_at tool call for instruction "${instruction}"`);
    }
}

export const DEFAULT_SYSTEM_PROMPT =
    "Your task is to perform a single click on the screen, according to the user's instruction.";

export class GeminiComputerUsePointDetector extends PointDetector {
    private readonly computerUseModel: GeminiComputerUseModel;

    constructor(systemPrompt?: string) {
        super();
        this.computerUseModel = new GeminiComputerUseModel(systemPrompt ?? DEFAULT_SYSTEM_PROMPT);
    }

    protected async detectPointForResolution(
        screenshot: Screenshot,
        prompt: string,
        screenResolution: ScreenResolution,
    ): Promise<{ x: number; y: number }> {
        const toolCalls = await this.computerUseModel.request(screenshot, prompt, screenResolution);

        if (toolCalls.length === 0) throw new FreestyleClickNoItemFoundError(prompt);
        if (toolCalls.length > 1) throw new FreestyleClickToolCallsError(prompt);

        // biome-ignore lint/style/noNonNullAssertion: Length > 0
        const toolCall = toolCalls[0]!;

        if (toolCall.name !== "click_at") throw new FreestyleClickNoClickAtToolCallError(prompt);

        return toolCall.args;
    }
}
