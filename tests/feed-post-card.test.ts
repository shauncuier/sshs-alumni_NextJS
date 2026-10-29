import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { name: "Rafiq", batchYear: 2001 } } }) }));

import PostCard from "@/components/feed/PostCard";
import CreatePostModal from "@/components/feed/CreatePostModal";
import type { PostItem } from "@/lib/data";

const post: PostItem = {
  id: "p1",
  author: { name: "Rafiq", avatar: "", batch: 2001, profession: "Teacher", isVerified: true },
  authorId: "u1",
  profileId: "pr1",
  timestamp: "2 h ago",
  content: "Hello batch",
  likesCount: 0,
  commentsCount: 0,
  batchTag: 2001,
  canDelete: true,
  canEdit: true,
  editedAt: null,
};

describe("post card", () => {
  it("offers Edit only to someone who may edit, and only where the page handles it", () => {
    const withHandler = renderToStaticMarkup(React.createElement(PostCard, { post, onEdit: () => {} }));
    expect(withHandler).toContain('aria-label="Edit post"');
    const noHandler = renderToStaticMarkup(React.createElement(PostCard, { post }));
    expect(noHandler).not.toContain('aria-label="Edit post"');
    const notAllowed = renderToStaticMarkup(React.createElement(PostCard, { post: { ...post, canEdit: false }, onEdit: () => {} }));
    expect(notAllowed).not.toContain('aria-label="Edit post"');
  });

  it("marks an edited post with when it was edited", () => {
    expect(renderToStaticMarkup(React.createElement(PostCard, { post }))).not.toContain("Edited");
    const html = renderToStaticMarkup(React.createElement(PostCard, { post: { ...post, editedAt: "5 min ago" } }));
    expect(html).toContain("Edited 5 min ago");
  });
});

describe("post form", () => {
  it("starts from the existing text and batch when editing, and says so", () => {
    const html = renderToStaticMarkup(
      React.createElement(CreatePostModal, { isOpen: true, onClose: () => {}, onPostCreated: () => {}, initial: { content: "Old text", batchTag: 1999 } })
    );
    expect(html).toContain("Edit your post");
    expect(html).toContain("Old text");
    expect(html).toContain("Save changes");
    expect(html).toMatch(/<option[^>]*selected[^>]*value="1999"|<option value="1999"[^>]*selected/);
    const create = renderToStaticMarkup(React.createElement(CreatePostModal, { isOpen: true, onClose: () => {}, onPostCreated: () => {} }));
    expect(create).toContain("Create Community Post");
    expect(create).not.toContain("Save changes");
  });
});

describe("call for magazine writings", () => {
  it("shows the publication subcommittee's call, its convenor and phone, and a button to write", async () => {
    const { default: MagazineCall } = await import("@/components/feed/MagazineCall");
    const html = renderToStaticMarkup(React.createElement(MagazineCall, { onWrite: () => {} }));
    expect(html).toContain("স্মরণিকা");
    expect(html).toContain("প্রত্যুষ রুবেল");
    expect(html).toContain("প্রকাশনা উপকমিটি");
    expect(html).toContain('href="tel:+8801818869523"');
    expect(html).toContain("01818-869523");
    expect(html).toMatch(/<button[^>]*>(?:<svg[\s\S]*?<\/svg>)?\s*আপনার লেখা পোস্ট করুন<\/button>/);
  });
});

describe("public magazine form", () => {
  it("asks for name, batch, phone, email, title and the writing, with a hidden honeypot and the call text", async () => {
    const { default: MagazineForm } = await import("@/components/magazine/MagazineForm");
    const html = renderToStaticMarkup(React.createElement(MagazineForm));
    for (const name of ["name", "batch", "phone", "email", "title", "content"]) expect(html).toContain(`name="${name}"`);
    expect(html).toMatch(/name="website"[^>]*tabindex="-1"|tabindex="-1"[^>]*name="website"/i);
    expect(html).toContain("প্রত্যুষ রুবেল");
    expect(html).toMatch(/<button[^>]*type="submit"/);
  });
});
