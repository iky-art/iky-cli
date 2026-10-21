import { Icon } from "./Icon.jsx";

const links = [
  { id: "atas", label: "Atas", icon: "home" },
  { id: "menu", label: "Menu", icon: "grid" },
  { id: "pasang", label: "Pasang", icon: "download" },
  { id: "panduan", label: "Panduan", icon: "book" },
];

export function Dock({ active, theme, onToggleTheme }) {
  const dark = theme === "dark";

  return (
    <nav className="dock" aria-label="Navigasi cepat">
      {links.map((link) => (
        <a
          key={link.id}
          href={`#${link.id}`}
          className="dock-item"
          aria-current={active === link.id ? "location" : undefined}
        >
          <Icon name={link.icon} />
          <span>{link.label}</span>
        </a>
      ))}

      <button
        type="button"
        className="dock-item"
        aria-pressed={dark}
        aria-label={dark ? "Aktifkan tema terang" : "Aktifkan tema gelap"}
        onClick={onToggleTheme}
      >
        <span className="icon-moon" aria-hidden="true">
          <Icon name="moon" />
        </span>
        <span className="icon-sun" aria-hidden="true">
          <Icon name="sun" />
        </span>
        <span>{dark ? "Terang" : "Gelap"}</span>
      </button>
    </nav>
  );
}
