// Telas. Cada função só devolve HTML a partir do estado (S); os cliques ficam em app.js.
import { S } from "./state.js";
import { esc, brl, r2, num, numTxt, hojeStr, addDias, fmtData, fmtDM, fmtHora, diaSemana, norm, waLink } from "./util.js";
import { totalItens, totalVenda, estoqueBaixo, resumoCaixa, situacaoAssinatura, semVoltar, aniversariantes, horaMin, minHora, comissoes } from "./calc.js";
import { RAMOS, ENT, PAGAMENTOS, STATUS_OS, STATUS_AG, rotulo, itemMenu, camposDe } from "./ramos.js";

const R = () => RAMOS[S.ramo] || RAMOS.loja;
const rot = (c, p) => rotulo(S.ramo, c, p);
export const tem = (id) => R().menu.includes(id);
const nomeDe = (col, id) => { const x = (S.cols[col] || []).find((o) => o.id === id); return x ? x.nome : ""; };
const achar = (col, id) => (S.cols[col] || []).find((o) => o.id === id);
const somar = (l) => r2(l.reduce((a, v) => a + (v.total || 0), 0));

// ---------- peças reutilizáveis ----------
const cab = (titulo, acoes) => `<div class="pghead"><h1>${titulo}</h1><div class="acoes">${acoes || ""}</div></div>`;
const vazio = (txt, btn) => `<div class="empty"><p>${txt}</p>${btn || ""}</div>`;
const stat = (l, v, s) => `<div class="stat"><span class="l">${l}</span><b>${v}</b>${s ? `<span class="s">${s}</span>` : ""}</div>`;

export function modal(titulo, corpo, rodape, larg) {
  return `<div class="modal-bg" data-a="bg"><div class="modal${larg ? " " + larg : ""}" role="dialog" aria-modal="true" aria-label="${esc(titulo)}">
    <div class="mhead"><h2>${esc(titulo)}</h2><button class="x" data-a="fechar" aria-label="Fechar">✕</button></div>
    <div class="mbody">${corpo}</div><div class="mfoot">${rodape}</div></div></div>`;
}

const opcao = (o, sel) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${v === sel ? " selected" : ""}>${esc(l)}</option>`; };

export function campoHTML(c, val) {
  const id = "f_" + c.k, v = val ?? "";
  let inp;
  if (c.t === "area") inp = `<textarea id="${id}" name="${c.k}" rows="3">${esc(v)}</textarea>`;
  else if (c.t === "select") inp = `<select id="${id}" name="${c.k}">${c.op.map((o) => opcao(o, v)).join("")}</select>`;
  else if (c.t === "ref") inp = `<select id="${id}" name="${c.k}"><option value="">—</option>${(S.cols[c.c] || []).slice().sort((a, b) => norm(a.nome).localeCompare(norm(b.nome))).map((x) => opcao([x.id, x.nome], v)).join("")}</select>`;
  else if (c.t === "money" || c.t === "num") inp = `<input id="${id}" name="${c.k}" inputmode="decimal" value="${esc(numTxt(v))}" autocomplete="off">`;
  else if (c.t === "date") inp = `<input id="${id}" name="${c.k}" type="date" value="${esc(v)}">`;
  else if (c.t === "time") inp = `<input id="${id}" name="${c.k}" type="time" value="${esc(v)}">`;
  else inp = `<input id="${id}" name="${c.k}" type="${c.t === "tel" ? "tel" : "text"}" value="${esc(v)}" autocomplete="off">`;
  return `<label class="fld"><span>${esc(c.l)}${c.req ? " *" : ""}</span>${inp}</label>`;
}

// ---------- catálogo (produtos e serviços que podem ser vendidos) ----------
export function catalogo() {
  const out = S.cols.produtos.map((x) => ({ tipo: "produto", refId: x.id, nome: x.nome, preco: num(x.preco), cat: x.categoria || "", est: x.controle === "Sim" ? num(x.estoque) : null }));
  if (tem("servicos")) S.cols.servicos.forEach((x) => out.push({ tipo: "servico", refId: x.id, nome: x.nome, preco: num(x.preco), cat: "Serviços", est: null }));
  return out.sort((a, b) => norm(a.nome).localeCompare(norm(b.nome)));
}
const botaoCat = (x, acao) => `<button class="prod" data-a="${acao}" data-t="${x.tipo}" data-r="${esc(x.refId)}" data-q="${esc(norm(x.nome + " " + x.cat))}">
  <b>${esc(x.nome)}</b><span>${brl(x.preco)}</span>${x.est != null ? `<small class="${x.est <= 0 ? "warn" : ""}">estoque ${x.est}</small>` : ""}</button>`;

// ---------- editor de itens (OS e comanda) ----------
export function itensHTML(itens) {
  const linhas = itens.length
    ? itens.map((i, n) => `<div class="it"><div class="it-n">${esc(i.nome)}<small>${brl(i.preco)}</small></div>
        <div class="qtd"><button class="mini" data-a="it-menos" data-i="${n}" aria-label="Diminuir">−</button><b>${i.qtd}</b><button class="mini" data-a="it-mais" data-i="${n}" aria-label="Aumentar">+</button></div>
        <div class="it-t">${brl(r2(i.qtd * i.preco))}</div><button class="mini" data-a="it-del" data-i="${n}" aria-label="Remover">✕</button></div>`).join("")
    : `<p class="vazio">Nenhum item ainda.</p>`;
  return linhas + `<div class="it-total"><span>Total dos itens</span><b>${brl(totalItens(itens))}</b></div>`;
}
const seletorCat = () => {
  const c = catalogo(), p = c.filter((x) => x.tipo === "produto"), s = c.filter((x) => x.tipo === "servico");
  const og = (t, l) => (l.length ? `<optgroup label="${t}">${l.map((x) => `<option value="${x.tipo}:${esc(x.refId)}">${esc(x.nome)} · ${brl(x.preco)}</option>`).join("")}</optgroup>` : "");
  return `<select data-ch="it-cat"><option value="">+ Adicionar do cadastro…</option>${og(rot("produtos", true), p)}${og(rot("servicos", true), s)}</select>`;
};
const avulso = () => `<div class="avulso"><input id="av_nome" placeholder="Outro item (descrição)"><input id="av_preco" inputmode="decimal" placeholder="Valor"><button class="btn" data-a="it-avulso">Adicionar</button></div>`;

// ---------- painel ----------
export function vPainel() {
  const hoje = hojeStr(), mes = hoje.slice(0, 7);
  const vv = S.cols.vendas.filter((v) => !v.cancelada), vh = vv.filter((v) => v.dia === hoje), vm = vv.filter((v) => v.dia.startsWith(mes));
  const baixo = estoqueBaixo(S.cols.produtos);
  let cards = stat("Vendas hoje", brl(somar(vh)), vh.length + (vh.length === 1 ? " venda" : " vendas"))
    + stat("Vendas no mês", brl(somar(vm)), vm.length + (vm.length === 1 ? " venda" : " vendas"))
    + stat("Ticket médio no mês", vm.length ? brl(somar(vm) / vm.length) : "–", "por venda");
  if (tem("os")) { const ab = S.cols.os.filter((o) => o.status !== "Entregue"); cards += stat("OS em aberto", ab.length, S.cols.os.filter((o) => o.status === "Pronta").length + " prontas para retirar"); }
  if (tem("agenda")) cards += stat("Agenda de hoje", S.cols.agenda.filter((a) => a.data === hoje && a.status !== "Cancelado").length, "agendamentos");
  if (tem("retornos")) { const an = aniversariantes(S.cols.clientes, hoje.slice(5, 7)).filter((x) => x.dia === Number(hoje.slice(8, 10))).length; cards += stat("Aniversariantes hoje", an, "para parabenizar"); }
  if (tem("comandas")) { const ab = S.cols.comandas.filter((c) => c.status === "Aberta"); cards += stat("Comandas abertas", ab.length, brl(r2(ab.reduce((a, c) => a + totalComanda(c), 0))) + " em consumo"); }
  cards += stat("Estoque baixo", baixo.length, baixo.length === 1 ? "produto" : "produtos");

  const comeco = S.cols.produtos.length === 0
    ? `<div class="panel dest"><h3>Comece por aqui</h3><p>Seu sistema de <b>${esc(R().nome.toLowerCase())}</b> está pronto. Cadastre ${esc(rot("produtos", true).toLowerCase())} e ${esc(rot("clientes", true).toLowerCase())}, ou carregue exemplos para ver tudo funcionando.</p>
       <div class="row"><button class="btn pri" data-a="exemplos-carregar">Carregar exemplos do meu ramo</button><button class="btn" data-a="ir" data-rota="produtos">Cadastrar ${esc(rot("produtos", true).toLowerCase())}</button></div></div>` : "";
  const alerta = baixo.length
    ? baixo.slice(0, 6).map((p) => `<div class="li"><span>${esc(p.nome)}</span><span class="pill warn">${num(p.estoque)} em estoque</span></div>`).join("")
    : `<p class="vazio">Nenhum produto com estoque baixo.</p>`;
  const ult = vv.slice().sort((a, b) => (b.em || "").localeCompare(a.em || "")).slice(0, 6)
    .map((v) => `<div class="li"><span>#${v.numero} · ${esc(v.pagamento)}</span><b>${brl(v.total)}</b></div>`).join("") || `<p class="vazio">Nenhuma venda ainda.</p>`;
  return cab("Painel", `<span class="dim">${esc(S.empresa.nome)}</span>`) + comeco + `<div class="stats">${cards}</div>
    <div class="cols2"><div class="panel"><h3>Atenção ao estoque</h3>${alerta}</div><div class="panel"><h3>Últimas vendas</h3>${ult}</div></div>`;
}

// ---------- cadastros genéricos ----------
function celula(c, o, col) {
  const v = o[c.k];
  if (c.t === "money") return brl(v);
  if (c.t === "ref") return esc(nomeDe(c.c, v)) || "–";
  if (col === "produtos" && c.k === "estoque") return o.controle === "Sim" ? `<span class="pill ${num(v) <= num(o.minimo) ? "warn" : ""}">${num(v)}</span>` : "–";
  if (c.k === "duracao") return v ? esc(v) + " min" : "–";
  if (c.k === "comissao") return v !== "" && v != null ? esc(v) + "%" : "–";
  return esc(v) || "–";
}
export function vLista(col) {
  const e = ENT[col], busca = norm(S.busca[col] || "");
  const campos = e.lista.map((k) => camposDe(S.ramo, col).find((c) => c.k === k));
  const texto = (o) => norm(campos.map((c) => (c.t === "ref" ? nomeDe(c.c, o[c.k]) : o[c.k])).join(" "));
  const rows = S.cols[col].slice().sort((a, b) => norm(a.nome).localeCompare(norm(b.nome))).filter((o) => !busca || texto(o).includes(busca));
  const topo = cab(rot(col, true), `<input type="search" class="busca" placeholder="Buscar…" data-busca="1" value="${esc(S.busca[col] || "")}" data-col="${col}"><button class="btn pri" data-a="novo" data-col="${col}">+ Novo</button>`);
  if (!S.cols[col].length) return topo + vazio(`Nenhum registro em ${esc(rot(col, true).toLowerCase())} ainda.`, `<button class="btn pri" data-a="novo" data-col="${col}">Cadastrar o primeiro</button>`);
  const tabela = `<div class="tbl"><table><thead><tr>${campos.map((c) => `<th>${esc(c.l.replace(" (R$)", ""))}</th>`).join("")}</tr></thead><tbody>
    ${rows.map((o) => `<tr data-a="editar" data-col="${col}" data-id="${esc(o.id)}" data-q="${esc(texto(o))}">${campos.map((c) => `<td data-l="${esc(c.l.replace(" (R$)", ""))}">${celula(c, o, col)}</td>`).join("")}</tr>`).join("")}
    </tbody></table></div>`;
  return topo + (rows.length ? tabela : `<div class="empty"><p>Nada encontrado para essa busca.</p></div>`);
}
export function mForm(col, obj, titulo) {
  const e = ENT[col], novo = !obj.id;
  const rod = (novo ? "" : `<button class="btn dan" data-a="excluir" data-col="${col}" data-id="${esc(obj.id)}">Excluir</button>`)
    + `<span class="grow"></span><button class="btn" data-a="fechar">Cancelar</button><button class="btn pri" data-a="salvar" data-col="${col}" data-id="${esc(obj.id || "")}">Salvar</button>`;
  return modal((novo ? "Novo " : "Editar ") + titulo, camposDe(S.ramo, col).map((c) => campoHTML(c, obj[c.k])).join(""), rod);
}

// ---------- vender (PDV) ----------
export function pdvCart() {
  const p = S.pdv, tot = totalVenda(p.itens, num(p.desc));
  const carrinho = p.itens.length
    ? p.itens.map((i, n) => `<div class="it"><div class="it-n">${esc(i.nome)}<small>${brl(i.preco)}</small></div>
        <div class="qtd"><button class="mini" data-a="pdv-menos" data-i="${n}" aria-label="Diminuir">−</button><b>${i.qtd}</b><button class="mini" data-a="pdv-mais" data-i="${n}" aria-label="Aumentar">+</button></div>
        <div class="it-t">${brl(r2(i.qtd * i.preco))}</div><button class="mini" data-a="pdv-del" data-i="${n}" aria-label="Remover">✕</button></div>`).join("")
    : `<p class="vazio">Toque nos itens ao lado para montar a venda.</p>`;
  const clientes = `<select data-ch="pdv-cliente"><option value="">Sem cliente</option>${S.cols.clientes.slice().sort((a, b) => norm(a.nome).localeCompare(norm(b.nome))).map((c) => opcao([c.id, c.nome], p.cliente)).join("")}</select>`;
  const pagto = `<select data-ch="pdv-pag">${PAGAMENTOS.map((x) => opcao(x, p.pag)).join("")}</select>`;
  return `<h3>Venda atual</h3>${carrinho}
      <label class="fld"><span>Cliente (opcional)</span>${clientes}</label>
      <label class="fld"><span>Desconto (R$)</span><input inputmode="decimal" data-in="pdv-desc" value="${esc(p.desc)}" placeholder="0,00"></label>
      <label class="fld"><span>Forma de pagamento</span>${pagto}</label>
      <div class="total"><span>Total</span><b id="pdv-total">${brl(tot)}</b></div>
      <div class="row"><button class="btn" data-a="pdv-limpar">Limpar</button><button class="btn pri grow" data-a="pdv-finalizar">Finalizar venda</button></div>`;
}
export function vVender() {
  const hoje = hojeStr();
  const cat = catalogo();
  const grade = cat.length ? cat.map((x) => botaoCat(x, "pdv-add")).join("") : `<p class="vazio">Cadastre ${esc(rot("produtos", true).toLowerCase())} para vender.</p>`;
  const vendasHoje = S.cols.vendas.filter((v) => v.dia === hoje).sort((a, b) => (b.numero || 0) - (a.numero || 0));
  const hist = vendasHoje.length ? vendasHoje.map((v) => `<div class="li${v.cancelada ? " cancel" : ""}"><span>#${v.numero} · ${fmtHora(v.em)} · ${esc(v.pagamento)} · ${esc((v.itens || []).map((i) => i.nome).join(", ").slice(0, 60))}</span>
      <span><b>${brl(v.total)}</b>${v.cancelada ? ` <span class="pill">cancelada</span>` : ` <button class="link" data-a="venda-cancelar" data-id="${esc(v.id)}">cancelar</button>`}</span></div>`).join("") : `<p class="vazio">Nenhuma venda hoje.</p>`;
  return cab("Vender") + `<div class="pdv">
    <div class="panel"><input type="search" class="busca full" placeholder="Buscar item…" data-busca-cat="1"><div class="grade">${grade}</div></div>
    <div class="panel cart" id="pdv-cart">${pdvCart()}</div>
  </div><div class="panel"><h3>Vendas de hoje</h3>${hist}</div>`;
}

// ---------- caixa ----------
export function periodoCaixa(p) {
  const h = hojeStr();
  if (p === "semana") return [addDias(h, -6), h];
  if (p === "mes") return [h.slice(0, 8) + "01", h];
  return [h, h];
}
export function vCaixa() {
  const [de, ate] = periodoCaixa(S.caixa), r = resumoCaixa(S.cols.vendas, S.cols.lancamentos, de, ate);
  const chip = (id, t) => `<button class="chip${S.caixa === id ? " on" : ""}" data-a="caixa-per" data-p="${id}">${t}</button>`;
  const formas = Object.keys(r.porForma).length ? Object.keys(r.porForma).map((f) => `<div class="li"><span>${esc(f)}</span><b>${brl(r.porForma[f])}</b></div>`).join("") : `<p class="vazio">Sem vendas no período.</p>`;
  const lancs = S.cols.lancamentos.filter((l) => l.data >= de && l.data <= ate).sort((a, b) => b.data.localeCompare(a.data));
  const lista = lancs.length ? lancs.map((l) => `<button class="li btnrow" data-a="lanc-editar" data-id="${esc(l.id)}"><span>${fmtDM(l.data)} · ${esc(l.descricao)}${l.categoria ? ` <small>(${esc(l.categoria)})</small>` : ""}</span><b class="${l.tipo === "saida" ? "neg" : "pos"}">${l.tipo === "saida" ? "−" : "+"} ${brl(num(l.valor))}</b></button>`).join("") : `<p class="vazio">Nenhum lançamento manual no período.</p>`;
  return cab("Caixa", `<div class="chips">${chip("hoje", "Hoje")}${chip("semana", "7 dias")}${chip("mes", "Este mês")}</div>`) + `
    <div class="stats">${stat("Vendas", brl(r.vendasTotal), r.qtd + (r.qtd === 1 ? " venda" : " vendas"))}${stat("Outras entradas", brl(r.entradas))}${stat("Saídas", brl(r.saidas))}${stat("Saldo", brl(r.saldo), "vendas + entradas − saídas")}</div>
    <div class="cols2"><div class="panel"><h3>Vendas por forma de pagamento</h3>${formas}</div>
    <div class="panel"><div class="ph"><h3>Entradas e saídas avulsas</h3><span class="row"><button class="btn sm" data-a="lanc-novo" data-tipo="entrada">+ Entrada</button><button class="btn sm" data-a="lanc-novo" data-tipo="saida">+ Saída</button></span></div>${lista}</div></div>`;
}

// ---------- ordens de serviço ----------
export function totalOS(o) { return totalItens(o.itens); }
export function vOS() {
  const cfg = R().os;
  const coluna = (st) => {
    let l = S.cols.os.filter((o) => o.status === st).sort((a, b) => (a.numero || 0) - (b.numero || 0));
    if (st === "Entregue") l = l.slice(-8).reverse();
    const cards = l.length ? l.map((o) => `<button class="kcard" data-a="os-abrir" data-id="${esc(o.id)}"><b>#${o.numero} · ${esc(nomeDe("clientes", o.clienteId) || "Sem cliente")}</b>
        <span>${esc(cfg.resumo.map((k) => o[k]).filter(Boolean).join(" · ") || cfg.item)}</span><span class="dim">${esc((o.defeito || "").slice(0, 70))}</span><span class="tot">${brl(totalOS(o))}</span></button>`).join("") : `<p class="vazio">—</p>`;
    return `<div class="kcol st-${STATUS_OS.indexOf(st)}"><h3>${st} <span>${S.cols.os.filter((o) => o.status === st).length}</span></h3>${cards}</div>`;
  };
  return cab("Ordens de serviço", `<button class="btn pri" data-a="os-nova">+ Nova OS</button>`) + `<div class="kanban">${STATUS_OS.map(coluna).join("")}</div>`;
}
export function mOS(o) {
  const cfg = R().os, novo = !o.id;
  const corpo = `<div class="g2"><label class="fld"><span>Cliente</span><select id="f_clienteId" name="clienteId"><option value="">—</option>${S.cols.clientes.slice().sort((a, b) => norm(a.nome).localeCompare(norm(b.nome))).map((c) => opcao([c.id, c.nome], o.clienteId)).join("")}</select></label>
    <label class="fld"><span>Situação</span><select id="f_status" name="status">${STATUS_OS.map((s) => opcao(s, o.status || "Aberta")).join("")}</select></label></div>
    <div class="g2">${cfg.campos.map((c) => campoHTML(c, o[c.k])).join("")}</div>
    ${campoHTML({ k: "defeito", l: "Problema relatado", t: "area" }, o.defeito)}
    <h4>Peças e serviços</h4>${seletorCat()}<div id="itens-box">${itensHTML(S.m.itens)}</div>${avulso()}
    ${campoHTML({ k: "obs", l: "Observações internas", t: "area" }, o.obs)}`;
  const rod = (novo ? "" : `<button class="btn dan" data-a="os-excluir" data-id="${esc(o.id)}">Excluir</button><button class="btn" data-a="os-zap">Avisar no WhatsApp</button>`)
    + `<span class="grow"></span><button class="btn" data-a="fechar">Cancelar</button><button class="btn" data-a="os-salvar">Salvar</button>`
    + (o.status === "Entregue" ? "" : `<button class="btn pri" data-a="os-entregar">Entregar e receber</button>`);
  return modal((novo ? "Nova OS" : "OS #" + o.numero) + " · " + cfg.item, corpo, rod, "lg");
}

// ---------- agenda ----------
export function opcoesPets(clienteId, sel) {
  const l = S.cols.pets.filter((p) => !clienteId || p.clienteId === clienteId);
  return `<option value="">—</option>` + l.map((p) => opcao([p.id, p.nome + (p.raca ? " (" + p.raca + ")" : "")], sel)).join("");
}

// ---------- agenda ----------
const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const ativo = (a) => a.status !== "Cancelado" && a.status !== "Faltou";

function faixaDias(dia) {
  const ini = S.agIni || hojeStr(), hoje = hojeStr();
  let h = "";
  for (let i = 0; i < 10; i++) {
    const d = addDias(ini, i), n = S.cols.agenda.filter((a) => a.data === d && ativo(a)).length, dt = new Date(d + "T00:00:00");
    h += `<button class="day${d === dia ? " on" : ""}${d === hoje ? " hoje" : ""}" data-a="ag-ir" data-d="${d}"><small>${d === hoje ? "hoje" : SEMANA[dt.getDay()]}</small><b>${dt.getDate()}</b><small>${n ? n + (n === 1 ? " horário" : " horários") : "livre"}</small></button>`;
  }
  return `<div class="dias"><button class="btn sm" data-a="ag-faixa" data-n="-7" aria-label="Semana anterior">‹</button><div class="faixa">${h}</div><button class="btn sm" data-a="ag-faixa" data-n="7" aria-label="Próxima semana">›</button></div>`;
}
function filtroProf() {
  const profs = S.cols.profissionais;
  if (profs.length < 2) return "";
  const chip = (id, t) => `<button class="chip${S.agProf === id ? " on" : ""}" data-a="ag-prof" data-p="${esc(id)}">${esc(t)}</button>`;
  return `<div class="chips">${chip("todos", "Todos")}${profs.slice().sort((a, b) => norm(a.nome).localeCompare(norm(b.nome))).map((p) => chip(p.id, p.nome)).join("")}</div>`;
}
function acoesAg(a) {
  const id = esc(a.id), b = (cls, ac, t, extra) => `<button class="btn sm ${cls}" data-a="${ac}" data-id="${id}"${extra || ""}>${t}</button>`;
  const c = achar("clientes", a.clienteId), sv = achar("servicos", a.servicoId);
  const zap = c && c.telefone ? `<a class="btn sm wa" target="_blank" rel="noopener" href="${waLink(c.telefone, `Olá, ${c.nome}! Confirmando seu horário${sv ? " de " + sv.nome : ""} em ${fmtData(a.data)} às ${a.hora}. Podemos confirmar? — ${S.empresa.nome}`)}">WhatsApp</a>` : "";
  if (a.status === "Agendado") return zap + b("", "ag-st", "Confirmou", ' data-st="Confirmado"') + b("", "ag-st", "Cancelou", ' data-st="Cancelado"');
  if (a.status === "Confirmado") return b("pri", "ag-receber", "Atendido · receber") + b("", "ag-st", "Faltou", ' data-st="Faltou"') + b("", "ag-st", "Cancelou", ' data-st="Cancelado"');
  if (a.status === "Cancelado" || a.status === "Faltou") return b("", "ag-abrir", "Remarcar") + b("", "ag-liberar", "Liberar vaga");
  return a.vendaId ? `<span class="dim">Recebido</span>` : a.pacoteId ? `<span class="dim">Sessão do pacote</span>` : "";
}
function listaAg(itens) {
  return itens.map((a) => {
    const sv = achar("servicos", a.servicoId), pet = nomeDe("pets", a.petId);
    return `<div class="ag st-${esc(norm(a.status))}"><span class="hora">${esc(a.hora || "--:--")}</span>
      <button class="ag-c" data-a="ag-abrir" data-id="${esc(a.id)}"><b>${esc(nomeDe("clientes", a.clienteId) || "Sem cliente")}${pet ? " · " + esc(pet) : ""}</b><span>${esc(sv ? sv.nome + " · " + brl(num(sv.preco)) : "Sem serviço")}${a.profissional ? " · " + esc(a.profissional) : ""}</span></button>
      <div class="ag-acts"><span class="pill st-${esc(norm(a.status))}">${esc(a.status)}</span>${acoesAg(a)}</div></div>`;
  }).join("");
}
function gradeAg(itens, dia) {
  let cols = S.cols.profissionais.slice().sort((a, b) => norm(a.nome).localeCompare(norm(b.nome)));
  if (S.agProf !== "todos") cols = cols.filter((p) => p.id === S.agProf);
  const semProf = itens.some((a) => !a.profissionalId || !cols.some((p) => p.id === a.profissionalId));
  const colunas = cols.map((p) => ({ id: p.id, nome: p.nome })).concat(semProf || !cols.length ? [{ id: "", nome: cols.length ? "Sem profissional" : "Agenda" }] : []);
  const dur = (a) => num((achar("servicos", a.servicoId) || {}).duracao) || 30;
  let ini = 8 * 60, fim = 19 * 60;
  itens.forEach((a) => { const m = horaMin(a.hora); if (m >= 0) { ini = Math.min(ini, Math.floor(m / 60) * 60); fim = Math.max(fim, Math.ceil((m + dur(a)) / 60) * 60); } });
  const linhas = Math.round((fim - ini) / 30);
  let h = `<div class="gh"></div>` + colunas.map((c, i) => `<div class="gh" style="grid-column:${i + 2}">${esc(c.nome)}</div>`).join("");
  for (let r = 0; r < linhas; r++) {
    const m = ini + r * 30;
    h += `<div class="gt${m % 60 ? " meia" : ""}" style="grid-row:${r + 2}">${minHora(m)}</div>`;
    colunas.forEach((c, i) => { h += `<button class="gc${m % 60 ? " meia" : ""}" style="grid-row:${r + 2};grid-column:${i + 2}" data-a="ag-novo-em" data-h="${minHora(m)}" data-p="${esc(c.id)}" aria-label="Agendar ${minHora(m)}"></button>`; });
  }
  itens.forEach((a) => {
    const m = horaMin(a.hora); if (m < 0) return;
    let ci = colunas.findIndex((c) => c.id && c.id === a.profissionalId); if (ci < 0) ci = colunas.findIndex((c) => !c.id); if (ci < 0) return;
    const r = Math.floor((m - ini) / 30) + 2, span = Math.max(1, Math.ceil(dur(a) / 30)), sv = achar("servicos", a.servicoId);
    h += `<button class="gev st-${esc(norm(a.status))}" style="grid-row:${r} / span ${span};grid-column:${ci + 2}" data-a="ag-abrir" data-id="${esc(a.id)}"><b>${esc(a.hora)} ${esc(nomeDe("clientes", a.clienteId) || "Sem cliente")}</b><small>${esc(sv ? sv.nome : "")}</small></button>`;
  });
  return `<div class="gradeag" style="--n:${colunas.length};--l:${linhas}">${h}</div>`;
}
export function vAgenda() {
  const dia = S.dia || hojeStr();
  if (S.agProf !== "todos" && !S.cols.profissionais.some((p) => p.id === S.agProf)) S.agProf = "todos";
  const itens = S.cols.agenda.filter((a) => a.data === dia && (S.agProf === "todos" || a.profissionalId === S.agProf)).sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));
  const livres = itens.filter((a) => !ativo(a)).length, marcados = itens.length - livres;
  const modo = (id, t) => `<button class="chip${S.agView === id ? " on" : ""}" data-a="ag-modo" data-m="${id}">${t}</button>`;
  const corpo = S.agView === "grade" ? gradeAg(itens, dia)
    : itens.length ? `<div class="aglist">${listaAg(itens)}</div>` : vazio("Nenhum agendamento neste dia.", `<button class="btn pri" data-a="ag-novo">+ Agendar</button>`);
  return cab("Agenda", `<div class="chips">${modo("lista", "Lista")}${modo("grade", "Grade")}</div><button class="btn pri" data-a="ag-novo">+ Agendar</button>`)
    + faixaDias(dia) + `<div class="agbar"><div><b>${fmtData(dia)}</b><span class="dim"> · ${diaSemana(dia)}${dia === hojeStr() ? " (hoje)" : ""} · ${marcados} ${marcados === 1 ? "horário" : "horários"}${livres ? ` · ${livres} ${livres === 1 ? "vaga liberada" : "vagas liberadas"}` : ""}</span></div>${filtroProf()}</div>` + corpo;
}
export function mAgenda(a) {
  const novo = !a.id, pets = tem("pets"), profs = S.cols.profissionais;
  const profCampo = profs.length
    ? `<label class="fld"><span>Profissional</span><select id="f_profissionalId" name="profissionalId"><option value="">—</option>${profs.map((p) => opcao([p.id, p.nome], a.profissionalId)).join("")}</select></label>`
    : campoHTML({ k: "profissional", l: "Profissional" }, a.profissional);
  const corpo = `<div class="g2">${campoHTML({ k: "data", l: "Dia", t: "date", req: true }, a.data)}${campoHTML({ k: "hora", l: "Horário", t: "time", req: true }, a.hora)}</div>
    <label class="fld"><span>${esc(rot("clientes", false))}</span><select id="f_clienteId" name="clienteId" data-ch="ag-cliente"><option value="">—</option>${S.cols.clientes.slice().sort((x, y) => norm(x.nome).localeCompare(norm(y.nome))).map((c) => opcao([c.id, c.nome], a.clienteId)).join("")}</select></label>
    ${pets ? `<label class="fld"><span>Pet</span><select id="f_petId" name="petId">${opcoesPets(a.clienteId, a.petId)}</select></label>` : ""}
    <label class="fld"><span>${esc(rot("servicos", false))}</span><select id="f_servicoId" name="servicoId"><option value="">—</option>${S.cols.servicos.map((s) => opcao([s.id, s.nome + " · " + brl(num(s.preco))], a.servicoId)).join("")}</select></label>
    <div class="g2">${profCampo}<label class="fld"><span>Situação</span><select id="f_status" name="status">${STATUS_AG.map((s) => opcao(s, a.status || "Agendado")).join("")}</select></label></div>
    ${campoHTML({ k: "obs", l: "Observações", t: "area" }, a.obs)}`;
  const fim = a.status === "Concluído" || a.status === "Cancelado";
  const rod = (novo ? "" : `<button class="btn dan" data-a="ag-excluir" data-id="${esc(a.id)}">Excluir</button><button class="btn" data-a="ag-zap">Avisar no WhatsApp</button>`)
    + `<span class="grow"></span><button class="btn" data-a="fechar">Cancelar</button><button class="btn" data-a="ag-salvar">Salvar</button>` + (fim ? "" : `<button class="btn pri" data-a="ag-concluir">Concluir e receber</button>`);
  return modal(novo ? "Novo agendamento" : "Agendamento", corpo, rod);
}

// ---------- pacotes de sessões ----------
export function vPacotes() {
  const l = S.cols.pacotes.slice().sort((a, b) => ((Number(a.usadas) || 0) >= (Number(a.sessoes) || 0)) - ((Number(b.usadas) || 0) >= (Number(b.sessoes) || 0)) || norm(nomeDe("clientes", a.clienteId)).localeCompare(norm(nomeDe("clientes", b.clienteId))));
  const topo = cab("Pacotes de sessões", `<button class="btn pri" data-a="novo" data-col="pacotes">+ Novo pacote</button>`);
  if (!l.length) return topo + vazio("Venda pacotes (ex.: 10 sessões de drenagem) e acompanhe quantas faltam.", `<button class="btn pri" data-a="novo" data-col="pacotes">Criar o primeiro pacote</button>`);
  const cards = l.map((p) => {
    const tot = Number(p.sessoes) || 0, us = Number(p.usadas) || 0, falta = Math.max(0, tot - us), pct = tot ? Math.min(100, Math.round(us / tot * 100)) : 0, ok = p.pago === "Sim";
    return `<div class="pac${falta ? "" : " fim"}"><div class="pac-t"><b>${esc(nomeDe("clientes", p.clienteId) || "Sem cliente")}</b><span class="pill ${ok ? "" : "warn"}">${ok ? "Pago" : "A receber"}</span></div>
      <div class="dim">${esc(nomeDe("servicos", p.servicoId) || "Serviço")} · ${brl(num(p.valor))}</div>
      <div class="barra" role="img" aria-label="${us} de ${tot} sessões usadas"><i style="width:${pct}%"></i></div>
      <div class="pac-n"><b>${us}</b> de ${tot} usadas · ${falta ? `faltam <b>${falta}</b>` : "concluído"}</div>
      <div class="row">${falta ? `<button class="btn sm pri" data-a="pac-usar" data-id="${esc(p.id)}">Usar 1 sessão</button>` : ""}${ok ? "" : `<button class="btn sm" data-a="pac-receber" data-id="${esc(p.id)}">Receber</button>`}<button class="btn sm" data-a="editar" data-col="pacotes" data-id="${esc(p.id)}">Editar</button></div></div>`;
  }).join("");
  return topo + `<div class="pacs">${cards}</div>`;
}

// ---------- retornos e aniversários ----------
export function vRetornos() {
  const hoje = hojeStr(), dias = S.retDias || 45, emp = S.empresa.nome;
  const aniv = aniversariantes(S.cols.clientes, hoje.slice(5, 7)), hd = Number(hoje.slice(8, 10));
  const zap = (c, msg, t) => (c.telefone ? `<a class="btn sm wa" target="_blank" rel="noopener" href="${waLink(c.telefone, msg)}">${t}</a>` : `<span class="dim">sem WhatsApp</span>`);
  const nome1 = (c) => String(c.nome || "").split(" ")[0];
  const aLinhas = aniv.length ? aniv.map((x) => `<div class="li${x.dia === hd ? " destaque" : ""}"><span><b>${String(x.dia).padStart(2, "0")}/${hoje.slice(5, 7)}</b> · ${esc(x.cliente.nome)}${x.dia === hd ? ` <span class="pill">hoje 🎉</span>` : ""}</span>${zap(x.cliente, `Parabéns, ${nome1(x.cliente)}! 🎉 Toda a equipe do ${emp} deseja um dia lindo, cheio de alegria. Um beijo!`, "Parabenizar")}</div>`).join("")
    : `<p class="vazio">Nenhum aniversariante neste mês. Cadastre o aniversário no cadastro do cliente.</p>`;
  const sv = semVoltar(S.cols.clientes, S.cols.vendas, S.cols.agenda, dias, hoje);
  const chip = (n) => `<button class="chip${dias === n ? " on" : ""}" data-a="ret-dias" data-n="${n}">${n} dias</button>`;
  const sLinhas = sv.length ? sv.map((x) => `<div class="li"><span><b>${esc(x.cliente.nome)}</b><br><small>Última visita ${fmtData(x.ult)} · há ${x.atraso} dias</small></span><span class="row">${zap(x.cliente, `Olá, ${nome1(x.cliente)}! Aqui é do ${emp}. Faz um tempinho que não te vemos por aqui 💜 Vamos marcar um horário?`, "Chamar")}<button class="btn sm" data-a="ag-novo-cli" data-id="${esc(x.cliente.id)}">Agendar</button></span></div>`).join("")
    : `<p class="vazio">Ninguém sumiu há mais de ${dias} dias. Os clientes aparecem aqui depois do primeiro atendimento ou venda.</p>`;
  return cab("Retornos e aniversários") + `<div class="cols2"><div class="panel"><h3>Aniversariantes do mês</h3>${aLinhas}</div>
    <div class="panel"><div class="ph"><h3>Sem voltar há mais de…</h3><div class="chips">${chip(30)}${chip(45)}${chip(60)}${chip(90)}</div></div>${sLinhas}</div></div>`;
}

// ---------- comissões ----------
export function vComissoes() {
  const [de, ate] = periodoCaixa(S.caixa), l = comissoes(S.cols.vendas, S.cols.profissionais, de, ate);
  const chip = (id, t) => `<button class="chip${S.caixa === id ? " on" : ""}" data-a="caixa-per" data-p="${id}">${t}</button>`;
  const topo = cab("Comissões", `<div class="chips">${chip("hoje", "Hoje")}${chip("semana", "7 dias")}${chip("mes", "Este mês")}</div>`);
  if (!S.cols.profissionais.length) return topo + vazio("Cadastre a equipe e a porcentagem de comissão de cada um.", `<button class="btn pri" data-a="ir" data-rota="profissionais">Cadastrar profissionais</button>`);
  const totServ = r2(l.reduce((a, x) => a + x.servicos, 0)), totCom = r2(l.reduce((a, x) => a + x.comissao, 0));
  const linhas = l.slice().sort((a, b) => b.servicos - a.servicos).map((x) => `<tr><td data-l="Profissional"><b>${esc(x.prof.nome)}</b></td><td data-l="Atendimentos">${x.atend}</td><td data-l="Serviços">${brl(x.servicos)}</td><td data-l="Comissão">${num(x.prof.comissao)}%</td><td data-l="A pagar"><b>${brl(x.comissao)}</b></td></tr>`).join("");
  return topo + `<div class="stats">${stat("Serviços com profissional", brl(totServ), "no período")}${stat("Comissões a pagar", brl(totCom))}</div>
    <div class="tbl"><table><thead><tr><th>Profissional</th><th>Atendimentos</th><th>Serviços</th><th>Comissão</th><th>A pagar</th></tr></thead><tbody>${linhas}</tbody></table></div>
    <p class="hint">A comissão vem dos atendimentos da agenda concluídos e recebidos, calculada só sobre os serviços (produtos não entram).</p>`;
}

// ---------- comandas (restaurante) ----------
export function totalComanda(c) { const t = totalItens(c.itens); return c.taxa ? r2(t * 1.1) : t; }
export function vComandas() {
  const ab = S.cols.comandas.filter((c) => c.status === "Aberta").sort((a, b) => (a.numero || 0) - (b.numero || 0));
  const cards = ab.length ? ab.map((c) => `<button class="cmd" data-a="cm-abrir" data-id="${esc(c.id)}"><b>${esc(c.nome)}</b><span>${(c.itens || []).reduce((a, i) => a + (Number(i.qtd) || 0), 0)} itens · desde ${fmtHora(c.abertaEm)}</span><span class="tot">${brl(totalComanda(c))}</span></button>`).join("")
    : vazio("Nenhuma comanda aberta.", `<button class="btn pri" data-a="cm-nova">+ Nova comanda</button>`);
  return cab("Comandas", `<button class="btn pri" data-a="cm-nova">+ Nova comanda</button>`) + `<div class="cmds">${cards}</div>`;
}
export function resumoComanda(itens, taxa) {
  const t = totalItens(itens), tx = taxa ? r2(t * 0.1) : 0;
  return `<div class="li"><span>Itens</span><span>${brl(t)}</span></div>${taxa ? `<div class="li"><span>Taxa de serviço (10%)</span><span>${brl(tx)}</span></div>` : ""}<div class="total"><span>Total</span><b>${brl(r2(t + tx))}</b></div>`;
}
export function mComanda(c) {
  const grade = S.cols.produtos.slice().sort((a, b) => norm(a.nome).localeCompare(norm(b.nome))).map((p) => botaoCat({ tipo: "produto", refId: p.id, nome: p.nome, preco: num(p.preco), cat: p.categoria || "", est: null }, "it-rapido")).join("") || `<p class="vazio">Cadastre o cardápio primeiro.</p>`;
  const corpo = `${campoHTML({ k: "nome", l: "Mesa ou nome do cliente", req: true }, c.nome)}
    <h4>Cardápio</h4><input type="search" class="busca full" placeholder="Buscar no cardápio…" data-busca-cat="1"><div class="grade peq">${grade}</div>
    <h4>Itens da comanda</h4><div id="itens-box">${itensHTML(S.m.itens)}</div>
    <label class="check"><input type="checkbox" id="f_taxa" data-ch="cm-taxa"${S.m.taxa ? " checked" : ""}> Cobrar taxa de serviço (10%)</label>
    <div id="cm-resumo">${resumoComanda(S.m.itens, S.m.taxa)}</div>`;
  const rod = (c.id ? `<button class="btn dan" data-a="cm-cancelar" data-id="${esc(c.id)}">Cancelar comanda</button>` : "")
    + `<span class="grow"></span><button class="btn" data-a="fechar">Fechar tela</button><button class="btn" data-a="cm-salvar">Salvar</button><button class="btn pri" data-a="cm-fechar">Fechar e receber</button>`;
  return modal(c.id ? "Comanda #" + c.numero : "Nova comanda", corpo, rod, "lg");
}

// ---------- pagamento ----------
export function mPagamento(titulo, total) {
  return modal(titulo, `<div class="total big"><span>Total a receber</span><b>${brl(total)}</b></div>
    <label class="fld"><span>Forma de pagamento</span><select id="f_pag">${PAGAMENTOS.map((x) => opcao(x, "Dinheiro")).join("")}</select></label>`,
    `<span class="grow"></span><button class="btn" data-a="fechar">Voltar</button><button class="btn pri" data-a="pagar-ok">Confirmar recebimento</button>`);
}

// ---------- minha conta ----------
export function vConta() {
  const e = S.empresa, sit = situacaoAssinatura(e.assinatura);
  const ramos = Object.keys(RAMOS).map((id) => `<option value="${id}"${id === S.ramo ? " selected" : ""}>${RAMOS[id].ico} ${RAMOS[id].nome}</option>`).join("");
  const venc = e.assinatura && e.assinatura.venceEm ? fmtData(e.assinatura.venceEm.slice(0, 10)) : "–";
  const exemplosN = Object.keys(S.cols).reduce((a, c) => a + S.cols[c].filter((x) => x.exemplo).length, 0);
  return cab("Minha conta") + `<div class="cols2"><div class="panel"><h3>Dados do negócio</h3>
    <label class="fld"><span>Nome do negócio</span><input id="c_nome" value="${esc(e.nome)}"></label>
    <label class="fld"><span>Ramo</span><select id="c_ramo">${ramos}</select></label>
    <p class="hint">Mudar o ramo troca as telas e os nomes do menu. Seus cadastros e vendas continuam guardados.</p>
    <div class="row"><button class="btn pri" data-a="conta-salvar">Salvar</button></div></div>
    <div class="panel"><h3>Assinatura</h3><div class="li"><span>Situação</span><b class="${sit.ok ? "pos" : "neg"}">${esc(sit.txt)}</b></div>
    ${S.dados.modo === "nuvem" ? `<div class="li"><span>Vence em</span><b>${venc}</b></div>` : `<p class="hint">Modo demonstração: os dados ficam só neste navegador e somem ao sair.</p>`}
    <h3 style="margin-top:18px">Dados</h3>
    <div class="row wrap"><button class="btn" data-a="exemplos-carregar">Carregar exemplos</button>${exemplosN ? `<button class="btn" data-a="exemplos-apagar">Apagar exemplos (${exemplosN})</button>` : ""}<button class="btn" data-a="exportar">Baixar cópia dos dados</button></div>
    <div class="row" style="margin-top:18px"><button class="btn dan" data-a="sair">Sair</button></div></div></div>`;
}

// ---------- painel do dono do sistema ----------
export function vAdmin() {
  const l = S.assinantes;
  if (!l) return cab("Assinantes") + vazio("Carregando…");
  const linhas = l.slice().sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || "")).map((x) => {
    const sit = situacaoAssinatura(x.assinatura);
    return `<tr><td data-l="Negócio"><b>${esc(x.nome)}</b><br><small>${esc(x.email || "")}</small></td><td data-l="Ramo">${esc((RAMOS[x.ramo] || {}).nome || x.ramo || "–")}</td>
      <td data-l="Situação"><span class="${sit.ok ? "pos" : "neg"}">${esc(sit.txt)}</span></td><td data-l="Vence em">${x.assinatura.venceEm ? fmtData(x.assinatura.venceEm.slice(0, 10)) : "–"}</td>
      <td class="acoes"><button class="btn sm pri" data-a="adm-mais" data-id="${esc(x.id)}">+30 dias</button>${x.assinatura.status === "bloqueada" ? `<button class="btn sm" data-a="adm-ativar" data-id="${esc(x.id)}">Reativar</button>` : `<button class="btn sm dan" data-a="adm-bloq" data-id="${esc(x.id)}">Bloquear</button>`}</td></tr>`;
  }).join("");
  return cab("Assinantes", `<button class="btn" data-a="adm-recarregar">Atualizar</button>`) + (l.length
    ? `<div class="tbl"><table><thead><tr><th>Negócio</th><th>Ramo</th><th>Situação</th><th>Vence em</th><th></th></tr></thead><tbody>${linhas}</tbody></table></div><p class="hint">+30 dias soma 30 dias a partir do vencimento (ou de hoje, se já venceu) e marca como ativa.</p>`
    : vazio("Nenhum assinante ainda."));
}

export function menuHTML() {
  const ids = R().menu.concat(["conta"], S.ehAdmin ? ["admin"] : []);
  return ids.map((id) => { const m = itemMenu(S.ramo, id); return `<button class="nav${S.rota === id ? " on" : ""}" data-a="ir" data-rota="${id}"><span class="ico">${m.ico}</span>${esc(m.nome)}</button>`; }).join("");
}

export function telaAtual() {
  const r = S.rota;
  if (r === "painel") return vPainel();
  if (r === "vendas") return vVender();
  if (r === "caixa") return vCaixa();
  if (r === "os") return vOS();
  if (r === "agenda") return vAgenda();
  if (r === "pacotes") return vPacotes();
  if (r === "retornos") return vRetornos();
  if (r === "comissoes") return vComissoes();
  if (r === "comandas") return vComandas();
  if (r === "conta") return vConta();
  if (r === "admin") return vAdmin();
  if (ENT[r]) return vLista(r);
  return vPainel();
}
