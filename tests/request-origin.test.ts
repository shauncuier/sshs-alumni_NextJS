import { describe, expect, it } from "vitest";
import { publicOrigin } from "@/lib/request-origin";

describe("publicOrigin", () => {
  it("uses the configured canonical origin instead of forwarded request headers", () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://alumni.example.test/some/path";
    try {
      const req = new Request("https://internal.example.test/card", { headers: { host: "attacker.example", "x-forwarded-host": "attacker.example" } });
      expect(publicOrigin(req)).toBe("https://alumni.example.test");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = previous;
    }
  });
});
