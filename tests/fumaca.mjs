// Abre o app inteiro com um DOM de mentira e aperta todos os botões de cada tela, em cada ramo.
const mem = {}; globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
const erros = []; const origErr = console.error; console.error = (...a) => { erros.push(a.map(String).join(" ")); };
const els = {}; const handlers = {};
const mk = (id) => els[id] ||= { id, value: "", _h: "", hidden: false, textContent: "", dataset: {}, classList: { add() {}, remove() {}, toggle() {} }, focus() {}, matches: () => false, closest: () => null, remove() {}, click() {},
  get innerHTML() { return this._h; }, set innerHTML(v) { this._h = v; registrar(v); } };
const registrar = (html) => { for (const m of html.matchAll(/id="([\w-]+)"/g)) mk(m[1]); };
globalThis.document = { title: "", body: { classList: { add() {}, remove() {} }, appendChild() {} }, activeElement: null, createElement: () => mk("_a"),
  querySelector: (s) => (s[0] === "#" ? mk(s.slice(1)) : null), querySelectorAll: () => [], addEventListener: (t, f) => { handlers[t] = f; } };
globalThis.window = { scrollTo() {}, open() {} }; globalThis.location = { reload() {} };
globalThis.confirm = () => true; globalThis.URL.createObjectURL = () => "blob:x"; globalThis.URL.revokeObjectURL = () => {};
const tick = () => new Promise((r) => setTimeout(r, 5));
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/data-([\w-]+)="([^"]*)"/g)].map((m) => [m[1].replace(/-(\w)/g, (_, c) => c.toUpperCase()), m[2]]));
const clicar = async (a) => { const el = { dataset: a, closest: () => el, value: "" }; await handlers.click({ target: { closest: () => el }, ...{} }); await tick(); };

await import("../js/app.js"); await tick();
const root = mk("root"), { S } = await import("../js/state.js"), { RAMO_IDS } = await import("../js/ramos.js");
const falhas = []; let toques = 0;
const SEGUROS = new Set(["sair", "recarregar", "onb-voltar"]);
for (const ramo of RAMO_IDS) {
  for (const k of Object.keys(mem)) delete mem[k];
  await clicar({ a: "demo-abrir" });
  mk("o_nome").value = "Loja " + ramo; mk("o_ex").checked = true;
  // escolhe o ramo: onb-ok lê o radio marcado
  globalThis.document.querySelectorAll = (s) => (/ramo/.test(s) ? [{ value: ramo, checked: true }] : []);
  globalThis.document.querySelector = ((q) => (s) => (/input\[name="ramo"\]:checked/.test(s) ? { value: ramo } : q(s)))(globalThis.document.querySelector);
  await clicar({ a: "onb-ok" }); await tick(); await tick();
  if (S.ramo !== ramo) { falhas.push(`${ramo}: onboarding não escolheu o ramo (S.ramo=${S.ramo})`); continue; }
  const menu = [...mk("nav").innerHTML.matchAll(/data-rota="(\w+)"/g)].map((m) => m[1]);
  for (const rota of menu) {
    await clicar({ a: "ir", rota }); await tick();
    const html = mk("view").innerHTML;
    if (!html || /undefined|NaN|\[object/.test(html)) falhas.push(`${ramo}/${rota}: html ruim`);
    const botoes = [...new Set([...html.matchAll(/<(?:button|tr|a|div)[^>]*data-a="[^"]*"[^>]*>/g)].map((m) => m[0]))].slice(0, 25);
    for (const b of botoes) {
      const a = attrs(b); if (SEGUROS.has(a.a)) continue;
      try { await clicar(a); toques++; } catch (e) { falhas.push(`${ramo}/${rota} ${a.a}: ${e.message}`); }
      const modal = mk("modal").innerHTML; if (/undefined|NaN|\[object/.test(modal)) falhas.push(`${ramo}/${rota} ${a.a}: modal ruim`);
      await clicar({ a: "fechar" });
    }
  }
}
// fluxo de venda: loja, vende 2 unidades de um produto com estoque e confere
{
  for (const k of Object.keys(mem)) delete mem[k];
  await clicar({ a: "demo-abrir" }); mk("o_nome").value = "L";
  globalThis.document.querySelector = ((q) => (s) => (/input\[name="ramo"\]:checked/.test(s) ? { value: "loja" } : q(s)))(globalThis.document.querySelector);
  await clicar({ a: "onb-ok" }); await tick(); await tick();
  const p = S.cols.produtos.find((x) => x.controle === "Sim"), antes = Number(p.estoque);
  await clicar({ a: "ir", rota: "vendas" });
  await clicar({ a: "pdv-add", t: "produto", r: p.id }); await clicar({ a: "pdv-mais", i: "0" });
  await clicar({ a: "pdv-finalizar" }); await tick();
  const v = S.cols.vendas[0], dep = Number(S.cols.produtos.find((x) => x.id === p.id).estoque);
  if (!v || v.itens[0].qtd !== 2 || dep !== antes - 2) falhas.push(`venda: estoque ${antes}->${dep}, venda=${JSON.stringify(v && v.total)}`);
  await clicar({ a: "venda-cancelar", id: v.id }); await tick();
  if (Number(S.cols.produtos.find((x) => x.id === p.id).estoque) !== antes) falhas.push("cancelar não devolveu estoque");
  console.log("venda ok:", v && v.total, "estoque", antes, "->", dep, "-> devolvido");
}
console.log("toques:", toques, "| falhas:", falhas.length, "| console.error:", erros.length);
falhas.slice(0, 20).forEach((f) => console.log(" -", f)); erros.slice(0, 5).forEach((f) => console.log(" err:", f));
process.exit(falhas.length || erros.length ? 1 : 0);
