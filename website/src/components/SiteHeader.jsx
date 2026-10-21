const links = [
  { href: "#menu", label: "Menu" },
  { href: "#pasang", label: "Pasang" },
  { href: "#panduan", label: "Panduan" },
];

export function SiteHeader() {
  return (
    <header className="shell flex items-center justify-between gap-6 py-6">
      <a
        href="#atas"
        aria-label="iky, kembali ke atas"
        className="flex min-h-11 items-center gap-3 text-ink no-underline"
      >
        <span className="brand-mark" aria-hidden="true">
          [iky]
        </span>
        <span className="hidden text-[0.78rem] text-ink-muted sm:inline">CLI serbaguna</span>
      </a>

      <nav aria-label="Navigasi utama" className="hidden items-center gap-6 md:flex">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-sm text-ink-soft no-underline transition-colors hover:text-[var(--teal-text)]"
          >
            {link.label}
          </a>
        ))}
      </nav>

      <span className="font-mono text-[0.7rem] text-ink-muted">v1.0.0</span>
    </header>
  );
}
