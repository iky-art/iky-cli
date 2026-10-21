import { CopyButton } from "./CopyButton.jsx";
import { Icon } from "./Icon.jsx";

const logo = `██╗██╗  ██╗██╗   ██╗
██║██║ ██╔╝╚██╗ ██╔╝
██║█████╔╝  ╚████╔╝
██║██╔═██╗   ╚██╔╝
██║██║  ██╗   ██║
╚═╝╚═╝  ╚═╝   ╚═╝`;

export function Hero({ notify }) {
  return (
    <section id="atas" aria-labelledby="hero-title" className="shell grid gap-14 pt-10 pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pt-20 lg:pb-28">
      <div>
        <p className="mb-5 font-mono text-[0.72rem] text-ink-muted">
          CLI Node.js untuk kerja terminal
        </p>

        <h1 className="hero-title" id="hero-title">
          Satu terminal.
          <br />
          <span className="accent-word">50 alat.</span>
        </h1>

        <p className="hero-lede">
          iky mengumpulkan alat teks, encoding, waktu, angka, warna, dan developer dalam satu CLI
          Node.js tanpa dependensi runtime. Pasang sekali, panggil dari terminal mana pun.
        </p>

        <div className="install-card inset">
          <code>
            <span className="prompt" aria-hidden="true">
              $
            </span>
            <span className="sr-only">Perintah pemasangan: </span>
            npm i -g @iky-art/iky
          </code>
          <CopyButton value="npm i -g @iky-art/iky" label="perintah pemasangan" notify={notify} />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a className="btn btn-primary gap-2" href="#menu">
            Lihat 50 menu
            <Icon name="arrow" className="h-[18px] w-[18px]" />
          </a>
          <a className="btn btn-quiet gap-2" href="https://github.com/iky-art/iky-cli" target="_blank" rel="noopener noreferrer">
            Kunjungi repo iky-cli
            <Icon name="github" className="h-[18px] w-[18px]" />
          </a>
          <a className="btn btn-quiet" href="#panduan">
            Lihat contoh perintah
          </a>
        </div>

        <dl className="facts" aria-label="Ringkasan iky">
          <div>
            <dt>Menu</dt>
            <dd>50</dd>
          </div>
          <div>
            <dt>Kategori</dt>
            <dd>8</dd>
          </div>
          <div>
            <dt>Dependensi runtime</dt>
            <dd>0</dd>
          </div>
        </dl>
      </div>

      <div className="hero-visual">
        <div className="deck raised">
          <div className="glass-panel">
            <div className="deck-head">
              <span>~/kerja</span>
              <span className="deck-mode">zsh</span>
            </div>
            <pre className="deck-code" aria-label="Contoh tampilan menu interaktif iky">
              <span className="term-prompt">➜</span> <span className="term-strong">~</span> iky
              {"\n\n"}
              <span className="term-logo">{logo}</span>
              {"\n\n"}
              <span className="term-strong">iky</span> <span className="term-muted">v1.0.0</span> ·
              50 alat kecil untuk kerja terminal.{"\n\n"}
              Pilih kategori:{"\n"}
              {"  1  Sistem         6 menu\n"}
              {"  2  Teks          10 menu\n"}
              {"  3  Encoding       8 menu\n"}
              {"  4  Waktu          6 menu\n"}
              {"  5  Angka          6 menu\n"}
              {"  6  Acak & Warna   5 menu\n"}
              {"  7  Developer      7 menu\n"}
              {"  8  File           2 menu\n\n"}
              <span className="term-muted">Ketik nomor, nama menu, atau `keluar`.</span>
            </pre>
          </div>
        </div>
        <p className="deck-note">Tampilan menu interaktif · versi 1.0.0</p>
      </div>
    </section>
  );
}
