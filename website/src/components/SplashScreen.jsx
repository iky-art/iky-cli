import { useEffect, useRef, useState } from "react";

export function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState("entering"); // entering | ready | exiting | gone
  const timer = useRef(null);

  useEffect(() => {
    timer.current = setTimeout(() => setPhase("ready"), 600);
    return () => clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (phase !== "ready") return;
    timer.current = setTimeout(() => {
      setPhase("exiting");
      timer.current = setTimeout(() => {
        setPhase("gone");
        onFinish();
      }, 400);
    }, 1200);
    return () => clearTimeout(timer.current);
  }, [phase, onFinish]);

  if (phase === "gone") return null;

  const fading = phase === "exiting";

  return (
    <div
      className={`splash ${fading ? "splash-fade" : ""}`}
      role="region"
      aria-label="Layar pembuka iky"
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
