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
});

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

    expect(errorSpy).toHaveBeenCalledOnce();
    const [msg] = errorSpy.mock.calls[0] as [string];
    expect(msg).toMatch(/attempt/i);
  });

  it("does not call console.error on a successful extraction", async () => {
    const mockFetch = makeFetch(200, OK_BODY);

    await extractWithRetry("imgdata", "key", mockFetch);

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
