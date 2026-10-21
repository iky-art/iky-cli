export async function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();

  const ok = document.execCommand("copy");
  document.body.removeChild(field);

  if (!ok) {
    throw new Error("Clipboard tidak tersedia.");
  }
}
