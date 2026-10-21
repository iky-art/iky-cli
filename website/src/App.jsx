import { useCallback, useEffect, useRef, useState } from "react";
import { Dock } from "./components/Dock.jsx";
import { Footer } from "./components/Footer.jsx";
import { GuideSection } from "./components/GuideSection.jsx";
import { Hero } from "./components/Hero.jsx";
import { InstallSection } from "./components/InstallSection.jsx";
import { MenuExplorer } from "./components/MenuExplorer.jsx";
import { SiteHeader } from "./components/SiteHeader.jsx";
import { SplashScreen } from "./components/SplashScreen.jsx";
import { Toast } from "./components/Toast.jsx";
import { useScrollSpy } from "./hooks/useScrollSpy.js";
import { useTheme } from "./hooks/useTheme.js";

const SECTION_IDS = ["atas", "menu", "pasang", "panduan"];

export default function App() {
  const { theme, toggle } = useTheme();
  const active = useScrollSpy(SECTION_IDS);
  const [toast, setToast] = useState(null);
  const [splashDone, setSplashDone] = useState(false);
  const timer = useRef(null);

  const notify = useCallback((message) => {
    setToast({ message, id: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <>
      <a className="skip-link" href="#konten">
        Lewati ke konten
      </a>
      {!splashDone && <SplashScreen onFinish={() => setSplashDone(true)} />}
      {splashDone && (
        <>
          <SiteHeader />
          <main id="konten" tabIndex={-1} className="site-main">
            <Hero notify={notify} />
            <MenuExplorer notify={notify} />
            <InstallSection notify={notify} />
            <GuideSection notify={notify} />
          </main>
          <Footer />
          <Dock active={active} theme={theme} onToggleTheme={toggle} />
          <Toast message={toast?.message} />
        </>
      )}
    </>
  );
}
