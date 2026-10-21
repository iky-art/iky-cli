import { useCallback, useEffect, useRef, useState } from "react";

const LINES = [
  "$ npm install -g @iky-art/iky",
  "added 1 package, and audited 2 packages in 1s",
  "found 0 vulnerabilities",
];

export function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState("entering"); // entering | ready | exiting | gone
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timer = useRef(null);

  const finish = useCallback(() => {
    setPhase("exiting");
    timer.current = setTimeout(() => {
      setPhase("gone");
      onFinish();
    }, 400);
  }, [onFinish]);

  // Animasi ketik perintah install baris demi baris
  useEffect(() => {
    if (phase !== "ready") return;

    let i = lineIndex;
    let j = charIndex;

    const tick = () => {
      const current = LINES[i] ?? "";
      if (j < current.length) {
        setCharIndex(j + 1);
        timer.current = setTimeout(tick, 45);
      } else if (i < LINES.length - 1) {
        setLineIndex(i + 1);
        setCharIndex(0);
        timer.current = setTimeout(tick, 700);
      } else {
        // Semua baris selesai diketik, jalankan progress install
        runInstall();
      }
    };

    timer.current = setTimeout(tick, 600);
    return () => clearTimeout(timer.current);
  }, [phase, lineIndex, charIndex]);

  // Simulasi progress install setelah ketik selesai
  const runInstall = useCallback(() => {
    let p = 0;
    const iv = setInterval(() => {
      p += 5;
      setProgress(p);
      if (p >= 100) {
        clearInterval(iv);
        timer.current = setTimeout(finish, 900);
      }
    }, 60);
    return () => clearInterval(iv);
  }, [finish]);

  useEffect(() => {
    if (phase !== "ready") return;
    const iv = setInterval(() => {
      const p = progress;
      if (p < 100) setProgress(p + 4);
    }, 70);
    return () => clearInterval(iv);
  }, [phase, progress]);

  // Masuk ke fase ready setelah animasi masuk
  useEffect(() => {
    timer.current = setTimeout(() => setPhase("ready"), 500);
    return () => clearTimeout(timer.current);
  }, []);

  // Paksa hilang setelah 12 detik kalau tidak ada interaksi
  useEffect(() => {
    timer.current = setTimeout(finish, 12000);
    return () => clearTimeout(timer.current);
  }, [finish]);

  if (phase === "gone") return null;

  const fading = phase === "exiting";
  const currentLine = LINES[lineIndex] ?? "";
  const typed = currentLine.slice(0, charIndex);
  const showCursor = phase === "ready" && lineIndex < LINES.length - 1;

  return (
    <div
      className={`splash ${fading ? "splash-fade" : ""}`}
      role="region"
      aria-label="Layar pembuka iky"
      onClick={finish}
      style={{ cursor: "pointer" }}
    >
      {/* Langit malam */}
      <svg className="sky" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0b0f19" />
            <stop offset="60%" stopColor="#121826" />
            <stop offset="100%" stopColor="#1b2430" />
          </linearGradient>
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(143, 208, 200, 0.35)" />
            <stop offset="70%" stopColor="rgba(143, 208, 200, 0.05)" />
            <stop offset="100%" stopColor="rgba(143, 208, 200, 0)" />
          </radialGradient>
        </defs>

        <rect width="800" height="600" fill="url(#skyGrad)" />

        {/* Bintang-bintang */}
        <g fill="#e8edf2" opacity="0.9">
          {[
            { cx: 120, cy: 80, r: 1.2 }, { cx: 210, cy: 45, r: 0.9 }, { cx: 340, cy: 110, r: 1.4 },
            { cx: 460, cy: 60, r: 1.1 }, { cx: 580, cy: 95, r: 1.0 }, { cx: 720, cy: 40, r: 1.3 },
            { cx: 90, cy: 200, r: 0.8 }, { cx: 200, cy: 150, r: 1.2 }, { cx: 320, cy: 190, r: 1.0 },
            { cx: 440, cy: 140, r: 1.5 }, { cx: 560, cy: 180, r: 0.9 }, { cx: 690, cy: 130, r: 1.1 },
            { cx: 150, cy: 320, r: 1.0 }, { cx: 290, cy: 260, r: 1.3 }, { cx: 410, cy: 300, r: 0.8 },
            { cx: 530, cy: 240, r: 1.2 }, { cx: 660, cy: 290, r: 1.0 }, { cx: 740, cy: 200, r: 1.4 },
            { cx: 60, cy: 420, r: 0.9 }, { cx: 180, cy: 380, r: 1.1 }, { cx: 310, cy: 430, r: 1.3 },
            { cx: 450, cy: 390, r: 0.9 }, { cx: 590, cy: 440, r: 1.1 }, { cx: 720, cy: 380, r: 1.0 },
          ].map((star, i) => (
            <circle
              key={i}
              cx={star.cx}
              cy={star.cy}
              r={star.r}
              className="star"
              style={{ animation: `twinkle ${2 + i * 0.15}s ease-in-out infinite alternate` }}
            />
          ))}
        </g>

        {/* Bulan sabit */}
        <g transform="translate(640, 140)">
          <circle cx="0" cy="0" r="42" fill="#2d7a73" opacity="0.95" />
          <circle cx="14" cy="-4" r="42" fill="#0b0f19" />
          <circle cx="0" cy="0" r="42" fill="url(#moonGlow)" />
        </g>

        {/* Tanah / horizon */}
        <path
          d="M0 560 Q 200 540 400 550 T 800 580 V 600 H 0 Z"
          fill="#151c22"
        />
        <path
          d="M0 550 Q 250 530 500 540 T 800 570 V 590 H 0 Z"
          fill="#0b0f19"
          opacity="0.85"
        />

        {/* Pohon kecil di kanan */}
        <path d="M760 560 L 780 440 Q 770 430 760 440 L 740 560 Z" fill="#0b0f19" />
        <circle cx="770" cy="425" r="26" fill="#151c22" />

        {/* Orang duduk sambil melihat ke langit (silhouette) */}
        <g transform="translate(140, 460)">
          {/* Badan duduk */}
          <path d="M20 40 Q 40 40 40 20 L 40 0 Q 40 -10 20 -10 L 0 0 Q 0 10 20 40 Z" fill="#0b0f19" />
          {/* Tengkuk dan kepala */}
          <path d="M30 0 L 30 -12 Q 30 -22 20 -22 Q 10 -22 10 -12 L 10 0 Z" fill="#0b0f19" />
          <circle cx="20" cy="-26" r="8" fill="#0b0f19" />
          {/* Tangan yang terangkat ke langit */}
          <path d="M40 10 Q 60 10 70 0 Q 75 -5 75 -15 Q 70 -20 60 -18 Q 55 -15 50 -12 Q 45 -8 40 10 Z" fill="#0b0f19" />
          {/* Kaki bersilang */}
          <path d="M10 40 Q 30 45 50 40 L 55 50 Q 55 60 45 62 Q 35 60 25 52 Q 15 48 10 40 Z" fill="#0b0f19" />
          <path d="M25 52 Q 45 57 55 50 L 58 60 Q 58 68 48 70 Q 38 66 28 58 Q 18 54 25 52 Z" fill="#151c22" />
        </g>
      </svg>

      {/* Brand [iky] di atas */}
      <div className="splash-brand" aria-hidden="true">
        [iky]
      </div>

      {/* Terminal install preview di tengah */}
      <div className="terminal-card">
        <div className="terminal-header">
          <div className="dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
          <span className="terminal-title">Terminal</span>
        </div>
        <div className="terminal-body">
          {LINES.slice(0, lineIndex).map((line, i) => (
            <div key={i} className="terminal-line">
              <span className="prompt">$</span>{" "}
              <span className="command">{line}</span>
            </div>
          ))}
          {lineIndex < LINES.length && (
            <div className="terminal-line typing">
              <span className="prompt">$</span>{" "}
              <span className="command">{typed}</span>
              {showCursor && <span className="cursor">█</span>}
            </div>
          )}
          {progress > 0 && (
            <div className="terminal-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="progress-text">memasang @iky-art/iky… {progress}%</span>
            </div>
          )}
        </div>
      </div>

      {phase === "ready" && (
        <p className="splash-hint">Klik untuk masuk ke situs</p>
      )}
    </div>
  );
}
