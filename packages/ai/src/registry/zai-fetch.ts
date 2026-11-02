import { logger as rootLogger } from "@autonoma/logger";
import { z } from "zod";

const logger = rootLogger.child({ name: "zaiFetch" });
const messageSchema = z
    .object({
        role: z.string().optional(),
        reasoning: z.string().nullish(),
        reasoning_content: z.string().nullish(),
    })
    .passthrough();
const requestSchema = z
    .object({
        messages: z.array(messageSchema),
        response_format: z
            .object({
                type: z.string(),
                json_schema: z.object({ schema: z.json() }).passthrough().optional(),
            })
            .passthrough()
            .optional(),
    })
    .passthrough();
const responseSchema = z
    .object({
        choices: z
            .array(
                z
                    .object({
                        message: messageSchema.optional(),
                        delta: messageSchema.optional(),
                    })
                    .passthrough(),
            )
            .optional(),
    })
    .passthrough();

/** Adapt JSON mode and preserve reasoning across the Chat Completions tool loop. */
export async function zaiFetch(input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> {
    logger.info("Calling Z.ai Chat Completions");
    if (typeof init?.body !== "string") throw new Error("Z.ai transport requires a JSON request body");
    const body = requestSchema.parse(JSON.parse(init.body));
    const format = body.response_format;
    const messages = body.messages.map((message) => {
        const { reasoning, ...rest } = message;
        return { ...rest, reasoning_content: reasoning ?? message.reasoning_content };
    });
    const isSchema = format?.type === "json_schema";
    if (isSchema && format.json_schema == null) throw new Error("Missing JSON schema");
    const schemaMessages = isSchema
        ? [
              {
                  role: "system",
                  content: `Return JSON matching this schema: ${JSON.stringify(format.json_schema?.schema)}`,
              },
              ...messages,
          ]
        : messages;
    const response = await fetch(input, {
        ...init,
        body: JSON.stringify({
            ...body,
            messages: schemaMessages,
            response_format: isSchema ? { type: "json_object" } : format,
        }),
    });
    logger.info("Z.ai response received", { status: response.status });
    if (!response.ok || response.body == null) return response;
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    if (response.headers.get("content-type")?.includes("text/event-stream") === true) {
        return new Response(normalizeStream(response.body), { status: response.status, headers });
    }
    const normalized = normalizeResponse(await response.json());
    return new Response(normalized, { status: response.status, headers });
}

function normalizeResponse(input: unknown): string {
    const body = responseSchema.parse(input);
    return JSON.stringify({
        ...body,
        choices: body.choices?.map((choice) => ({
            ...choice,
            message: normalizeReasoning(choice.message),
            delta: normalizeReasoning(choice.delta),
        })),
    });
}

function normalizeReasoning(message: z.infer<typeof messageSchema> | undefined) {
    if (message == null) return undefined;
    return { ...message, reasoning: message.reasoning_content ?? message.reasoning };
}

function normalizeStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";
    return body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
                buffer += decoder.decode(chunk, { stream: true });
                for (let newline = buffer.indexOf("\n"); newline !== -1; newline = buffer.indexOf("\n")) {
                    controller.enqueue(encoder.encode(`${normalizeLine(buffer.slice(0, newline))}\n`));
                    buffer = buffer.slice(newline + 1);
                }
            },
            flush(controller) {
                buffer += decoder.decode();
                if (buffer.length > 0) controller.enqueue(encoder.encode(normalizeLine(buffer)));
            },
        }),
    );
}

function normalizeLine(line: string): string {
    if (!line.startsWith("data:")) return line;
    const data = line.slice("data:".length).trim();
    if (data.length === 0 || data === "[DONE]") return line;
    return `data: ${normalizeResponse(JSON.parse(data))}`;
}
