import { CopyButton } from "./CopyButton.jsx";
import { SectionHead } from "./SectionHead.jsx";

const examples = [
  'iky base64 encode "halo dunia"',
  'iky calc "2 ^ 10"',
  "iky json pretty --file package.json",
  "iky tree . 2",
  'iky contrast "#1b2430" "#e8edf2"',
];

const faqs = [
  {
    question: "Apakah iky butuh dependensi?",
    answer:
      "Tidak. Semua menu memakai modul bawaan Node.js. Satu-satunya syarat adalah Node.js 18.17 atau lebih baru.",
  },
  {
    question: "Bisa dipakai di pipeline?",
    answer: (
      <>
        Bisa untuk menu yang menerima teks. Contoh: <code>cat catatan.txt | iky count</code>. Untuk
        menu lain, berikan argumen seperti biasa.
      </>
    ),
  },
  {
    question: "Bagaimana kalau data menu gagal dimuat?",
    answer:
      "Bagian menu menampilkan pesan dan tombol coba lagi. Bagian lain situs tetap bisa dipakai.",
  },
  {
    question: "Kenapa jumlah menunya dibatasi 50?",
    answer:
      "Batas registry menjaga daftar menu tetap bisa dipindai dan setiap perintah tetap punya halaman bantuan. Saat ini jumlahnya tepat 50.",
  },
];

export function GuideSection({ notify }) {
  return (
    <section id="panduan" aria-labelledby="guide-title" className="section">
      <div className="shell">
        <SectionHead
          index="03"
          id="guide-title"
          title="Dari menu interaktif sampai pipeline."
          lede="Pakai iky tanpa argumen untuk menjelajah, atau panggil satu perintah langsung saat sudah tahu yang dibutuhkan."
        />

        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="guide-notes">
            <h3 className="subhead">Tiga cara memakai iky</h3>
            <ol className="space-y-5">
              <li className="flex gap-4">
                <span className="pt-0.5 font-mono text-[0.72rem] text-accent" aria-hidden="true">
                  01
                </span>
                <div>
                  <p className="m-0 font-medium">Buka menu interaktif</p>
                  <p className="mt-1 mb-0 text-sm text-ink-soft">
                    Jalankan <code>iky</code> tanpa argumen, lalu pilih kategori atau ketik nama
                    menu.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="pt-0.5 font-mono text-[0.72rem] text-accent" aria-hidden="true">
                  02
                </span>
                <div>
                  <p className="m-0 font-medium">Panggil perintah langsung</p>
                  <p className="mt-1 mb-0 text-sm text-ink-soft">
                    Tambahkan argumen setelah nama menu. Contohnya{" "}
                    <code>iky hash sha256 "halo"</code>.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="pt-0.5 font-mono text-[0.72rem] text-accent" aria-hidden="true">
                  03
                </span>
                <div>
                  <p className="m-0 font-medium">Kirim teks lewat stdin</p>
                  <p className="mt-1 mb-0 text-sm text-ink-soft">
                    Menu yang menerima teks bisa membaca input dari pipeline. Coba{" "}
                    <code>cat catatan.txt | iky count</code>.
                  </p>
                </div>
              </li>
            </ol>

            <h3 className="subhead mt-10">Variabel lingkungan</h3>
            <dl className="env-list">
              <div>
                <dt>NO_COLOR</dt>
                <dd>Matikan warna ANSI. Berguna untuk log atau terminal tanpa warna.</dd>
              </div>
              <div>
                <dt>DEBUG</dt>
                <dd>Tampilkan stack trace saat terjadi kesalahan.</dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="subhead">Contoh yang bisa langsung dicoba</h3>
            <div>
              {examples.map((example) => (
                <div className="example-row" key={example}>
                  <code>{example}</code>
                  <CopyButton
                    value={example}
                    label={`contoh perintah ${example.split(" ")[1]}`}
                    notify={notify}
                  />
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-ink-muted">
              Argumen yang mengandung spasi perlu dikutip. Untuk melihat detail satu menu, jalankan{" "}
              <code>iky help &lt;menu&gt;</code>.
            </p>

            <pre className="inline-code" aria-label="Contoh penggunaan pipeline dan pencarian menu">
              <code>{`# hitung isi file lewat stdin
cat catatan.txt | iky count

# cari menu tanpa membuka menu interaktif
iky list tanggal`}</code>
            </pre>
          </div>
        </div>

        <div className="faq">
          <h3>Pertanyaan singkat</h3>
          {faqs.map((item) => (
            <details className="faq-item" key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
