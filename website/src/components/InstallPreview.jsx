import { useCallback, useEffect, useRef, useState } from "react";

const TYPE_LINES = ["$ npm install -g @iky-art/iky"];
const INSTALL_LINES = [
  "added 1 package, and audited 2 packages in 2s",
  "found 0 vulnerabilities",
];

export function InstallPreview({ command }) {
  const [phase, setPhase] = useState("entering"); // entering | ready | exiting | gone
  const [charIndex, setCharIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [installLine, setInstallLine] = useState(0);
  const timer = useRef(null);

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const finish = useCallback(() => {
    setPhase("exiting");
    timer.current = setTimeout(() => {
      setPhase("gone");
    }, 400);
  }, []);

  // Ketik perintah install karakter demi karakter
  useEffect(() => {
    if (phase !== "ready") return;

    const current = TYPE_LINES[0];
    if (charIndex < current.length) {
      timer.current = setTimeout(() => setCharIndex(charIndex + 1), 70);
    } else {
      startInstall();
    }

    return () => clearTimeout(timer.current);
  }, [phase, charIndex, startInstall]);

  // Simulasi progres instalasi npm
  const startInstall = useCallback(() => {
    let p = 0;
    let line = 0;
    const iv = setInterval(() => {
      p += 2;
      setProgress(Math.min(p, 100));

      if (p > 30 && line === 0) {
        setInstallLine(1);
        line = 1;
      } else if (p > 70 && line === 1) {
        setInstallLine(2);
        line = 2;
      }

      if (p >= 100) {
        clearInterval(iv);
        timer.current = setTimeout(finish, 900);
      }
    }, 110);
    return () => clearInterval(iv);
  }, [finish]);

  // Masuk ke fase ready
  useEffect(() => {
    timer.current = setTimeout(() => setPhase("ready"), 500);
    return () => clearTimeout(timer.current);
  }, []);

  // Paksa hilang setelah 18 detik
  useEffect(() => {
    timer.current = setTimeout(finish, 18000);
    return () => clearTimeout(timer.current);
  }, [finish]);

  // Reset saat command berubah (ganti tab)
  useEffect(() => {
    setPhase("entering");
    setCharIndex(0);
    setProgress(0);
    setInstallLine(0);
    timer.current = setTimeout(() => setPhase("ready"), 500);
    return () => clearTimeout(timer.current);
  }, [command]);

  if (phase === "gone") return null;

  const fading = phase === "exiting";
  const current = TYPE_LINES[0];
  const typed = current.slice(0, charIndex);
  const showCursor = phase === "ready" && charIndex < current.length;

  return (
    <div
      className={`install-preview ${fading ? "install-preview-fade" : ""}`}
      role="region"
      aria-label="Preview pemasangan iky"
    >
      {/* Langit malam dengan bintang dan bulan sabit */}
      <svg
        className="install-sky"
        viewBox="0 0 700 500"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="installSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0b0f19" />
            <stop offset="100%" stopColor="#1b2430" />
          </linearGradient>
          <radialGradient id="installMoonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(143, 208, 200, 0.35)" />
            <stop offset="100%" stopColor="rgba(143, 208, 200, 0)" />
          </radialGradient>
        </defs>

        <rect width="700" height="500" fill="url(#installSkyGrad)" />

        {/* Bintang-bintang */}
        <g fill="#e8edf2" opacity="0.9">
          {[120, 210, 340, 460, 580, 720, 90, 200, 320, 440, 560, 690].map(
            (cx, i) => (
              <circle
                key={i}
                cx={cx}
                cy={60 + (i % 4) * 70}
                r={1}
                className="star"
                style={{ animation: `twinkle ${2 + i * 0.1}s ease-in-out infinite alternate` }}
              />
            )
          )}
        </g>

        {/* Bulan sabit */}
        <g transform="translate(560, 120)">
          <circle cx="0" cy="0" r="36" fill="#2d7a73" opacity="0.95" />
          <circle cx="12" cy="-4" r="36" fill="#0b0f19" />
          <circle cx="0" cy="0" r="36" fill="url(#installMoonGlow)" />
        </g>

        {/* Horizon */}
        <path
          d="M0 450 Q 200 440 400 450 T 700 470 V 500 H 0 Z"
          fill="#151c22"
        />
        <path
          d="M0 440 Q 250 430 500 440 T 700 460 V 490 H 0 Z"
          fill="#0b0f19"
          opacity="0.85"
        />

        {/* Pohon kecil */}
        <path d="M660 450 L 680 360 Q 670 355 660 360 L 640 450 Z" fill="#0b0f19" />
        <circle cx="670" cy="350" r="22" fill="#151c22" />

        {/* Orang duduk melihat ke langit */}
        <g transform="translate(120, 380)">
          <path d="M20 40 Q 40 40 40 20 L 40 0 Q 40 -10 20 -10 L 0 0 Q 0 10 20 40 Z" fill="#0b0f19" />
          <path d="M30 0 L 30 -12 Q 30 -22 20 -22 Q 10 -22 10 -12 L 10 0 Z" fill="#0b0f19" />
          <circle cx="20" cy="-26" r="7" fill="#0b0f19" />
          <path d="M40 10 Q 60 10 70 0 Q 75 -5 75 -15 Q 70 -20 60 -18 Q 55 -15 50 -12 Q 45 -8 40 10 Z" fill="#0b0f19" />
          <path d="M10 40 Q 30 45 50 40 L 55 50 Q 55 60 45 62 Q 35 60 25 52 Q 15 48 10 40 Z" fill="#0b0f19" />
          <path d="M25 52 Q 45 57 55 50 L 58 60 Q 58 68 48 70 Q 38 66 28 58 Q 18 54 25 52 Z" fill="#151c22" />
        </g>
      </svg>

      <div className="install-brand" aria-hidden="true">
        [iky]
      </div>

      <div className="install-card">
        <div className="install-header">
          <div className="install-dots">
            <span className="install-dot" />
            <span className="install-dot" />
            <span className="install-dot" />
          </div>
          <span className="install-title">Terminal</span>
        </div>
        <div className="install-body">
          {charIndex < current.length && (
            <div className="install-line typing">
              <span className="install-prompt">$</span>{" "}
              <span className="install-command">{typed}</span>
              {showCursor && <span className="install-cursor">█</span>}
            </div>
          )}
          {INSTALL_LINES.slice(0, installLine).map((line, i) => (
            <div key={i} className="install-line">
              <span className="install-command">{line}</span>
            </div>
          ))}
          {progress > 0 && (
            <div className="install-progress">
              <div className="install-bar">
                <div className="install-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="install-progress-text">
                memasang @iky-art/iky… {progress}%
              </span>
            </div>
          )}
        </div>
      </div>

      {phase === "ready" && charIndex >= current.length && (
        <p className="install-hint">Klik untuk ulangi instalasi</p>
      )}
    </div>
  );
}
