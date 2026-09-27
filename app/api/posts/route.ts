import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { samplePosts, PostItem } from "@/lib/data";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const batch = searchParams.get("batch");

    try {
      const whereClause: Record<string, unknown> = {};
      if (batch && batch !== "all") {
        whereClause.batchTag = parseInt(batch, 10);
      }

      const posts = await prisma.post.findMany({
        where: whereClause,
        include: {
          author: {
            include: { profile: true },
          },
          comments: {
            include: {
              author: {
                include: { profile: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (posts && posts.length > 0) {
        return NextResponse.json({ posts, source: "database" });
      }
    } catch (dbErr) {
      console.warn("Database posts fallback:", dbErr);
    }

    let results: PostItem[] = [...samplePosts];
    if (batch && batch !== "all") {
      const bYear = parseInt(batch, 10);
      results = results.filter((p) => p.batchTag === bYear);
    }

    return NextResponse.json({ posts: results, source: "fallback-dataset" });
  } catch (error) {
    console.error("Posts GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const body = await req.json();
    const { content, batchTag } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Post content cannot be empty." }, { status: 400 });
    }

    const userName = session.user.name || "Alumnus";
    const userBatch = (session.user as unknown as { batchYear?: number })?.batchYear || 2008;

    try {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      if (user) {
        const createdPost = await prisma.post.create({
          data: {
            authorId: user.id,
            content: content.trim(),
            batchTag: batchTag ? parseInt(batchTag, 10) : userBatch,
          },
          include: {
            author: { include: { profile: true } },
          },
        });

        return NextResponse.json(
          { message: "Post created successfully", post: createdPost, source: "database" },
          { status: 201 }
        );
      }
    } catch (dbErr) {
      console.warn("Database post creation fallback:", dbErr);
    }

    // Dynamic simulated response
    const newPost: PostItem = {
      id: `post-${Date.now()}`,
      author: {
        name: userName,
        avatar: session.user.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        batch: userBatch,
        profession: "Active Alumnus",
        isVerified: true,
      },
      timestamp: "Just now",
      content: content.trim(),
      likesCount: 0,
      commentsCount: 0,
      batchTag: batchTag ? parseInt(batchTag, 10) : userBatch,
      isLiked: false,
    };

    return NextResponse.json(
      { message: "Post created successfully", post: newPost, source: "fallback" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Posts POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
