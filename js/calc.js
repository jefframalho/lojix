// Contas do sistema, sem nada de tela, para poderem ser testadas sozinhas.
import { r2, num } from "./util.js";

export const totalItens = (itens) => r2((itens || []).reduce((a, i) => a + r2((Number(i.qtd) || 0) * (Number(i.preco) || 0)), 0));
export const totalVenda = (itens, desconto) => Math.max(0, r2(totalItens(itens) - (Number(desconto) || 0)));
export const numeroProximo = (lista) => (lista || []).reduce((m, x) => Math.max(m, Number(x.numero) || 0), 0) + 1;

// Soma uma linha de produto/serviço ao carrinho (ou aumenta a quantidade se já existir)
export function addItem(itens, novo) {
  const out = itens.map((i) => ({ ...i }));
  const ja = novo.refId ? out.find((i) => i.refId === novo.refId && i.tipo === novo.tipo) : null;
  if (ja) ja.qtd = (Number(ja.qtd) || 0) + (Number(novo.qtd) || 1);
  else out.push({ qtd: 1, ...novo });
  return out;
}

// Quanto mexer no estoque ao vender (sinal -1) ou cancelar (sinal +1). Só produtos com controle de estoque.
export function ajustesEstoque(produtos, itens, sinal) {
  const por = {};
  (itens || []).forEach((i) => {
    if (i.tipo !== "produto" || !i.refId) return;
    const p = produtos.find((x) => x.id === i.refId);
    if (!p || p.controle !== "Sim") return;
    por[p.id] = (por[p.id] || 0) + sinal * (Number(i.qtd) || 0);
  });
  return Object.keys(por).map((id) => ({ id, delta: por[id] })).filter((a) => a.delta !== 0);
}

export const estoqueBaixo = (produtos) => (produtos || []).filter((p) => p.controle === "Sim" && num(p.estoque) <= num(p.minimo));

// Resumo do caixa entre duas datas (AAAA-MM-DD, inclusive)
export function resumoCaixa(vendas, lancs, de, ate) {
  const vv = (vendas || []).filter((v) => !v.cancelada && v.dia >= de && v.dia <= ate);
  const porForma = {};
  vv.forEach((v) => { porForma[v.pagamento] = r2((porForma[v.pagamento] || 0) + v.total); });
  const vendasTotal = r2(vv.reduce((a, v) => a + v.total, 0));
  const ll = (lancs || []).filter((l) => l.data >= de && l.data <= ate);
  const entradas = r2(ll.filter((l) => l.tipo === "entrada").reduce((a, l) => a + num(l.valor), 0));
  const saidas = r2(ll.filter((l) => l.tipo === "saida").reduce((a, l) => a + num(l.valor), 0));
  return { vendasTotal, qtd: vv.length, porForma, entradas, saidas, saldo: r2(vendasTotal + entradas - saidas) };
}

// Assinatura: em teste, ativa, vencida ou bloqueada
export function situacaoAssinatura(a, agora) {
  if (!a) return { ok: false, txt: "Sem assinatura" };
  if (a.status === "demo") return { ok: true, txt: "Demonstração" };
  if (a.status === "bloqueada") return { ok: false, txt: "Bloqueada" };
  const ate = a.venceEm ? new Date(a.venceEm) : null;
  if (!ate || ate <= (agora || new Date())) return { ok: false, txt: "Vencida" };
  const dias = Math.ceil((ate - (agora || new Date())) / 864e5);
  return { ok: true, dias, txt: (a.status === "teste" ? "Teste grátis" : "Ativa") + " · " + dias + (dias === 1 ? " dia restante" : " dias restantes") };
}
