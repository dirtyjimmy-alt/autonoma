import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { zaiFetch } from "../src/registry/zai-fetch";

afterEach(() => vi.unstubAllGlobals());

describe("Z.ai reasoning transport", () => {
    it("preserves reasoning across a tool-loop request and fragmented SSE response", async () => {
        vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
            const body = z
                .object({
                    messages: z.array(
                        z
                            .object({
                                role: z.string(),
                                reasoning_content: z.string(),
                            })
                            .strict(),
                    ),
                })
                .parse(JSON.parse(String(init.body)));
            expect(body.messages).toEqual([{ role: "assistant", reasoning_content: "Earlier reasoning" }]);
            const wire = new TextEncoder().encode(
                'data: {"choices":[{"delta":{"reasoning_content":"Думаю"}}]}\n\ndata: {"choices":[],"usage":{"prompt_tokens":10}}\n\ndata: [DONE]',
            );
            const stream = new ReadableStream<Uint8Array>({
                start(controller) {
                    for (let offset = 0; offset < wire.length; offset += 7)
                        controller.enqueue(wire.slice(offset, offset + 7));
                    controller.close();
                },
            });
            return new Response(stream, { headers: { "content-type": "text/event-stream" } });
        });
        const response = await zaiFetch("https://api.z.ai/api/paas/v4/chat/completions", {
            method: "POST",
            body: JSON.stringify({ messages: [{ role: "assistant", reasoning: "Earlier reasoning" }] }),
        });
        const result = await response.text();
        expect(result).toContain('"reasoning":"Думаю"');
        expect(result).toContain('"prompt_tokens":10');
        expect(result).toContain("data: [DONE]");
    });

    it("returns provider failures without attempting to parse them as completions", async () => {
        vi.stubGlobal("fetch", async () => new Response("rate limited", { status: 429 }));
        const response = await zaiFetch("https://api.z.ai/api/paas/v4/chat/completions", {
            method: "POST",
            body: JSON.stringify({ messages: [{ role: "user", content: "Hi" }] }),
        });
        expect(response.status).toBe(429);
        expect(await response.text()).toBe("rate limited");
    });
});
