import { describe, expect, it } from "vitest";
import { clientIp, isCloudflareAddress } from "@/lib/client-ip";

const from = (headers: Record<string, string>) => clientIp((name) => headers[name]);

describe("isCloudflareAddress", () => {
  it("knows Cloudflare's IPv4 and IPv6 ranges", () => {
    expect(isCloudflareAddress("104.16.0.1")).toBe(true);
    expect(isCloudflareAddress("172.71.255.255")).toBe(true);
    expect(isCloudflareAddress("162.159.10.20")).toBe(true);
    expect(isCloudflareAddress("2606:4700:10::6816:1")).toBe(true);
    expect(isCloudflareAddress("2a06:98c7::1")).toBe(true);
    expect(isCloudflareAddress("::ffff:104.16.0.1")).toBe(true);
  });

  it("refuses everything else", () => {
    expect(isCloudflareAddress("203.0.113.7")).toBe(false);
    expect(isCloudflareAddress("172.72.0.1")).toBe(false);
    expect(isCloudflareAddress("104.15.255.255")).toBe(false);
    expect(isCloudflareAddress("2a06:98c8::1")).toBe(false);
    expect(isCloudflareAddress("2001:db8::1")).toBe(false);
    expect(isCloudflareAddress("::1")).toBe(false);
    expect(isCloudflareAddress("unknown")).toBe(false);
    expect(isCloudflareAddress("")).toBe(false);
  });
});

describe("clientIp", () => {
  it("uses the host's own headers when the site is not behind Cloudflare", () => {
    expect(from({ "x-real-ip": "198.51.100.4" })).toBe("198.51.100.4");
    expect(from({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })).toBe("203.0.113.7");
    expect(from({ "x-real-ip": "198.51.100.4", "x-forwarded-for": "203.0.113.7" })).toBe("198.51.100.4");
    expect(from({})).toBeNull();
  });

  it("takes the visitor from CF-Connecting-IP when Cloudflare made the connection", () => {
    expect(from({ "x-real-ip": "172.70.1.2", "cf-connecting-ip": "203.0.113.7" })).toBe("203.0.113.7");
    expect(from({ "x-forwarded-for": "203.0.113.7, 162.158.1.1", "cf-connecting-ip": "203.0.113.7" })).toBe("203.0.113.7");
    expect(from({ "x-real-ip": "2606:4700::1", "cf-connecting-ip": "2001:db8::5" })).toBe("2001:db8::5");
  });

  it("ignores a CF-Connecting-IP sent by someone who reached the host directly", () => {
    expect(from({ "x-real-ip": "198.51.100.4", "cf-connecting-ip": "1.2.3.4" })).toBe("198.51.100.4");
    expect(from({ "x-forwarded-for": "198.51.100.4", "cf-connecting-ip": "1.2.3.4" })).toBe("198.51.100.4");
    expect(from({ "cf-connecting-ip": "1.2.3.4" })).toBeNull();
  });
});
