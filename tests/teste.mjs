import assert from "node:assert/strict";
const mem = {}; globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
const { S, COLS } = await import("../js/state.js");
const U = await import("../js/util.js");
const C = await import("../js/calc.js");
const R = await import("../js/ramos.js");
const V = await import("../js/views.js");
const { criarLocal } = await import("../js/data.js");
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

// util / calc
ok(U.num("1.234,50") === 1234.5, "num BR"); ok(U.num("12,5") === 12.5, "num virgula"); ok(U.r2(0.1 + 0.2) === 0.3, "r2");
ok(U.esc("<b>&\"") === "&lt;b&gt;&amp;&quot;", "esc");
const itens = [{ qtd: 2, preco: 10.1 }, { qtd: 1, preco: 5 }];
ok(C.totalItens(itens) === 25.2, "total"); ok(C.totalVenda(itens, 30) === 0, "desconto não negativo");
ok(C.numeroProximo([{ numero: 3 }, { numero: 7 }]) === 8, "numero");
const add = C.addItem([{ refId: "a", tipo: "produto", qtd: 1 }], { refId: "a", tipo: "produto", qtd: 1 });
ok(add.length === 1 && add[0].qtd === 2, "addItem soma");
const prods = [{ id: "a", controle: "Sim", estoque: 5, minimo: 5 }, { id: "b", controle: "Não" }];
ok(C.ajustesEstoque(prods, [{ tipo: "produto", refId: "a", qtd: 2 }, { tipo: "produto", refId: "b", qtd: 1 }], -1)[0].delta === -2, "estoque");
ok(C.estoqueBaixo(prods).length === 1, "estoque baixo");
const cx = C.resumoCaixa([{ dia: "2026-11-10", total: 50, pagamento: "Pix" }, { dia: "2026-11-10", total: 20, pagamento: "Pix", cancelada: true }], [{ data: "2026-11-10", tipo: "saida", valor: "10,00" }], "2026-11-10", "2026-11-10");
ok(cx.vendasTotal === 50 && cx.saldo === 40 && cx.porForma.Pix === 50, "caixa");
const agora = new Date("2026-11-10T12:00:00Z");
ok(C.situacaoAssinatura({ status: "teste", venceEm: "2026-11-12T12:00:00Z" }, agora).ok, "teste ok");
ok(!C.situacaoAssinatura({ status: "ativa", venceEm: "2026-11-01T00:00:00Z" }, agora).ok, "vencida");
ok(!C.situacaoAssinatura({ status: "bloqueada", venceEm: "2027-01-01" }, agora).ok, "bloqueada");

// cada ramo: dados de exemplo + todas as telas e modais
for (const ramo of R.RAMO_IDS) {
  const db = criarLocal(); db.iniciar({ nome: "Teste " + ramo, ramo });
  const ex = R.exemplos(ramo);
  for (const c of COLS) S.cols[c] = [];
  for (const [col, arr] of Object.entries(ex)) { for (const o of arr) await db.salvar(col, o); S.cols[col] = arr; }
  Object.assign(S, { dados: db, ramo, empresa: { nome: "Teste", ramo, assinatura: { status: "teste", venceEm: new Date(Date.now() + 5 * 864e5).toISOString() }, ativa: true }, user: { email: "a@b.c" }, ehAdmin: true, dia: U.hojeStr(), caixa: "hoje", m: null });
  const menu = R.RAMOS[ramo].menu.concat(["conta", "admin"]);
  for (const rota of menu) {
    S.rota = rota; if (rota === "admin") S.assinantes = [{ id: "x", nome: "Loja X", ramo, email: "x@x", assinatura: { status: "teste", venceEm: new Date().toISOString() } }];
    const h = V.telaAtual(); ok(typeof h === "string" && h.length > 30 && !/undefined|NaN|\[object/.test(h), `${ramo}/${rota} html ruim: ${(h.match(/.{20}(undefined|NaN|\[object).{20}/) || [""])[0]}`);
  }
  ok(V.menuHTML().includes("data-rota"), ramo + " menu");
  for (const col of Object.keys(R.ENT)) { if (!R.RAMOS[ramo].menu.includes(col)) continue; const m = V.mForm(col, {}, "Novo"); ok(m.includes("modal"), `${ramo}/${col} form`); const m2 = V.mForm(col, S.cols[col][0] || {}, "Editar"); ok(!/undefined|NaN/.test(m2), `${ramo}/${col} edit`); }
  S.m = { tipo: "os", itens: [] };
  if (S.cols.os.length) { ok(!/undefined|NaN/.test(V.mOS(S.cols.os[0])), ramo + " mOS"); S.m = { tipo: "os", itens: [] }; ok(V.mOS({ status: "Aberta" }).includes("modal"), ramo + " mOS novo"); }
  if (S.cols.agenda.length) { ok(!/undefined|NaN/.test(V.mAgenda(S.cols.agenda[0])), ramo + " mAgenda"); ok(V.mAgenda({ data: U.hojeStr(), hora: "", status: "Agendado" }).includes("modal"), ramo + " mAgenda novo"); }
  S.m = { tipo: "cm", itens: [], taxa: true };
  if (S.cols.comandas.length) { ok(!/undefined|NaN/.test(V.mComanda(S.cols.comandas[0])), ramo + " mComanda"); }
  ok(V.mPagamento("Cobrar", 99.9).includes("99,90"), ramo + " pagamento");
  // PDV: carrinho
  S.pdv.itens = C.addItem([], { refId: S.cols.produtos[0].id, tipo: "produto", nome: S.cols.produtos[0].nome, preco: S.cols.produtos[0].preco, qtd: 1 });
  S.rota = "vendas"; if (R.RAMOS[ramo].menu.includes("vendas")) ok(V.pdvCart().includes(S.cols.produtos[0].nome.slice(0, 5)), ramo + " carrinho");
  // persistência local
  const salvo = db.exportar(); ok(Object.keys(salvo.cols).length > 0, ramo + " exportar");
  const db2 = criarLocal(); ok(db2.temSessao(), ramo + " reabre"); await db2.sair(); ok(!criarLocal().temSessao(), ramo + " sair");
}
// incrementar
const d = criarLocal(); d.iniciar({ nome: "x", ramo: "loja" }); const p = await d.salvar("produtos", { nome: "a", estoque: 5 }); await d.incrementar("produtos", p.id, "estoque", -2);
let got; d.watch("produtos", l => { got = l; }); ok(got[0].estoque === 3, "incrementar");
console.log("OK —", n, "verificações");
