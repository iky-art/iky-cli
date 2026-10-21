import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CopyButton } from "./CopyButton.jsx";
import { Icon } from "./Icon.jsx";
import { SectionHead } from "./SectionHead.jsx";

const MENU_URL = `${import.meta.env.BASE_URL}data/menu.json`;
const CATEGORY_ORDER = [
  "Sistem",
  "Teks",
  "Encoding",
  "Waktu",
  "Angka",
  "Acak & Warna",
  "Developer",
  "File",
];
const FILTERS = ["Semua", ...CATEGORY_ORDER];

function matches(item, query) {
  if (!query) return true;
  return [item.id, item.category, item.summary, item.usage].some((field) =>
    String(field).toLowerCase().includes(query),
  );
}

export function MenuExplorer({ notify }) {
  const [status, setStatus] = useState("loading");
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const searchRef = useRef(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const response = await fetch(MENU_URL, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (
        !Array.isArray(data) ||
        data.length !== 50 ||
        data.some((item) => !item.id || !item.category || !item.summary || !item.usage)
      ) {
        throw new Error("Format data menu tidak sesuai.");
      }

      setItems(data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const next = { Semua: items.length };
    for (const item of items) {
      next[item.category] = (next[item.category] ?? 0) + 1;
    }
    return next;
  }, [items]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter(
      (item) =>
        (category === "Semua" || item.category === category) && matches(item, needle),
    );
  }, [category, items, query]);

  const ready = status === "ready";
  const resultText =
    status === "loading"
      ? "Memuat 50 menu..."
      : status === "error"
        ? "Data menu tidak tersedia"
        : `${filtered.length} dari ${items.length} menu`;

  function resetFilters() {
    setQuery("");
    setCategory("Semua");
    searchRef.current?.focus();
  }

  return (
    <section id="menu" aria-labelledby="menu-title" className="section">
      <div className="shell">
        <SectionHead
          index="01"
          id="menu-title"
          title="50 menu, dikelompokkan supaya cepat ditemukan."
          lede="Cari berdasarkan nama, kategori, atau kebutuhan. Setiap baris bisa disalin sebagai perintah siap tempel."
        />

        <div className="explorer raised">
          <div className="explorer-tools">
            <div className="search-field inset">
              <Icon name="search" />
              <label className="sr-only" htmlFor="menu-search">
                Cari menu
              </label>
              <input
                ref={searchRef}
                id="menu-search"
                type="search"
                placeholder="Cari: hash, tanggal, json..."
                autoComplete="off"
                spellCheck="false"
                value={query}
                disabled={!ready}
                aria-controls="menu-list"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setQuery("");
                }}
              />
            </div>
            <p className="result-count" role="status" aria-live="polite">
              {resultText}
            </p>
          </div>

          <div className="filters" role="group" aria-label="Filter kategori">
            {FILTERS.map((name) => (
              <button
                key={name}
                type="button"
                className="filter"
                aria-pressed={category === name}
                disabled={!ready}
                onClick={() => setCategory(name)}
              >
                {name}
                {counts[name] !== undefined ? <span>{counts[name]}</span> : null}
              </button>
            ))}
          </div>

          <div id="menu-list" aria-busy={status === "loading"}>
            {status === "loading" ? (
              <ul className="menu-list" aria-hidden="true">
                {Array.from({ length: 6 }, (_, index) => (
                  <li className="skeleton-row" key={index}>
                    <span className="skeleton skeleton-no" />
                    <span className="skeleton skeleton-text" />
                    <span className="skeleton skeleton-short" />
                  </li>
                ))}
              </ul>
            ) : null}

            {status === "error" ? (
              <div className="state-box" role="alert">
                <h3>Data menu belum bisa dimuat</h3>
                <p>
                  Permintaan ke <code>data/menu.json</code> gagal. Periksa koneksi atau jalankan
                  ulang situs, lalu coba lagi.
                </p>
                <button type="button" className="btn btn-quiet gap-2" onClick={load}>
                  <Icon name="refresh" className="h-[18px] w-[18px]" />
                  Coba lagi
                </button>
              </div>
            ) : null}

            {ready && filtered.length === 0 ? (
              <div className="state-box">
                <h3>Tidak ada menu yang cocok</h3>
                <p>Coba kata lain, atau kembali ke semua kategori untuk melihat 50 menu.</p>
                <button type="button" className="btn btn-quiet" onClick={resetFilters}>
                  Tampilkan semua menu
                </button>
              </div>
            ) : null}

            {ready && filtered.length > 0 ? (
              <ul className="menu-list">
                {filtered.map((item) => (
                  <li className="menu-row" key={item.id}>
                    <span className="menu-num">{String(item.number).padStart(2, "0")}</span>
                    <div className="menu-main">
                      <p className="menu-id">iky {item.id}</p>
                      <p className="menu-summary">{item.summary}</p>
                    </div>
                    <span className="menu-cat">{item.category}</span>
                    <CopyButton
                      value={item.usage}
                      label={`perintah iky ${item.id}`}
                      notify={notify}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
