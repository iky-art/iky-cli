const links = [
  { href: "#menu", label: "Menu" },
  { href: "#pasang", label: "Pasang" },
  { href: "#panduan", label: "Panduan" },
];

export function Footer() {
  return (
    <footer className="site-foot shell">
      <div className="foot-brand">
        <span className="brand-mark" aria-hidden="true">
          [iky]
        </span>
        <p>CLI serbaguna untuk kerja terminal harian.</p>
      </div>

      <nav className="foot-nav" aria-label="Navigasi footer">
        {links.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>

      <p className="foot-meta">Situs resmi · MIT · v1.0.0</p>
    </footer>
  );
}
