import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type Body = {
  slug?: string;
  paths?: string[];
};

const SECRET = process.env.REVALIDATE_SECRET;

export async function POST(request: NextRequest) {
  if (!SECRET) {
    return NextResponse.json(
      { error: "Revalidation endpoint not configured" },
      { status: 503 },
    );
  }

  if (request.headers.get("x-revalidate-secret") !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { slug, paths } = body;

  if (!slug && !paths) {
    return NextResponse.json(
      { error: "Provide slug and/or paths" },
      { status: 400 },
    );
  }

  const revalidated: { tags: string[]; paths: string[] } = {
    tags: [],
    paths: [],
  };

  if (slug) {
    const tag = `store:${slug}`;
    // Next.js 16 requires a profile arg; "max" triggers immediate expiry.
    revalidateTag(tag, "max");
    revalidated.tags.push(tag);
  }

  if (paths && Array.isArray(paths)) {
    for (const p of paths) {
      if (typeof p === "string" && p.startsWith("/")) {
        revalidatePath(p);
        revalidated.paths.push(p);
      }
    }
  }

  return NextResponse.json({ ok: true, revalidated });
}
