import { generateText, Output } from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const requestSchema = z.object({
    model: z.string(),
    messages: z.array(
        z.object({
            role: z.string(),
            content: z.union([
                z.string(),
                z.array(
                    z
                        .object({
                            type: z.string(),
                            video_url: z.object({ url: z.string() }).optional(),
                        })
                        .passthrough(),
                ),
            ]),
        }),
    ),
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe("direct Z.ai Chat Completions transport", () => {
    it("uses JSON mode while preserving schema validation", async () => {
        vi.stubEnv("ZAI_API_KEY", "test-only-zai-key");
        vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
            const body = requestSchema
                .extend({
                    response_format: z.object({ type: z.literal("json_object") }).strict(),
                })
                .parse(JSON.parse(String(init.body)));
            expect(JSON.stringify(body.messages[0]?.content)).toContain("success");
            return Response.json({
                id: "test-json",
                created: 1,
                model: "glm-5.3-flash",
                choices: [
                    { index: 0, finish_reason: "stop", message: { role: "assistant", content: '{"success":true}' } },
                ],
                usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 },
            });
        });
        const { MODEL_ENTRIES } = await import("../src/registry/model-entries");
        const result = await generateText({
            model: MODEL_ENTRIES.ZAI_GLM_FLASH.createModel(),
            prompt: "Return success.",
            output: Output.object({ schema: z.object({ success: z.boolean() }) }),
        });
        expect(result.output).toEqual({ success: true });
    });

    it("sends video to Z.ai and returns its completion and token usage", async () => {
        vi.stubEnv("ZAI_API_KEY", "test-only-zai-key");
        vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
            expect(url).toBe("https://api.z.ai/api/paas/v4/chat/completions");
            const body = requestSchema.parse(JSON.parse(String(init.body)));
            expect(body.model).toBe("glm-5.3-flash");
            expect(body.messages[0]?.content).toEqual([
                { type: "text", text: "Describe this recording" },
                { type: "video_url", video_url: { url: "data:video/mp4;base64,AQID" } },
            ]);
            return Response.json({
                id: "test-completion",
                created: 1,
                model: "glm-5.3-flash",
                choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: "A login page" } }],
                usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 },
            });
        });
        const { MODEL_ENTRIES } = await import("../src/registry/model-entries");
        const result = await MODEL_ENTRIES.ZAI_GLM_FLASH.createModel().doGenerate({
            prompt: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Describe this recording" },
                        { type: "file", data: new Uint8Array([1, 2, 3]), mediaType: "video/mp4" },
                    ],
                },
            ],
        });
        expect(result.content).toContainEqual({ type: "text", text: "A login page" });
        expect(result.usage.inputTokens.total).toBe(100);
        expect(result.usage.outputTokens.total).toBe(10);
    });
});
