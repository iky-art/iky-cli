import { useRef, useState } from "react";
import { CopyButton } from "./CopyButton.jsx";
import { InstallPreview } from "./InstallPreview.jsx";
import { SectionHead } from "./SectionHead.jsx";

const TABS = [
  {
    id: "npm",
    label: "npm",
    command: "npm install -g @iky-art/iky",
    note: (
      <>
        Pasang global agar perintah <code>iky</code> tersedia di semua direktori.
      </>
    ),
  },
  {
    id: "pnpm",
    label: "pnpm",
    command: "pnpm add -g @iky-art/iky",
    note: (
      <>
        Sama seperti npm: pasang global agar perintah <code>iky</code> tersedia di mana saja.
      </>
    ),
  },
  {
    id: "npx",
    label: "npx",
    command: "npx @iky-art/iky list",
    note: "Menjalankan tanpa memasang global. Cocok untuk mencoba satu perintah.",
  },
];

export function InstallSection({ notify }) {
  const [active, setActive] = useState(TABS[0].id);
  const tabRefs = useRef([]);

  function handleKeyDown(event) {
    const index = TABS.findIndex((tab) => tab.id === active);
    let next = null;

    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    if (event.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = TABS.length - 1;
    if (next === null) return;

    event.preventDefault();
    setActive(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <section id="pasang" aria-labelledby="install-title" className="section">
      <div className="shell">
        <SectionHead
          index="02"
          id="install-title"
          title="Pasang sekali, panggil dari mana saja."
          lede="Pilih manajer paket yang kamu gunakan. Untuk mencoba tanpa memasang global, jalankan lewat npx."
        />

        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <h3 className="subhead">Yang perlu disiapkan</h3>
            <ul className="requirements">
              <li>Node.js 18.17 atau lebih baru.</li>
              <li>Terminal di Linux, macOS, atau Windows.</li>
              <li>Tidak ada dependensi runtime yang ikut terpasang.</li>
              <li>
                Warna bisa dimatikan dengan <code>NO_COLOR=1</code>.
              </li>
            </ul>
          </div>

          <div className="install-panel raised">
            <div className="package-line">
              <span className="package-name">@iky-art/iky</span>
              <span>v1.0.0 · Node.js 18.17+</span>
            </div>

            <div className="tabs" role="tablist" aria-label="Cara memasang iky">
              {TABS.map((tab, index) => (
                <button
                  key={tab.id}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  id={`tab-${tab.id}`}
                  type="button"
                  role="tab"
                  className="tab"
                  aria-selected={active === tab.id}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={active === tab.id ? 0 : -1}
                  onClick={() => setActive(tab.id)}
                  onKeyDown={handleKeyDown}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {TABS.map((tab) => (
              <div
                key={tab.id}
                id={`panel-${tab.id}`}
                className="tab-panel"
                role="tabpanel"
                aria-labelledby={`tab-${tab.id}`}
                hidden={active !== tab.id}
              >
                <InstallPreview command={tab.command} />

                <p className="tab-note">{tab.note}</p>
                <div className="code-copy inset">
                  <code>{tab.command}</code>
                  <CopyButton
                    value={tab.command}
                    label={`perintah ${tab.label}`}
                    notify={notify}
                  />
                </div>
              </div>
            ))}

            <p className="release-note">
              Situs ini membaca data menu dari registry yang sama dengan CLI. Versi paket:{" "}
              <code>1.0.0</code>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
