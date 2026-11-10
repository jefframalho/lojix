// Entrada do sistema: login, escolha do ramo, assinatura e os cliques de todas as telas.
import { S, COLS } from "./state.js";
import { esc, brl, r2, num, hojeStr, addDias, fmtData, waLink, norm } from "./util.js";
import { totalItens, totalVenda, numeroProximo, addItem, ajustesEstoque, situacaoAssinatura, pacoteAtivo, conflito } from "./calc.js";
import { RAMOS, RAMO_IDS, ENT, exemplos, rotulo, camposDe } from "./ramos.js";
import { criarLocal, criarNuvem } from "./data.js";
import { firebaseConfig, configurado, PRODUTO } from "./config.js";
import * as V from "./views.js";

const $ = (s, r = document) => r.querySelector(s);
const local = criarLocal();
let nuvem = null, unsubs = [], relogio = null;
const achar = (col, id) => (S.cols[col] || []).find((o) => o.id === id);

// ---------- utilidades de tela ----------
function toast(t) {
  const el = $("#toast"); el.textContent = t; el.classList.add("on");
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 2800);
}
function abrirModal(html) { $("#modal").innerHTML = html; document.body.classList.add("trava"); }
function fecharModal() { $("#modal").innerHTML = ""; document.body.classList.remove("trava"); S.m = null; S.pag = null; }

// Roda uma operação de dados e avisa se falhar (por exemplo, assinatura vencida bloqueia a gravação)
async function seguro(fn, erro) {
  try { return await fn(); } catch (e) {
    console.error(e);
    toast(e && e.code === "permission-denied" ? "Sem permissão para gravar. A assinatura pode ter vencido." : erro || "Não foi possível concluir. Tente de novo.");
    return null;
  }
}

function render() {
  if (!$("#view")) return;
  $("#nav").innerHTML = V.menuHTML();
  $("#view").innerHTML = V.telaAtual();
  $("#emp").textContent = S.empresa.nome;
  const r = RAMOS[S.ramo];
  document.documentElement.style.setProperty("--brand", r.cor || "#4338CA");
  $("#ramo").textContent = r.ico + " " + r.nome;
  document.title = S.empresa.nome + " · " + PRODUTO.nome;
}
// Dados novos chegam o tempo todo; não redesenha a tela enquanto a pessoa digita nela
function pedirRender() {
  const a = document.activeElement;
  if (a && a.closest && a.closest("#view") && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
  render();
}

// ---------- login e cadastro ----------
function msgAuth(t, ok) { const m = $("#a_msg"); if (m) { m.textContent = t || ""; m.className = "msg" + (ok ? " ok" : ""); } }
function erroAuth(e) {
  const c = (e && e.code) || "";
  if (/invalid-credential|wrong-password|user-not-found/.test(c)) return "E-mail ou senha incorretos.";
  if (c === "auth/email-already-in-use") return "Este e-mail já tem cadastro. Use a aba Entrar.";
  if (c === "auth/weak-password") return "A senha precisa ter pelo menos 6 caracteres.";
  if (c === "auth/invalid-email") return "E-mail inválido.";
  if (c === "auth/network-request-failed") return "Sem conexão com a internet.";
  if (c === "auth/too-many-requests") return "Muitas tentativas. Espere um pouco e tente de novo.";
  return "Não foi possível entrar agora. Tente de novo.";
}
function telaLogin(tab) {
  tab = tab || "entrar";
  const lista = RAMO_IDS.map((id) => `<span class="tag">${RAMOS[id].ico} ${RAMOS[id].nome}</span>`).join("");
  const form = nuvem
    ? `<div class="tabs2"><button class="${tab === "entrar" ? "on" : ""}" data-a="auth-tab" data-tab="entrar">Entrar</button><button class="${tab === "cadastrar" ? "on" : ""}" data-a="auth-tab" data-tab="cadastrar">Criar conta</button></div>
       <label class="fld"><span>E-mail</span><input id="a_email" type="email" autocomplete="email"></label>
       <label class="fld"><span>Senha</span><input id="a_senha" type="password" autocomplete="${tab === "entrar" ? "current-password" : "new-password"}"></label>
       <p id="a_msg" class="msg" role="alert"></p>
       <button class="btn pri block" data-a="auth-ok" data-tab="${tab}">${tab === "entrar" ? "Entrar" : "Criar conta e testar " + PRODUTO.diasDeTeste + " dias grátis"}</button>
       ${tab === "entrar" ? `<button class="link" data-a="auth-esqueci">Esqueci a senha</button>` : ""}
       <div class="ou"><span>ou</span></div>`
    : `<p class="hint">O cadastro ainda não foi configurado neste endereço. Você pode testar o sistema em modo demonstração.</p>`;
  $("#root").innerHTML = `<div class="auth"><section class="hero"><div class="logo">${esc(PRODUTO.nome)}</div><h1>${esc(PRODUTO.slogan)}</h1>
    <p>Escolha o seu ramo e o sistema monta só as telas que você precisa: vendas, estoque, caixa e o que for próprio do seu negócio.</p><div class="tags">${lista}</div></section>
    <section class="authcard">${form}<button class="btn block" data-a="demo-abrir">Testar sem cadastro (demonstração)</button></section></div>`;
}

function telaOnboarding() {
  const demo = S.dados.modo === "demo";
  const cards = RAMO_IDS.map((id, n) => `<label class="ramo-card"><input type="radio" name="ramo" value="${id}"${n === 0 ? " checked" : ""}><span><b>${RAMOS[id].ico} ${RAMOS[id].nome}</b><small>${RAMOS[id].desc}</small></span></label>`).join("");
  $("#root").innerHTML = `<div class="onb"><div class="logo">${esc(PRODUTO.nome)}</div><h1>Qual é o seu ramo?</h1><p>Vamos montar as telas certas para o seu negócio. Você pode mudar depois em Minha conta.</p>
    <label class="fld"><span>Nome do seu negócio</span><input id="o_nome" placeholder="Ex.: Mecânica do João" autocomplete="organization"></label>
    <div class="ramo-grid">${cards}</div>
    <label class="check"><input type="checkbox" id="o_ex" checked> Começar com exemplos do ramo (dá para apagar com um toque depois)</label>
    <p id="a_msg" class="msg" role="alert"></p><div class="row"><button class="btn pri" data-a="onb-ok">${demo ? "Abrir demonstração" : "Começar meu teste de " + PRODUTO.diasDeTeste + " dias"}</button>${demo ? `<button class="btn" data-a="onb-voltar">Voltar</button>` : `<button class="btn" data-a="sair">Sair</button>`}</div></div>`;
}

async function entrarUsuario(u) {
  S.dados = nuvem; S.user = u;
  let emp = null;
  try { emp = await nuvem.empresa(); } catch (e) {
    console.error(e);
    $("#root").innerHTML = `<div class="onb"><div class="logo">${esc(PRODUTO.nome)}</div><h1>Não consegui abrir sua conta</h1><p>Pode ser a internet ou uma instabilidade. Tente de novo.</p><div class="row"><button class="btn pri" data-a="recarregar">Tentar de novo</button><button class="btn" data-a="sair">Sair</button></div></div>`;
    return;
  }
  if (!emp) telaOnboarding(); else iniciarApp(emp);
}

// ---------- aplicativo ----------
async function iniciarApp(emp) {
  desligar();
  S.empresa = emp; S.ramo = RAMOS[emp.ramo] ? emp.ramo : "loja"; S.rota = "painel"; S.dia = hojeStr(); S.agIni = S.dia; S.agProf = "todos"; S.agView = "lista"; S.assinantes = null;
  S.pdv = { itens: [], desc: "", pag: "Dinheiro", cliente: "" };
  S.ehAdmin = await S.dados.admin.ehAdmin();
  $("#root").innerHTML = `<div class="app"><aside class="side" id="side"><div class="side-top"><div class="logo">${esc(PRODUTO.nome)}</div><b id="emp"></b><span id="ramo" class="dim"></span></div><nav id="nav"></nav></aside>
    <div class="main"><header class="bar"><button class="burger" data-a="menu" aria-label="Abrir menu">☰</button><b>${esc(PRODUTO.nome)}</b></header><div id="aviso"></div><main id="view"></main></div></div><div id="lock" hidden></div>`;
  COLS.forEach((c) => unsubs.push(S.dados.watch(c, (l) => { S.cols[c] = l; pedirRender(); })));
  render(); aplicarAssinatura();
  clearInterval(relogio);
  relogio = setInterval(() => { if (S.empresa && S.dados) { S.empresa.ativa = S.dados.modo === "demo" || situacaoAssinatura(S.empresa.assinatura).ok; aplicarAssinatura(); } }, 60000);
}
function desligar() { unsubs.forEach((f) => { try { f(); } catch (e) { /* já desligado */ } }); unsubs = []; COLS.forEach((c) => { S.cols[c] = []; }); }

function aplicarAssinatura() {
  const sit = situacaoAssinatura(S.empresa.assinatura), lock = $("#lock"), aviso = $("#aviso");
  if (!lock) return;
  const zap = PRODUTO.suporteWhatsapp ? `<a class="btn pri" target="_blank" rel="noopener" href="${waLink(PRODUTO.suporteWhatsapp, "Olá! Quero ativar a assinatura do " + PRODUTO.nome + " para " + S.empresa.nome + (S.empresa.email ? " (" + S.empresa.email + ")" : "") + ".")}">Falar no WhatsApp</a>` : "";
  if (S.dados.modo === "nuvem" && !S.empresa.ativa) {
    lock.hidden = false;
    lock.innerHTML = `<div class="lockbox"><div class="logo">${esc(PRODUTO.nome)}</div><h1>${sit.txt === "Bloqueada" ? "Acesso bloqueado" : "Assinatura vencida"}</h1><p>Seus dados continuam guardados. Para voltar a usar o sistema, ative ou renove a assinatura.</p><div class="row wrap">${zap}<button class="btn" data-a="recarregar">Já renovei, atualizar</button><button class="btn" data-a="sair">Sair</button></div></div>`;
  } else lock.hidden = true;
  if (S.dados.modo === "demo") aviso.innerHTML = `<div class="aviso">Modo demonstração: os dados ficam só neste navegador e somem ao sair.</div>`;
  else if (sit.ok && sit.dias <= 3) aviso.innerHTML = `<div class="aviso">${esc(sit.txt)}. ${zap ? "Fale com a gente para continuar sem interrupção." : ""}</div>`;
  else aviso.innerHTML = "";
}

// ---------- vendas ----------
async function finalizarVenda({ itens, desc, pag, clienteId, origem, origemId, profissionalId }) {
  const lista = itens.map((i) => ({ ...i }));
  const v = { numero: numeroProximo(S.cols.vendas), dia: hojeStr(), em: new Date().toISOString(), itens: lista, desconto: r2(desc), total: totalVenda(lista, desc), pagamento: pag, clienteId: clienteId || "", profissionalId: profissionalId || "", origem, origemId: origemId || "", cancelada: false };
  const salvo = await S.dados.salvar("vendas", v);
  for (const a of ajustesEstoque(S.cols.produtos, lista, -1)) await S.dados.incrementar("produtos", a.id, "estoque", a.delta);
  return salvo;
}

// ---------- formulários ----------
function lerCampos(campos) {
  const out = {};
  for (const c of campos) {
    const el = $("#f_" + c.k); if (!el) continue;
    const bruto = el.value.trim();
    if (c.req && !bruto) { toast("Preencha: " + c.l.replace(" *", "")); el.focus(); return null; }
    out[c.k] = c.t === "money" || c.t === "num" ? num(bruto) : bruto;
  }
  return out;
}
const padraoNovo = (col) => (col === "produtos" ? { controle: "Não", estoque: 0, minimo: 0 } : col === "pacotes" ? { usadas: 0, pago: "Não" } : {});
const tituloForm = (col) => (col === "lancamentos" ? "lançamento" : rotulo(S.ramo, col, false).toLowerCase());
function abrirForm(col, obj) { abrirModal(V.mForm(col, obj, tituloForm(col))); }

// ---------- OS, agenda e comanda: leitura dos formulários ----------
function lerOS() {
  const cfg = RAMOS[S.ramo].os, g = (k) => { const el = $("#f_" + k); return el ? el.value.trim() : ""; };
  const base = S.m.id ? achar("os", S.m.id) || {} : {};
  const o = { ...base, clienteId: g("clienteId"), status: g("status") || "Aberta", defeito: g("defeito"), obs: g("obs"), itens: S.m.itens.map((i) => ({ ...i })) };
  cfg.campos.forEach((c) => { o[c.k] = g(c.k); });
  if (!o.id) { o.numero = numeroProximo(S.cols.os); o.em = new Date().toISOString(); }
  return o;
}
function lerAgenda() {
  const g = (k) => { const el = $("#f_" + k); return el ? el.value.trim() : ""; };
  if (!g("data") || !g("hora")) { toast("Informe o dia e o horário."); return null; }
  const base = S.m.id ? achar("agenda", S.m.id) || {} : {};
  const pf = achar("profissionais", g("profissionalId"));
  return { ...base, data: g("data"), hora: g("hora"), clienteId: g("clienteId"), petId: g("petId"), servicoId: g("servicoId"), profissionalId: pf ? pf.id : "", profissional: pf ? pf.nome : g("profissional"), status: g("status") || "Agendado", obs: g("obs") };
}
function lerComanda() {
  const nome = ($("#f_nome").value || "").trim();
  if (!nome) { toast("Informe a mesa ou o nome."); return null; }
  const base = S.m.id ? achar("comandas", S.m.id) || {} : {};
  const c = { ...base, nome, itens: S.m.itens.map((i) => ({ ...i })), taxa: !!S.m.taxa, status: base.status || "Aberta" };
  if (!c.id) { c.numero = numeroProximo(S.cols.comandas); c.abertaEm = new Date().toISOString(); }
  return c;
}
function itensRender() {
  const b = $("#itens-box"); if (b) b.innerHTML = V.itensHTML(S.m.itens);
  const r = $("#cm-resumo"); if (r) r.innerHTML = V.resumoComanda(S.m.itens, S.m.taxa);
}
function itemDoCatalogo(t, r) { return V.catalogo().find((c) => c.tipo === t && c.refId === r); }
const cartRender = () => { const c = $("#pdv-cart"); if (c) c.innerHTML = V.pdvCart(); };
const nomeNeg = () => S.empresa.nome;
const nomeDe2 = (col, id) => { const x = achar(col, id); return x ? x.nome : ""; };

// Atendimento feito: usa uma sessão do pacote do cliente, se houver, ou abre o recebimento
async function receberAgenda(a) {
  const sv = achar("servicos", a.servicoId);
  if (!sv) { toast("Escolha o serviço para cobrar."); S.m = { tipo: "ag", id: a.id }; abrirModal(V.mAgenda(a)); return; }
  const pac = pacoteAtivo(S.cols.pacotes, a.clienteId, a.servicoId);
  if (pac && pac.pago === "Sim" && confirm("Essa cliente tem um pacote de " + sv.nome + " (" + (Number(pac.usadas) || 0) + " de " + pac.sessoes + " usadas).\n\nDescontar uma sessão do pacote, sem cobrar de novo?")) {
    const ok = await seguro(async () => {
      await S.dados.salvar("pacotes", { ...pac, usadas: (Number(pac.usadas) || 0) + 1 });
      await S.dados.salvar("agenda", { ...a, status: "Concluído", pacoteId: pac.id });
      return true;
    });
    if (ok) { fecharModal(); toast("Sessão descontada do pacote."); }
    return;
  }
  S.pag = { tipo: "ag", obj: a, sv }; abrirModal(V.mPagamento("Concluir e receber · " + sv.nome, num(sv.preco)));
}

// ---------- exemplos, cópia dos dados, assinantes ----------
async function carregarExemplos(silencioso) {
  const ex = exemplos(S.ramo);
  const ok = await seguro(async () => { for (const col of Object.keys(ex)) for (const o of ex[col]) await S.dados.salvar(col, o); return true; });
  if (ok && !silencioso) toast("Exemplos carregados.");
}
async function apagarExemplos() {
  await seguro(async () => { for (const col of COLS) for (const o of S.cols[col].filter((x) => x.exemplo)) await S.dados.apagar(col, o.id); });
  toast("Exemplos apagados.");
}
function baixarCopia() {
  const dados = { sistema: PRODUTO.nome, negocio: S.empresa.nome, ramo: S.ramo, exportadoEm: new Date().toISOString(), dados: S.cols };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" }));
  a.download = "copia-" + norm(S.empresa.nome).replace(/\W+/g, "-") + "-" + hojeStr() + ".json";
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
async function carregarAssinantes() {
  if (!S.ehAdmin) return;
  S.assinantes = await seguro(() => S.dados.admin.listar(), "Não consegui carregar os assinantes.");
  render();
}

// ---------- cliques ----------
const ACOES = {
  ir(el) { S.rota = el.dataset.rota; $("#side") && $("#side").classList.remove("aberto"); if (S.rota === "admin") carregarAssinantes(); render(); window.scrollTo(0, 0); },
  menu() { $("#side").classList.toggle("aberto"); },
  bg(el, e) { if (e.target === el) fecharModal(); },
  fechar() { fecharModal(); },
  recarregar() { location.reload(); },

  // cadastros
  novo(el) { abrirForm(el.dataset.col, padraoNovo(el.dataset.col)); },
  editar(el) { const o = achar(el.dataset.col, el.dataset.id); if (o) abrirForm(el.dataset.col, o); },
  async salvar(el) {
    const col = el.dataset.col, id = el.dataset.id, r = lerCampos(camposDe(S.ramo, col));
    if (!r) return;
    const obj = { ...(id ? achar(col, id) || {} : {}), ...r };
    if (id) obj.id = id;
    if (await seguro(() => S.dados.salvar(col, obj))) { fecharModal(); toast("Salvo."); }
  },
  async excluir(el) {
    if (!confirm("Excluir este registro? Isso não pode ser desfeito.")) return;
    if ((await seguro(() => S.dados.apagar(el.dataset.col, el.dataset.id))) !== null) { fecharModal(); toast("Excluído."); }
  },

  // vender
  "pdv-add"(el) {
    const x = itemDoCatalogo(el.dataset.t, el.dataset.r); if (!x) return;
    S.pdv.itens = addItem(S.pdv.itens, { tipo: x.tipo, refId: x.refId, nome: x.nome, preco: x.preco, qtd: 1 }); cartRender();
  },
  "pdv-mais"(el) { S.pdv.itens[+el.dataset.i].qtd++; cartRender(); },
  "pdv-menos"(el) { const i = +el.dataset.i; if (--S.pdv.itens[i].qtd <= 0) S.pdv.itens.splice(i, 1); cartRender(); },
  "pdv-del"(el) { S.pdv.itens.splice(+el.dataset.i, 1); cartRender(); },
  "pdv-limpar"() { S.pdv = { itens: [], desc: "", pag: S.pdv.pag, cliente: "" }; cartRender(); },
  async "pdv-finalizar"() {
    const p = S.pdv; if (!p.itens.length) { toast("Adicione itens à venda."); return; }
    const v = await seguro(() => finalizarVenda({ itens: p.itens, desc: num(p.desc), pag: p.pag, clienteId: p.cliente, origem: "pdv" }));
    if (v) { S.pdv = { itens: [], desc: "", pag: p.pag, cliente: "" }; toast("Venda #" + v.numero + " registrada: " + brl(v.total)); render(); }
  },
  async "venda-cancelar"(el) {
    const v = achar("vendas", el.dataset.id); if (!v || v.cancelada) return;
    if (!confirm("Cancelar a venda #" + v.numero + "? O estoque dos itens volta.")) return;
    await seguro(async () => {
      await S.dados.salvar("vendas", { ...v, cancelada: true });
      for (const a of ajustesEstoque(S.cols.produtos, v.itens, +1)) await S.dados.incrementar("produtos", a.id, "estoque", a.delta);
    });
  },

  // caixa
  "caixa-per"(el) { S.caixa = el.dataset.p; render(); },
  "lanc-novo"(el) { abrirForm("lancamentos", { tipo: el.dataset.tipo, data: hojeStr() }); },
  "lanc-editar"(el) { const o = achar("lancamentos", el.dataset.id); if (o) abrirForm("lancamentos", o); },

  // itens (OS e comanda)
  "it-mais"(el) { S.m.itens[+el.dataset.i].qtd++; itensRender(); },
  "it-menos"(el) { const i = +el.dataset.i; if (--S.m.itens[i].qtd <= 0) S.m.itens.splice(i, 1); itensRender(); },
  "it-del"(el) { S.m.itens.splice(+el.dataset.i, 1); itensRender(); },
  "it-rapido"(el) {
    const x = itemDoCatalogo(el.dataset.t, el.dataset.r); if (!x) return;
    S.m.itens = addItem(S.m.itens, { tipo: x.tipo, refId: x.refId, nome: x.nome, preco: x.preco, qtd: 1 }); itensRender();
  },
  "it-avulso"() {
    const n = $("#av_nome").value.trim(), p = num($("#av_preco").value);
    if (!n || p <= 0) { toast("Informe a descrição e o valor."); return; }
    S.m.itens.push({ tipo: "avulso", nome: n, qtd: 1, preco: p }); $("#av_nome").value = ""; $("#av_preco").value = ""; itensRender();
  },

  // ordens de serviço
  "os-nova"() { S.m = { tipo: "os", itens: [] }; abrirModal(V.mOS({ status: "Aberta" })); },
  "os-abrir"(el) { const o = achar("os", el.dataset.id); if (!o) return; S.m = { tipo: "os", id: o.id, itens: (o.itens || []).map((i) => ({ ...i })) }; abrirModal(V.mOS(o)); },
  async "os-salvar"() { if (await seguro(() => S.dados.salvar("os", lerOS()))) { fecharModal(); toast("OS salva."); } },
  async "os-excluir"(el) {
    if (!confirm("Excluir esta OS?")) return;
    if ((await seguro(() => S.dados.apagar("os", el.dataset.id))) !== null) { fecharModal(); toast("OS excluída."); }
  },
  "os-zap"() {
    const c = achar("clientes", $("#f_clienteId").value), o = S.m.id ? achar("os", S.m.id) || {} : {}, st = $("#f_status").value;
    if (!c || !c.telefone) { toast("Esse cliente não tem WhatsApp cadastrado."); return; }
    const txt = st === "Pronta"
      ? `Olá, ${c.nome}! ${RAMOS[S.ramo].os.pronta} OS #${o.numero}. Total: ${brl(totalItens(S.m.itens))}. — ${nomeNeg()}`
      : `Olá, ${c.nome}! Passando para avisar sobre a sua OS #${o.numero}: situação "${st}". — ${nomeNeg()}`;
    window.open(waLink(c.telefone, txt), "_blank", "noopener");
  },
  async "os-entregar"() {
    const o = lerOS();
    if (totalItens(o.itens) <= 0) { toast("Adicione peças ou serviços antes de receber."); return; }
    const s = await seguro(() => S.dados.salvar("os", o)); if (!s) return;
    S.pag = { tipo: "os", obj: s }; abrirModal(V.mPagamento("Entregar e receber · OS #" + s.numero, totalItens(s.itens)));
  },

  // agenda
  "ag-ir"(el) { S.dia = el.dataset.d; render(); },
  "ag-faixa"(el) { S.agIni = addDias(S.agIni || hojeStr(), +el.dataset.n); render(); },
  "ag-prof"(el) { S.agProf = el.dataset.p; render(); },
  "ag-modo"(el) { S.agView = el.dataset.m; render(); },
  "ag-novo"() { S.m = { tipo: "ag" }; abrirModal(V.mAgenda({ data: S.dia || hojeStr(), hora: "", status: "Agendado", profissionalId: S.agProf !== "todos" ? S.agProf : "" })); },
  "ag-novo-em"(el) { S.m = { tipo: "ag" }; abrirModal(V.mAgenda({ data: S.dia || hojeStr(), hora: el.dataset.h, status: "Agendado", profissionalId: el.dataset.p })); },
  "ag-novo-cli"(el) { S.rota = "agenda"; S.m = { tipo: "ag" }; render(); abrirModal(V.mAgenda({ data: S.dia || hojeStr(), hora: "", status: "Agendado", clienteId: el.dataset.id })); },
  "ag-abrir"(el) { const a = achar("agenda", el.dataset.id); if (!a) return; S.m = { tipo: "ag", id: a.id }; abrirModal(V.mAgenda(a)); },
  async "ag-salvar"() {
    const a = lerAgenda(); if (!a) return;
    const bate = conflito(S.cols.agenda, a, S.cols.servicos);
    if (bate && !confirm((a.profissional || "Esse profissional") + " já tem " + (achar("servicos", bate.servicoId) || { nome: "um atendimento" }).nome + " às " + bate.hora + ". Agendar mesmo assim?")) return;
    if (await seguro(() => S.dados.salvar("agenda", a))) { fecharModal(); toast("Agendamento salvo."); }
  },
  async "ag-excluir"(el) {
    if (!confirm("Excluir este agendamento?")) return;
    if ((await seguro(() => S.dados.apagar("agenda", el.dataset.id))) !== null) { fecharModal(); toast("Agendamento excluído."); }
  },
  async "ag-liberar"(el) { const a = achar("agenda", el.dataset.id); if (a && (await seguro(() => S.dados.apagar("agenda", a.id))) !== null) toast("Vaga liberada."); },
  async "ag-st"(el) { const a = achar("agenda", el.dataset.id); if (a && (await seguro(() => S.dados.salvar("agenda", { ...a, status: el.dataset.st }))) !== null) toast({ Confirmado: "Horário confirmado.", Cancelado: "Horário cancelado. A vaga ficou livre.", Faltou: "Falta registrada." }[el.dataset.st] || "Atualizado."); },
  "ag-zap"() {
    const c = achar("clientes", $("#f_clienteId").value), sv = achar("servicos", $("#f_servicoId").value);
    if (!c || !c.telefone) { toast("Esse cliente não tem WhatsApp cadastrado."); return; }
    const txt = `Olá, ${c.nome}! Confirmando seu horário${sv ? " de " + sv.nome : ""} em ${fmtData($("#f_data").value)} às ${$("#f_hora").value}. Podemos confirmar? — ${nomeNeg()}`;
    window.open(waLink(c.telefone, txt), "_blank", "noopener");
  },
  async "ag-concluir"() { const a = lerAgenda(); if (!a) return; const s = await seguro(() => S.dados.salvar("agenda", a)); if (s) await receberAgenda(s); },
  async "ag-receber"(el) { const a = achar("agenda", el.dataset.id); if (a) await receberAgenda(a); },

  // pacotes de sessões
  async "pac-usar"(el) {
    const p = achar("pacotes", el.dataset.id); if (!p) return;
    if ((Number(p.usadas) || 0) >= (Number(p.sessoes) || 0)) { toast("Esse pacote já foi todo usado."); return; }
    if (await seguro(() => S.dados.salvar("pacotes", { ...p, usadas: (Number(p.usadas) || 0) + 1 }))) toast("Sessão registrada.");
  },
  "pac-receber"(el) {
    const p = achar("pacotes", el.dataset.id); if (!p) return;
    S.pag = { tipo: "pacote", obj: p }; abrirModal(V.mPagamento("Receber pacote · " + (nomeDe2("clientes", p.clienteId) || ""), num(p.valor)));
  },
  "ret-dias"(el) { S.retDias = +el.dataset.n; render(); },

  // comandas
  "cm-nova"() { S.m = { tipo: "cm", itens: [], taxa: true }; abrirModal(V.mComanda({ nome: "", status: "Aberta" })); },
  "cm-abrir"(el) { const c = achar("comandas", el.dataset.id); if (!c) return; S.m = { tipo: "cm", id: c.id, itens: (c.itens || []).map((i) => ({ ...i })), taxa: !!c.taxa }; abrirModal(V.mComanda(c)); },
  async "cm-salvar"() { const c = lerComanda(); if (c && (await seguro(() => S.dados.salvar("comandas", c)))) { fecharModal(); toast("Comanda salva."); } },
  async "cm-cancelar"(el) {
    if (!confirm("Cancelar esta comanda? Ela some da lista de abertas.")) return;
    const c = achar("comandas", el.dataset.id);
    if (c && (await seguro(() => S.dados.salvar("comandas", { ...c, status: "Cancelada" })))) { fecharModal(); toast("Comanda cancelada."); }
  },
  async "cm-fechar"() {
    const c = lerComanda(); if (!c) return;
    if (totalItens(c.itens) <= 0) { toast("A comanda está vazia."); return; }
    const s = await seguro(() => S.dados.salvar("comandas", c)); if (!s) return;
    S.pag = { tipo: "cm", obj: s }; abrirModal(V.mPagamento("Fechar comanda · " + s.nome, V.totalComanda(s)));
  },

  // recebimento (OS, agenda e comanda passam por aqui)
  async "pagar-ok"() {
    const pag = $("#f_pag").value, ctx = S.pag; if (!ctx) return;
    const v = await seguro(async () => {
      const o = ctx.obj;
      if (ctx.tipo === "os") {
        const venda = await finalizarVenda({ itens: o.itens, desc: 0, pag, clienteId: o.clienteId, origem: "os", origemId: o.id });
        await S.dados.salvar("os", { ...o, status: "Entregue", entregueEm: new Date().toISOString(), vendaId: venda.id }); return venda;
      }
      if (ctx.tipo === "pacote") {
        const itens = [{ tipo: "avulso", nome: "Pacote de " + (o.sessoes || 0) + " sessões: " + (nomeDe2("servicos", o.servicoId) || "serviço"), qtd: 1, preco: num(o.valor) }];
        const venda = await finalizarVenda({ itens, desc: 0, pag, clienteId: o.clienteId, origem: "pacote", origemId: o.id });
        await S.dados.salvar("pacotes", { ...o, pago: "Sim", vendaId: venda.id }); return venda;
      }
      if (ctx.tipo === "ag") {
        const itens = [{ tipo: "servico", refId: ctx.sv.id, nome: ctx.sv.nome, qtd: 1, preco: num(ctx.sv.preco) }];
        const venda = await finalizarVenda({ itens, desc: 0, pag, clienteId: o.clienteId, origem: "agenda", origemId: o.id, profissionalId: o.profissionalId });
        await S.dados.salvar("agenda", { ...o, status: "Concluído", vendaId: venda.id }); return venda;
      }
      const itens = o.itens.map((i) => ({ ...i }));
      if (o.taxa) itens.push({ tipo: "avulso", nome: "Taxa de serviço (10%)", qtd: 1, preco: r2(totalItens(o.itens) * 0.1) });
      const venda = await finalizarVenda({ itens, desc: 0, pag, clienteId: "", origem: "comanda", origemId: o.id });
      await S.dados.salvar("comandas", { ...o, status: "Fechada", fechadaEm: new Date().toISOString(), vendaId: venda.id }); return venda;
    });
    if (v) { fecharModal(); toast("Recebido: venda #" + v.numero + " · " + brl(v.total)); render(); }
  },

  // minha conta
  async "conta-salvar"() {
    const nome = $("#c_nome").value.trim(), ramo = $("#c_ramo").value;
    if (!nome) { toast("Informe o nome do negócio."); return; }
    if ((await seguro(() => S.dados.salvarEmpresa({ nome, ramo }))) === null) return;
    S.empresa.nome = nome; S.empresa.ramo = ramo; S.ramo = ramo;
    if (!RAMOS[ramo].menu.includes(S.rota) && S.rota !== "conta" && S.rota !== "admin") S.rota = "painel";
    render(); toast("Salvo.");
  },
  async "exemplos-carregar"() { if (confirm("Carregar exemplos do seu ramo? Eles ficam marcados e podem ser apagados depois.")) await carregarExemplos(); },
  async "exemplos-apagar"() { if (confirm("Apagar todos os registros de exemplo? Seus cadastros e vendas reais não são tocados.")) await apagarExemplos(); },
  exportar() { baixarCopia(); },
  async sair() {
    if (S.dados && S.dados.modo === "demo" && !confirm("Sair da demonstração? Os dados de teste serão apagados.")) return;
    const demo = S.dados && S.dados.modo === "demo";
    await S.dados.sair(); desligar(); S.empresa = null;
    if (demo) location.reload(); else telaLogin();
  },

  // painel do dono do sistema
  "adm-recarregar"() { carregarAssinantes(); },
  async "adm-mais"(el) {
    const x = S.assinantes.find((a) => a.id === el.dataset.id); if (!x) return;
    const ate = x.assinatura.venceEm && new Date(x.assinatura.venceEm) > new Date() ? new Date(x.assinatura.venceEm) : new Date();
    ate.setDate(ate.getDate() + 30);
    await seguro(() => S.dados.admin.definir(x.id, "ativa", ate.toISOString())); carregarAssinantes();
  },
  async "adm-bloq"(el) {
    const x = S.assinantes.find((a) => a.id === el.dataset.id); if (!x || !confirm("Bloquear " + x.nome + "?")) return;
    await seguro(() => S.dados.admin.definir(x.id, "bloqueada", x.assinatura.venceEm || new Date().toISOString())); carregarAssinantes();
  },
  async "adm-ativar"(el) {
    const x = S.assinantes.find((a) => a.id === el.dataset.id); if (!x) return;
    await seguro(() => S.dados.admin.definir(x.id, "ativa", x.assinatura.venceEm || new Date().toISOString())); carregarAssinantes();
  },

  // entrada
  "auth-tab"(el) { telaLogin(el.dataset.tab); },
  async "auth-ok"(el) {
    const email = $("#a_email").value.trim(), senha = $("#a_senha").value;
    if (!email || !senha) { msgAuth("Informe e-mail e senha."); return; }
    msgAuth("Aguarde…", true);
    try { await (el.dataset.tab === "cadastrar" ? nuvem.cadastrar(email, senha) : nuvem.entrar(email, senha)); } catch (e) { msgAuth(erroAuth(e)); }
  },
  async "auth-esqueci"() {
    const email = $("#a_email").value.trim(); if (!email) { msgAuth("Digite seu e-mail acima e toque de novo."); return; }
    try { await nuvem.recuperar(email); msgAuth("Enviamos um e-mail para trocar a senha.", true); } catch (e) { msgAuth(erroAuth(e)); }
  },
  "demo-abrir"() { S.dados = local; telaOnboarding(); },
  "onb-voltar"() { S.dados = nuvem; telaLogin(); },
  async "onb-ok"() {
    const nome = $("#o_nome").value.trim(), r = $('input[name="ramo"]:checked'), ex = $("#o_ex").checked;
    if (!nome) { msgAuth("Informe o nome do seu negócio."); $("#o_nome").focus(); return; }
    if (!r) { msgAuth("Escolha o seu ramo."); return; }
    msgAuth("Montando seu sistema…", true);
    try {
      if (S.dados.modo === "demo") S.dados.iniciar({ nome, ramo: r.value }); else await S.dados.criarEmpresa({ nome, ramo: r.value });
      await iniciarApp(await S.dados.empresa());
      if (ex) await carregarExemplos(true);
    } catch (e) { console.error(e); msgAuth("Não foi possível criar agora. Tente de novo."); }
  },
};

const MUDANCAS = {
  "pdv-cliente"(el) { S.pdv.cliente = el.value; },
  "pdv-pag"(el) { S.pdv.pag = el.value; },
  "it-cat"(el) {
    const [t, r] = el.value.split(/:(.+)/); el.value = ""; if (!t || !r) return;
    const x = itemDoCatalogo(t, r); if (!x) return;
    S.m.itens = addItem(S.m.itens, { tipo: x.tipo, refId: x.refId, nome: x.nome, preco: x.preco, qtd: 1 }); itensRender();
  },
  "cm-taxa"(el) { S.m.taxa = el.checked; itensRender(); },
  "ag-cliente"(el) { const p = $("#f_petId"); if (p) p.innerHTML = V.opcoesPets(el.value, ""); },
};

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-a]"); if (!el) return;
  const fn = ACOES[el.dataset.a]; if (fn) fn(el, e);
});
document.addEventListener("change", (e) => {
  const el = e.target.closest("[data-ch]"); if (el && MUDANCAS[el.dataset.ch]) MUDANCAS[el.dataset.ch](el);
});
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.matches("[data-busca]")) {
    S.busca[el.dataset.col] = el.value; const q = norm(el.value);
    document.querySelectorAll("#view tr[data-q]").forEach((tr) => { tr.hidden = !!q && !tr.dataset.q.includes(q); });
  } else if (el.matches("[data-busca-cat]")) {
    const q = norm(el.value), raiz = el.closest(".panel,.mbody") || document;
    raiz.querySelectorAll(".prod[data-q]").forEach((b) => { b.hidden = !!q && !b.dataset.q.includes(q); });
  } else if (el.matches('[data-in="pdv-desc"]')) {
    S.pdv.desc = el.value; const t = $("#pdv-total"); if (t) t.textContent = brl(totalVenda(S.pdv.itens, num(el.value)));
  }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("#modal").innerHTML) fecharModal(); });

// ---------- início ----------
async function boot() {
  document.title = PRODUTO.nome;
  if (configurado()) { try { nuvem = await criarNuvem(firebaseConfig); } catch (e) { console.error("Firebase indisponível", e); nuvem = null; } }
  if (local.temSessao()) { S.dados = local; S.user = { uid: "demo" }; return iniciarApp(await local.empresa()); }
  if (nuvem) { S.dados = nuvem; nuvem.onUser((u) => { if (u) entrarUsuario(u); else { S.user = null; telaLogin(); } }); } else telaLogin();
}
boot();
