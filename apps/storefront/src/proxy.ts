import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { extractSlug } from "@/lib/slug";

export function proxy(request: NextRequest) {
  const slug = extractSlug(request.headers.get("host"));

  const headers = new Headers(request.headers);
  if (slug) {
    headers.set("x-store-slug", slug);
  } else {
    headers.delete("x-store-slug");
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
