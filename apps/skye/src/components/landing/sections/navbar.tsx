"use client";

import type { NavbarSection } from "../landing-types";

export function Navbar({
  logoText,
  links,
  ghostCta,
  primaryCta,
}: NavbarSection) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        height: 60,
        background: "rgba(249,249,247,0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          maxWidth: 1160,
          margin: "0 auto",
          padding: "0 40px",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 36,
        }}
      >
        <a
          href="#"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
          }}
        >
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: "var(--accent)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            ◈
          </span>
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "var(--ink)",
            }}
          >
            {logoText}
          </span>
        </a>

        <nav
          className="hidden md:flex"
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            gap: 28,
          }}
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--muted)",
                textDecoration: "none",
                transition: "color .15s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color =
                  "var(--ink)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color =
                  "var(--muted)")
              }
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            marginLeft: "auto",
          }}
        >
          <a
            href={ghostCta.href}
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--ink)",
              textDecoration: "none",
              padding: "11px 18px",
              borderRadius: "var(--r-pill)",
              transition: "opacity .15s",
            }}
          >
            {ghostCta.label}
          </a>
          <a
            href={primaryCta.href}
            style={{
              background: "var(--ink)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              padding: "11px 22px",
              borderRadius: "var(--r-pill)",
              textDecoration: "none",
              transition: "background .15s, transform .15s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = "#2a2a28";
              el.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = "var(--ink)";
              el.style.transform = "translateY(0)";
            }}
          >
            {primaryCta.label}
          </a>
        </div>
      </div>
    </header>
  );
}
