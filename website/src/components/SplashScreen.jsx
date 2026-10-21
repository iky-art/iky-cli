import { useCallback, useEffect, useRef, useState } from "react";

export function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState("entering"); // entering | ready | exiting | gone
  const timer = useRef(null);

  const finish = useCallback(() => {
    setPhase("exiting");
    timer.current = setTimeout(() => {
      setPhase("gone");
      onFinish();
    }, 400);
  }, [onFinish]);

  // Masuk ke fase "ready" setelah animasi masuk selesai.
  useEffect(() => {
    timer.current = setTimeout(() => setPhase("ready"), 600);
    return () => clearTimeout(timer.current);
  }, []);

  // Paksa hilang setelah 5 detik kalau tidak ada interaksi.
  useEffect(() => {
    timer.current = setTimeout(finish, 5000);
    return () => clearTimeout(timer.current);
  }, [finish]);

  // Fase "ready" tunggu sebentar lalu auto-hide (bisa diklik untuk lewat).
  useEffect(() => {
    if (phase !== "ready") return;
    timer.current = setTimeout(finish, 1200);
    return () => clearTimeout(timer.current);
  }, [phase, finish]);

  if (phase === "gone") return null;

  const fading = phase === "exiting";

  return (
    <div
      className={`splash ${fading ? "splash-fade" : ""}`}
      role="region"
      aria-label="Layar pembuka iky"
      onClick={finish}
      style={{ cursor: "pointer" }}
    >
      <div className="splash-inner">
        <div className="splash-mark" aria-hidden="true">
          [iky]
        </div>
        <p className="splash-label">CLI serbaguna untuk kerja terminal</p>
        {phase === "ready" && (
          <p className="splash-hint">Klik untuk masuk ke situs</p>
        )}
      </div>
    </div>
  );
}
