import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { callOpenRouter, extractWithRetry } from "./openrouter";

const OK_BODY = JSON.stringify({
  choices: [{ message: { content: JSON.stringify([{ name: "Alice", number: 10 }]) } }],
});

const BAD_PARSE_BODY = JSON.stringify({
  choices: [{ message: { content: "not a json array" } }],
});

function makeFetch(status: number, body: string) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
    json: () => Promise.resolve(JSON.parse(body)),
  });
}

describe("callOpenRouter", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs HTTP status and truncated body on a non-OK response", async () => {
    const body = "Rate limit exceeded — please slow down";
    const mockFetch = makeFetch(429, body);

    await expect(callOpenRouter("imgdata", "key", mockFetch)).rejects.toThrow();

    expect(errorSpy).toHaveBeenCalledOnce();
    const [msg] = errorSpy.mock.calls[0] as [string];
    expect(msg).toContain("429");
    expect(msg).toContain("Rate limit exceeded");
  });

  it("does not call console.error on a successful response", async () => {
    const mockFetch = makeFetch(200, OK_BODY);

    await callOpenRouter("imgdata", "key", mockFetch);

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("uses the provided mimeType in the image data URL", async () => {
    const mockFetch = makeFetch(200, OK_BODY);

    await callOpenRouter("imgdata", "key", mockFetch, "image/png");

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as {
      messages: Array<{ content: Array<{ image_url?: { url: string } }> }>;
    };
    const imageUrl = body.messages[0].content[0].image_url?.url ?? "";
    expect(imageUrl).toMatch(/^data:image\/png;base64,/);
  });
});

const noDelay = () => Promise.resolve();

describe("extractWithRetry", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs a greppable give-up message with attempt count when all retries produce unparseable output", async () => {
    const mockFetch = makeFetch(200, BAD_PARSE_BODY);

    await expect(extractWithRetry("imgdata", "key", mockFetch)).rejects.toThrow();

    const msgs = (errorSpy.mock.calls as [string][]).map(([m]) => m);
    expect(msgs.some((m) => /attempt/i.test(m))).toBe(true);
  });

  it("does not call console.error on a successful extraction", async () => {
    const mockFetch = makeFetch(200, OK_BODY);

    await extractWithRetry("imgdata", "key", mockFetch);

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("gives up after 3 attempts when every call returns 429", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve("rate limited"),
    });

    await expect(
      extractWithRetry("imgdata", "key", mockFetch, noDelay)
    ).rejects.toThrow();

    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("fails immediately on a 400 without retrying", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve("bad request"),
    });

    await expect(
      extractWithRetry("imgdata", "key", mockFetch, noDelay)
    ).rejects.toThrow();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries a 429 and resolves with players when the next attempt succeeds", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve("rate limited"),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(JSON.parse(OK_BODY)),
      });

    const players = await extractWithRetry("imgdata", "key", mockFetch, noDelay);

    expect(players).toEqual([{ name: "Alice", number: 10 }]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
