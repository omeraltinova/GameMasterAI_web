import { describe, it, expect, vi, beforeEach } from "vitest";
import { APIError, get, post, put, del, buildQuery, getAuthHeaders } from "@/lib/api/client";

// ── Mock global fetch ───────────────────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

/** Helper to create a successful Response-like object */
function okResponse(data: unknown, status = 200) {
  return {
    ok: true,
    status,
    json: () => Promise.resolve(data),
  };
}

/** Helper to create a failed Response-like object */
function errorResponse(status: number, body?: Record<string, unknown>) {
  return {
    ok: false,
    status,
    json: () => (body ? Promise.resolve(body) : Promise.reject(new Error("no body"))),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. APIError class
// ═════════════════════════════════════════════════════════════════════════════
describe("APIError", () => {
  it("extends Error", () => {
    const err = new APIError("fail", 404);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(APIError);
  });

  it("stores message, status, and data", () => {
    const err = new APIError("not found", 404, { detail: "missing" });
    expect(err.message).toBe("not found");
    expect(err.status).toBe(404);
    expect(err.data).toEqual({ detail: "missing" });
  });

  it("has name 'APIError'", () => {
    const err = new APIError("x", 500);
    expect(err.name).toBe("APIError");
  });

  it("data is optional", () => {
    const err = new APIError("x", 500);
    expect(err.data).toBeUndefined();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. buildQuery
// ═════════════════════════════════════════════════════════════════════════════
describe("buildQuery", () => {
  it("returns empty string for empty object", () => {
    expect(buildQuery({})).toBe("");
  });

  it("returns empty string when all values are undefined/null", () => {
    expect(buildQuery({ a: undefined, b: null })).toBe("");
  });

  it("builds query string with ? prefix", () => {
    const result = buildQuery({ page: 1, limit: 10 });
    expect(result).toMatch(/^\?/);
    expect(result).toContain("page=1");
    expect(result).toContain("limit=10");
  });

  it("converts values to strings", () => {
    const result = buildQuery({ active: true, count: 42 });
    expect(result).toContain("active=true");
    expect(result).toContain("count=42");
  });

  it("omits undefined and null values", () => {
    const result = buildQuery({ a: "yes", b: undefined, c: null, d: "ok" });
    expect(result).toContain("a=yes");
    expect(result).toContain("d=ok");
    expect(result).not.toContain("b=");
    expect(result).not.toContain("c=");
  });

  it("handles string values with special characters", () => {
    const result = buildQuery({ q: "hello world" });
    expect(result).toContain("q=hello+world");
  });

  it("includes 0 and false (not skipped)", () => {
    const result = buildQuery({ count: 0, active: false });
    expect(result).toContain("count=0");
    expect(result).toContain("active=false");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. getAuthHeaders
// ═════════════════════════════════════════════════════════════════════════════
describe("getAuthHeaders", () => {
  it("returns Content-Type header without token", () => {
    const headers = getAuthHeaders();
    expect(headers).toEqual({ "Content-Type": "application/json" });
  });

  it("includes Authorization bearer when token provided", () => {
    const headers = getAuthHeaders("abc123");
    expect(headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer abc123",
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. get()
// ═════════════════════════════════════════════════════════════════════════════
describe("get()", () => {
  it("makes a GET request to /api + endpoint", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ items: [] }));

    const data = await get("/characters");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/characters");
    expect(opts.method).toBe("GET");
  });

  it("returns parsed JSON on success", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ id: 1, name: "Test" }));
    const data = await get("/users/1");
    expect(data).toEqual({ id: 1, name: "Test" });
  });

  it("sets default Content-Type and credentials", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({}));
    await get("/test");

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.credentials).toBe("include");
    expect(opts.headers["Content-Type"]).toBe("application/json");
  });

  it("throws APIError on non-ok response with error message from body", async () => {
    mockFetch.mockResolvedValueOnce(
      errorResponse(404, { message: "Not found" })
    );

    await expect(get("/missing")).rejects.toThrow(APIError);

    try {
      mockFetch.mockResolvedValueOnce(
        errorResponse(404, { message: "Not found" })
      );
      await get("/missing");
    } catch (err) {
      expect(err).toBeInstanceOf(APIError);
      expect((err as APIError).status).toBe(404);
      expect((err as APIError).message).toBe("Not found");
    }
  });

  it("throws APIError with fallback message when body has no message", async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(500, {}));

    try {
      await get("/fail");
    } catch (err) {
      expect(err).toBeInstanceOf(APIError);
      expect((err as APIError).message).toBe("API request failed");
    }
  });

  it("throws APIError with fallback when body cannot be parsed", async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(500));

    try {
      await get("/crash");
    } catch (err) {
      expect(err).toBeInstanceOf(APIError);
      expect((err as APIError).status).toBe(500);
    }
  });

  it("wraps network errors in APIError with status 0", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    try {
      await get("/offline");
    } catch (err) {
      expect(err).toBeInstanceOf(APIError);
      expect((err as APIError).status).toBe(0);
      expect((err as APIError).message).toBe("Failed to fetch");
    }
  });

  it("wraps non-Error throws in APIError with 'Network error'", async () => {
    mockFetch.mockRejectedValueOnce("something weird");

    try {
      await get("/weird");
    } catch (err) {
      expect(err).toBeInstanceOf(APIError);
      expect((err as APIError).status).toBe(0);
      expect((err as APIError).message).toBe("Network error");
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. post()
// ═════════════════════════════════════════════════════════════════════════════
describe("post()", () => {
  it("makes a POST request with JSON body", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ id: 1 }));

    await post("/characters", { name: "Alderan" });

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/characters");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({ name: "Alderan" });
  });

  it("returns parsed response", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ created: true }));
    const result = await post("/items", { item: "Sword" });
    expect(result).toEqual({ created: true });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. put()
// ═════════════════════════════════════════════════════════════════════════════
describe("put()", () => {
  it("makes a PUT request with JSON body", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ updated: true }));

    await put("/characters/1", { name: "Alderan the Wise" });

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/characters/1");
    expect(opts.method).toBe("PUT");
    expect(JSON.parse(opts.body)).toEqual({ name: "Alderan the Wise" });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. del()
// ═════════════════════════════════════════════════════════════════════════════
describe("del()", () => {
  it("makes a DELETE request", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ deleted: true }));

    await del("/characters/1");

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/characters/1");
    expect(opts.method).toBe("DELETE");
  });

  it("returns parsed response", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ success: true }));
    const result = await del("/items/5");
    expect(result).toEqual({ success: true });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. Custom options passthrough
// ═════════════════════════════════════════════════════════════════════════════
describe("custom options", () => {
  it("allows passing custom headers", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({}));

    await get("/test", {
      headers: { "X-Custom": "value" },
    });

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers["X-Custom"]).toBe("value");
  });
});
