/**
 * Plain-text formatting of feed posts for the paper magazine. Safe to import in
 * the browser (no database): /admin/feed copies with these; lib/magazine.ts
 * re-exports them for the server.
 */

export interface MagazinePost {
  id: string;
  authorName: string;
  /** The author's own SSC batch from their profile. */
  authorBatch: number | null;
  /** The batch the post was tagged with (usually the same). */
  batchTag: number | null;
  createdAt: string;
  editedAt: string | null;
  content: string;
  /** Public-form submissions only: the piece's title and how to reach the sender. */
  title?: string | null;
  contact?: string | null;
}

/** "25 October 2026", in Bangladesh time. */
export function magazineDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" });
}

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

/** The post's text with no HTML, Windows line endings or surrounding whitespace. */
export function plainText(content: string): string {
  return content
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m])
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

/** One post, ready for the magazine: who, which batch, when, then the text. */
export function postText(post: Pick<MagazinePost, "authorName" | "authorBatch" | "batchTag" | "createdAt" | "content"> & { title?: string | null }): string {
  const batch = post.batchTag ?? post.authorBatch;
  const who = batch ? `${post.authorName} (SSC ${batch})` : post.authorName;
  const title = post.title?.trim();
  return `${who} — ${magazineDate(post.createdAt)}${title ? `\n${title}` : ""}\n\n${plainText(post.content)}`;
}

/** All shown posts as one plain-text block, separated for the layout. */
export function magazineText(posts: Parameters<typeof postText>[0][]): string {
  return posts.map(postText).join("\n\n* * *\n\n");
}
