import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ObjectGenerator } from "../src/object/object-generator";
import { MODEL_ENTRIES } from "../src/registry/model-entries";
import { ModelRegistry } from "../src/registry/model-registry";

const VIDEO_PATH = path.join(__dirname, "artifacts/video.webm");

describe("video analysis", () => {
    it.skipIf(!fs.existsSync(VIDEO_PATH))(
        "should analyze a card creation video and detect the created card nickname",
        async () => {
            const registry = new ModelRegistry({
                models: { GEMINI: MODEL_ENTRIES.GEMINI_3_FLASH_PREVIEW },
            });
            const { model, uploader } = registry.getVideoModel({
                model: "GEMINI",
                tag: "video-analysis-test",
            });

            const uploadedVideo = await uploader.uploadVideo({
                data: { type: "file", path: VIDEO_PATH },
                mimeType: "video/webm",
            });
            expect(uploadedVideo).toBeDefined();

            const schema = z.object({
                cardCreated: z.boolean().describe("Whether a card was successfully created in the flow"),
                nickname: z.string().describe("The nickname of the created card"),
            });

            const generator = new ObjectGenerator({
                model,
                schema,
                systemPrompt: "You are a QA assistant that analyzes videos of application flows.",
            });

            const result = await generator.generate({
                userPrompt:
                    "Analyze this video of a card creation flow. Was a card successfully created? If so, what is the nickname of the card that was created?",
                video: uploadedVideo,
            });

            expect(result).toBeDefined();
            expect(result.cardCreated).toBe(true);
            expect(result.nickname).toBe("Lunch Card");
        },
        120000,
    );
});
