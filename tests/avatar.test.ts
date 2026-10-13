import { describe, expect, it } from "vitest";
import { avatarAt, initialsAvatar } from "@/lib/avatar";

const photo = "/api/media/avatars/0123456789abcdef0123456789abcdef/avatar.webp";

describe("member pictures for slow connections", () => {
  it("draws initials locally instead of asking another server", () => {
    const url = initialsAvatar("Md Nahidul Islam");
    expect(url).toMatch(/^data:image\/svg\+xml/);
    expect(decodeURIComponent(url)).toContain(">MI<");
    expect(decodeURIComponent(initialsAvatar("Rahim"))).toContain(">R<");
    expect(decodeURIComponent(initialsAvatar("<b>&"))).not.toMatch(/<b>|&</);
  });

  it("asks for a small copy of an uploaded photo at the size it is shown", () => {
    expect(avatarAt(photo, 32)).toBe(`${photo}?s=96`);
    expect(avatarAt(photo, 80)).toBe(`${photo}?s=192`);
    expect(avatarAt(photo, 140)).toBe(photo);
    expect(avatarAt("https://example.com/p.jpg", 32)).toBe("https://example.com/p.jpg");
    expect(avatarAt(null, 32, "Rahim Uddin")).toMatch(/^data:image\/svg\+xml/);
  });
});
