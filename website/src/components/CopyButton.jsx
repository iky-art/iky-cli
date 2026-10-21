import { useEffect, useRef, useState } from "react";
import { copyText } from "../lib/copy.js";
import { Icon } from "./Icon.jsx";

export function CopyButton({ value, label, notify, className = "" }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function handleCopy() {
    try {
      await copyText(value);
      setCopied(true);
      notify(`${label} disalin`);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      notify("Gagal menyalin. Pilih teksnya secara manual.");
    }
  }

  return (
    <button
      type="button"
      className={`copy-btn ${copied ? "is-copied" : ""} ${className}`}
      aria-label={`Salin ${label}`}
      onClick={handleCopy}
    >
      <Icon name={copied ? "check" : "copy"} />
    </button>
  );
}
