import { headers } from "next/headers";
import { notFound } from "next/navigation";

export default async function StoreHomePage() {
  const h = await headers();
  const slug = h.get("x-store-slug");

  if (!slug) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
      <p className="text-sm uppercase tracking-widest text-zinc-500">
        skye storefront
      </p>
      <h1 className="text-4xl font-semibold">{slug}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Coming soon — products & catalog for{" "}
        <span className="font-mono">{slug}</span>.
      </p>
    </main>
  );
}
