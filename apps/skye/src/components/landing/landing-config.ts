import type { LandingConfig } from "./landing-types";

export const LANDING_CONFIG: LandingConfig = {
  sections: [
    {
      type: "navbar",
      logoText: "Skye",
      links: [
        { label: "Fitur", href: "#features" },
        { label: "Harga", href: "#pricing" },
        { label: "Template", href: "#templates" },
      ],
      ghostCta: { label: "Masuk", href: "/login" },
      primaryCta: { label: "Mulai Gratis →", href: "/register" },
    },
    {
      type: "hero",
      eyebrow: "✦ Website builder untuk fashion Indonesia",
      headline: ["Toko onlinemu", "siap dalam", "3 menit."],
      subtext:
        "Skye adalah cara tercepat membangun storefront yang terlihat profesional. Pilih template, upload produk, langsung jual.",
      primaryCta: { label: "Mulai Gratis →", href: "/register" },
      secondaryCta: { label: "Lihat demo ↗", href: "#templates" },
    },
    {
      type: "marquee",
      label: "Dipercaya merchant aktif",
      logoIds: [
        "batik-premium",
        "wardrobe",
        "ethnica",
        "studio-daun",
        "rumah-tenun",
        "hijab-id",
        "the-edit",
        "kain-co",
        "modisku",
        "lokal",
      ],
    },
    {
      type: "how-it-works",
      eyebrow: "Cara Kerja",
      heading: "Tiga langkah,\ntoko langsung live.",
      steps: [
        {
          number: 1,
          title: "Daftar & buat toko",
          description:
            "Masukkan nama toko dan email. Subdomain kamu langsung aktif. Proses < 1 menit.",
        },
        {
          number: 2,
          title: "Pilih template & upload produk",
          description:
            "Pilih dari 10+ template. Upload foto produkmu dengan drag & drop. Selesai dalam menit.",
        },
        {
          number: 3,
          title: "Publish & terima order pertama",
          description:
            "Toko langsung live di subdomain kamu. Pembayaran otomatis masuk ke rekeningmu.",
        },
      ],
    },
    {
      type: "features",
      eyebrow: "Fitur",
      heading: "Semua yang kamu butuhkan,\ntanpa yang tidak kamu butuhkan.",
      subtext:
        "Didesain khusus untuk merchant fashion Indonesia — tidak lebih, tidak kurang.",
      items: [
        {
          icon: "◈",
          iconBg: "#eef1fe",
          title: "Template Siap Pakai",
          description:
            "10+ template cantik dirancang khusus untuk toko fashion.",
        },
        {
          icon: "💳",
          iconBg: "#f0fdf4",
          title: "Pembayaran Terintegrasi",
          description: "DOKU, transfer bank, COD. Semua sudah terpasang.",
        },
        {
          icon: "📦",
          iconBg: "#fffbeb",
          title: "Kelola Order dengan Mudah",
          description:
            "Terima, proses, tandai dikirim — semuanya dari satu halaman.",
        },
        {
          icon: "🌐",
          iconBg: "#faf5ff",
          title: "Domain Gratis Selamanya",
          description: "{kamu}.skyeseller.online langsung aktif saat daftar.",
        },
        {
          icon: "🖼️",
          iconBg: "#fdf2f8",
          title: "Upload Foto Produk",
          description:
            "Drag & drop hingga 10 foto per produk. Otomatis dioptimasi.",
        },
        {
          icon: "📊",
          iconBg: "#f0fdfa",
          title: "Pantau Performa Toko",
          description: "Dashboard ringkas: revenue, orders, produk terlaris.",
        },
      ],
    },
    {
      type: "stats",
      items: [
        {
          value: "3",
          animateTo: 3,
          unit: "menit",
          label: "Rata-rata waktu setup toko",
        },
        {
          value: "Rp 0",
          unit: "per bulan",
          label: "Biaya langganan selamanya",
        },
        {
          value: "2,9%",
          unit: "komisi",
          label: "Per transaksi + Rp 500 flat",
        },
        {
          value: "12.000+",
          animateTo: 12000,
          suffix: "+",
          unit: "toko aktif",
          label: "Bulan ini di seluruh Indonesia",
        },
      ],
    },
    {
      type: "templates",
      eyebrow: "Template",
      heading: "Mulai dari template yang\nsudah terbukti convert.",
      items: [
        {
          name: "Modern Minimal",
          primary: "#1a1a1a",
          accent: "#3d5af1",
          style: "modern",
        },
        {
          name: "Bold Commerce",
          primary: "#0f172a",
          accent: "#f59e0b",
          style: "bold",
        },
        {
          name: "Elegant Boutique",
          primary: "#78350f",
          accent: "#d97706",
          style: "elegant",
        },
        {
          name: "Chicora",
          primary: "#991b1b",
          accent: "#f97316",
          style: "chicora",
          isNew: true,
        },
      ],
    },
    {
      type: "pricing",
      eyebrow: "Harga",
      heading: "Satu plan. Gratis selamanya.",
      planName: "Skye Starter",
      priceLabel: "GRATIS",
      note: "Rp 0 / bulan · + 2,9% per transaksi berhasil",
      features: [
        "Subdomain gratis selamanya",
        "10+ template premium",
        "Upload produk unlimited",
        "Pembayaran terintegrasi (DOKU, bank, COD)",
        "Manajemen order & stok",
        "Dashboard analitik ringkas",
      ],
      cta: { label: "Buat toko gratis →", href: "/register" },
      upgradeNote: "Upgrade ke Pro kapan saja →",
    },
    {
      type: "testimonials",
      eyebrow: "Testimoni",
      heading: "Merchant yang sudah\nmerasakan manfaatnya.",
      items: [
        {
          initial: "R",
          avatarFrom: "#f9a8d4",
          avatarTo: "#ec4899",
          name: "Rina Fadilah",
          handle: "@rinafashion_id · Bandung",
          quote:
            "Saya bisa setup toko dalam 1 jam. Sekarang omset saya naik 3×.",
        },
        {
          initial: "M",
          avatarFrom: "#93c5fd",
          avatarTo: "#3b82f6",
          name: "Maya Kusuma",
          handle: "Butik Maya · Jakarta",
          quote:
            "Templatenya cantik-cantik. Pelanggan sering tanya toko saya pakai platform apa.",
        },
        {
          initial: "D",
          avatarFrom: "#fcd34d",
          avatarTo: "#f59e0b",
          name: "Desi Rahayu",
          handle: "Desi Batik · Solo",
          quote: "Order masuk langsung muncul di dashboard. Praktis banget.",
        },
      ],
    },
    {
      type: "closing-cta",
      headline: ["Tiga menit lagi,", "tokomu sudah online."],
      subtext:
        "Tidak perlu kartu kredit. Tidak perlu developer.\nTidak perlu pengalaman teknis.",
      cta: { label: "◈ Buat toko gratis →", href: "/register" },
      note: "Bergabung dengan 12.000+ merchant aktif",
    },
    {
      type: "footer",
      tagline: "Buat tokomu online tanpa drama teknis.",
      url: "skyeseller.online",
      socials: [
        { label: "in", href: "#" },
        { label: "tt", href: "#" },
      ],
      columns: [
        {
          title: "Produk",
          links: [
            { label: "Fitur", href: "#features" },
            { label: "Template", href: "#templates" },
            { label: "Harga", href: "#pricing" },
            { label: "Changelog", href: "#" },
          ],
        },
        {
          title: "Perusahaan",
          links: [
            { label: "Tentang", href: "#" },
            { label: "Blog", href: "#" },
            { label: "Karir", href: "#" },
            { label: "Kontak", href: "#" },
          ],
        },
        {
          title: "Legal",
          links: [
            { label: "Syarat & Ketentuan", href: "#" },
            { label: "Privasi", href: "#" },
            { label: "Cookies", href: "#" },
          ],
        },
      ],
      copyright: "© 2025 Skye. Platform merchant Indonesia.",
      madeIn: "Dibuat dengan ❤ di Indonesia 🇮🇩",
    },
  ],
};
