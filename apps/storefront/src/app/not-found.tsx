export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-3xl font-semibold">Store not found</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Tidak ada toko yang terdaftar di subdomain ini. Cek URL atau kunjungi{" "}
        <a
          href="https://skyeseller.online"
          className="underline underline-offset-4"
        >
          skyeseller.online
        </a>{" "}
        untuk membuat toko sendiri.
      </p>
    </main>
  );
}
