import { afterEach, describe, expect, it } from "vitest";
import { isSafeImageUrl, normalizeImageUrl } from "@/lib/security/imageUrl";

const originalNodeEnv = process.env.NODE_ENV;
const originalAllowedHosts = process.env.NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;

  if (originalAllowedHosts === undefined) {
    delete process.env.NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS;
    return;
  }

  process.env.NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS = originalAllowedHosts;
});

describe("imageUrl security", () => {
  it("accepts relative paths by default", () => {
    const value = normalizeImageUrl("/images/avatar.png");
    expect(value).toBe("/images/avatar.png");
  });

  it("rejects relative paths when allowRelative is false", () => {
    const value = normalizeImageUrl("/images/avatar.png", { allowRelative: false });
    expect(value).toBeNull();
  });

  it("accepts allowlisted https hosts", () => {
    process.env.NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS = "cdn.example.com,*.trusted.example";

    expect(normalizeImageUrl("https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
    expect(normalizeImageUrl("https://img.trusted.example/pic.webp")).toBe(
      "https://img.trusted.example/pic.webp",
    );
  });

  it("rejects non-allowlisted https hosts", () => {
    process.env.NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS = "cdn.example.com";

    expect(normalizeImageUrl("https://evil.example.com/a.png")).toBeNull();
  });

  it("rejects absolute https URLs when allowlist is empty", () => {
    delete process.env.NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS;

    expect(normalizeImageUrl("https://cdn.example.com/a.png")).toBeNull();
  });

  it("accepts localhost http URLs only in non-production", () => {
    process.env.NODE_ENV = "development";

    expect(normalizeImageUrl("http://localhost:3000/a.png")).toBe("http://localhost:3000/a.png");
    expect(normalizeImageUrl("http://127.0.0.1:8080/a.png")).toBe("http://127.0.0.1:8080/a.png");
  });

  it("rejects localhost http URLs in production", () => {
    process.env.NODE_ENV = "production";

    expect(normalizeImageUrl("http://localhost:3000/a.png")).toBeNull();
  });

  it("rejects non-http protocols", () => {
    process.env.NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS = "cdn.example.com";

    expect(normalizeImageUrl("javascript:alert(1)")).toBeNull();
    expect(isSafeImageUrl("data:image/png;base64,abc")).toBe(false);
  });
});
