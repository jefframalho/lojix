// Funções pequenas usadas em todo o sistema.
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const brl = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Lê números digitados no padrão brasileiro: "1.234,50", "12,5", "12.5", "R$ 10"
export function num(v) {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  let s = String(v ?? "").trim().replace(/[^\d,.\-]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}
export const numTxt = (v) => (v === "" || v == null ? "" : String(v).replace(".", ","));

export const dstr = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const hojeStr = () => dstr(new Date());
export const addDias = (s, n) => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return dstr(d); };
export const fmtData = (s) => (s ? s.slice(8, 10) + "/" + s.slice(5, 7) + "/" + s.slice(0, 4) : "");
export const fmtDM = (s) => (s ? s.slice(8, 10) + "/" + s.slice(5, 7) : "");
export const fmtHora = (iso) => { const d = new Date(iso); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
export const diaSemana = (s) => ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][new Date(s + "T00:00:00").getDay()];

export const soNumeros = (s) => String(s || "").replace(/\D/g, "");
export function waLink(tel, msg) {
  let n = soNumeros(tel);
  if (!n) return "";
  if (n.length <= 11) n = "55" + n;
  return "https://wa.me/" + n + "?text=" + encodeURIComponent(msg || "");
}
export const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
