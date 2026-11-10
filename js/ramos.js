// Cada ramo é só uma configuração: quais telas aparecem, os nomes usados e os campos da OS.
// Para criar um ramo novo, copie um bloco de RAMOS e ajuste.
import { uid, hojeStr } from "./util.js";

export const PAGAMENTOS = ["Dinheiro", "Pix", "Cartão de débito", "Cartão de crédito"];
export const STATUS_OS = ["Aberta", "Em andamento", "Pronta", "Entregue"];
export const STATUS_AG = ["Agendado", "Confirmado", "Concluído", "Cancelado"];

const ROT_PADRAO = { clientes: ["Cliente", "Clientes"], produtos: ["Produto", "Produtos"], servicos: ["Serviço", "Serviços"], pets: ["Pet", "Pets"] };

export const RAMOS = {
  oficina: {
    nome: "Oficina mecânica", ico: "🔧",
    desc: "Ordens de serviço com placa e km, peças, mão de obra e caixa.",
    menu: ["painel", "os", "clientes", "vendas", "produtos", "servicos", "caixa"],
    os: { item: "Veículo", campos: [{ k: "placa", l: "Placa" }, { k: "modelo", l: "Modelo" }, { k: "km", l: "Km atual" }], resumo: ["placa", "modelo"], pronta: "Seu veículo está pronto para retirada." },
    rot: { produtos: ["Peça ou produto", "Peças e produtos"], servicos: ["Serviço", "Serviços e mão de obra"] },
  },
  assistencia: {
    nome: "Assistência técnica", ico: "📱",
    desc: "Ordens de serviço para celulares e eletrônicos, peças, acessórios e caixa.",
    menu: ["painel", "os", "clientes", "vendas", "produtos", "servicos", "caixa"],
    os: { item: "Aparelho", campos: [{ k: "modelo", l: "Marca e modelo" }, { k: "imei", l: "IMEI ou número de série" }, { k: "acessorios", l: "Acessórios deixados" }], resumo: ["modelo"], pronta: "Seu aparelho está pronto para retirada." },
    rot: { produtos: ["Peça ou acessório", "Peças e acessórios"], servicos: ["Serviço", "Serviços e mão de obra"] },
  },
  petshop: {
    nome: "Pet shop", ico: "🐾",
    desc: "Agenda de banho, tosa e consulta, cadastro de pets e tutores, vendas e caixa.",
    menu: ["painel", "agenda", "clientes", "pets", "vendas", "produtos", "servicos", "caixa"],
    rot: { clientes: ["Tutor", "Tutores"], servicos: ["Serviço", "Banho, tosa e consultas"] },
  },
  salao: {
    nome: "Salão e estética", ico: "💇",
    desc: "Agenda por profissional, clientes, serviços, produtos e caixa.",
    menu: ["painel", "agenda", "clientes", "vendas", "produtos", "servicos", "caixa"],
    rot: {},
  },
  restaurante: {
    nome: "Restaurante e lanchonete", ico: "🍽️",
    desc: "Comandas por mesa, cardápio, vendas de balcão e caixa.",
    menu: ["painel", "comandas", "vendas", "produtos", "clientes", "caixa"],
    rot: { produtos: ["Item do cardápio", "Cardápio"] },
  },
  loja: {
    nome: "Loja e comércio", ico: "🛍️",
    desc: "Frente de caixa, estoque com alerta de falta, clientes e caixa.",
    menu: ["painel", "vendas", "produtos", "clientes", "caixa"],
    rot: {},
  },
};
export const RAMO_IDS = Object.keys(RAMOS);

export function rotulo(ramo, col, plural) {
  const r = ((RAMOS[ramo] || {}).rot || {})[col] || ROT_PADRAO[col];
  return r ? (plural ? r[1] : r[0]) : col;
}
const ICO = { clientes: "👥", produtos: "📦", servicos: "✂️", pets: "🐶" };
const FIXOS = { painel: ["Painel", "📊"], os: ["Ordens de serviço", "🧾"], agenda: ["Agenda", "📅"], comandas: ["Comandas", "🍽️"], vendas: ["Vender", "🛒"], caixa: ["Caixa", "💰"], conta: ["Minha conta", "⚙️"], admin: ["Assinantes", "🛡️"] };
export function itemMenu(ramo, id) {
  if (FIXOS[id]) return { nome: FIXOS[id][0], ico: FIXOS[id][1] };
  return { nome: rotulo(ramo, id, true), ico: ICO[id] || "•" };
}

// Cadastros genéricos: a tela de lista e o formulário saem destas descrições.
// t: money, num, tel, area, select (op), ref (c = coleção), date
export const ENT = {
  clientes: {
    campos: [{ k: "nome", l: "Nome", req: true }, { k: "telefone", l: "WhatsApp", t: "tel" }, { k: "obs", l: "Observações", t: "area" }],
    lista: ["nome", "telefone"],
  },
  produtos: {
    campos: [
      { k: "nome", l: "Nome", req: true }, { k: "categoria", l: "Categoria" },
      { k: "preco", l: "Preço de venda (R$)", t: "money", req: true }, { k: "custo", l: "Custo (R$)", t: "money" },
      { k: "controle", l: "Controlar estoque?", t: "select", op: ["Não", "Sim"] },
      { k: "estoque", l: "Estoque atual", t: "num" }, { k: "minimo", l: "Avisar quando chegar em", t: "num" },
    ],
    lista: ["nome", "categoria", "preco", "estoque"],
  },
  servicos: {
    campos: [{ k: "nome", l: "Nome", req: true }, { k: "preco", l: "Preço (R$)", t: "money", req: true }, { k: "duracao", l: "Duração (minutos)", t: "num" }],
    lista: ["nome", "preco", "duracao"],
  },
  pets: {
    campos: [
      { k: "nome", l: "Nome do pet", req: true }, { k: "especie", l: "Espécie", t: "select", op: ["Cachorro", "Gato", "Outro"] },
      { k: "raca", l: "Raça" }, { k: "porte", l: "Porte", t: "select", op: ["Pequeno", "Médio", "Grande"] },
      { k: "clienteId", l: "Tutor", t: "ref", c: "clientes" }, { k: "obs", l: "Observações", t: "area" },
    ],
    lista: ["nome", "especie", "raca", "clienteId"],
  },
  lancamentos: {
    campos: [
      { k: "tipo", l: "Tipo", t: "select", op: [["entrada", "Entrada"], ["saida", "Saída"]] },
      { k: "descricao", l: "Descrição", req: true }, { k: "valor", l: "Valor (R$)", t: "money", req: true },
      { k: "data", l: "Data", t: "date", req: true }, { k: "categoria", l: "Categoria" },
    ],
  },
};

// Exemplos para a loja nova não começar vazia (e para demonstrar o sistema)
export function exemplos(ramoId) {
  const f = (o) => ({ id: uid(), exemplo: true, ...o });
  const out = { clientes: [], produtos: [], servicos: [], pets: [], os: [], agenda: [], comandas: [] };
  const c = [f({ nome: "Maria Souza", telefone: "(83) 99999-1111" }), f({ nome: "João Pereira", telefone: "(83) 98888-2222" }), f({ nome: "Ana Lima", telefone: "(83) 97777-3333" })];
  out.clientes.push(...c);
  const p = (nome, categoria, preco, custo, estoque, minimo) => f({ nome, categoria, preco, custo, controle: estoque == null ? "Não" : "Sim", estoque: estoque ?? 0, minimo: minimo ?? 0 });
  const s = (nome, preco, duracao) => f({ nome, preco, duracao });
  const it = (x, tipo, qtd) => ({ refId: x.id, tipo, nome: x.nome, qtd: qtd || 1, preco: x.preco });
  const hoje = hojeStr();

  if (ramoId === "oficina") {
    const oleo = p("Óleo 5W30 (1 litro)", "Lubrificantes", 38, 22, 24, 6), filtro = p("Filtro de óleo", "Filtros", 29, 14, 15, 5), pastilha = p("Pastilha de freio dianteira", "Freios", 120, 70, 2, 3);
    const troca = s("Troca de óleo", 60, 40), alin = s("Alinhamento e balanceamento", 80, 60);
    out.produtos.push(oleo, filtro, pastilha, p("Lâmpada de farol", "Elétrica", 25, 10, 12, 4));
    out.servicos.push(troca, alin, s("Revisão completa", 250, 180), s("Mão de obra por hora", 90, 60));
    out.os.push(
      f({ numero: 1, clienteId: c[0].id, placa: "QWE-1A23", modelo: "Gol 1.0", km: "84500", defeito: "Barulho ao frear", status: "Em andamento", itens: [it(pastilha, "produto"), it(alin, "servico")], em: new Date().toISOString() }),
      f({ numero: 2, clienteId: c[1].id, placa: "HJK-4B56", modelo: "Onix 1.4", km: "41200", defeito: "Revisão dos 40 mil", status: "Pronta", itens: [it(oleo, "produto", 4), it(filtro, "produto"), it(troca, "servico")], em: new Date().toISOString() })
    );
  } else if (ramoId === "assistencia") {
    const pel = p("Película de vidro", "Acessórios", 25, 6, 30, 8), bat = p("Bateria genérica", "Peças", 80, 35, 2, 3);
    const tela = s("Troca de tela (mão de obra)", 90, 60);
    out.produtos.push(pel, bat, p("Carregador turbo", "Acessórios", 45, 20, 10, 4), p("Cabo USB-C", "Acessórios", 20, 7, 25, 8));
    out.servicos.push(tela, s("Troca de bateria", 60, 30), s("Formatação e backup", 80, 90), s("Limpeza interna", 50, 40));
    out.os.push(
      f({ numero: 1, clienteId: c[0].id, modelo: "Samsung A54", imei: "3567 8901 2345 678", acessorios: "Capinha", defeito: "Tela quebrada", status: "Aberta", itens: [it(tela, "servico")], em: new Date().toISOString() }),
      f({ numero: 2, clienteId: c[2].id, modelo: "iPhone 11", imei: "3541 2345 6789 012", acessorios: "Nenhum", defeito: "Bateria viciada", status: "Pronta", itens: [it(bat, "produto"), { tipo: "avulso", nome: "Mão de obra", qtd: 1, preco: 60 }], em: new Date().toISOString() })
    );
  } else if (ramoId === "petshop") {
    const banhoP = s("Banho (porte pequeno)", 45, 60), banhoG = s("Banho (porte grande)", 70, 90), cons = s("Consulta veterinária", 120, 30);
    out.servicos.push(banhoP, banhoG, s("Tosa higiênica", 40, 40), cons);
    out.produtos.push(p("Ração premium 1 kg", "Ração", 32, 19, 40, 10), p("Shampoo para pets", "Higiene", 28, 14, 12, 4), p("Coleira", "Acessórios", 35, 15, 8, 3), p("Petisco", "Petiscos", 12, 5, 50, 12));
    const thor = f({ nome: "Thor", especie: "Cachorro", raca: "Golden Retriever", porte: "Grande", clienteId: c[0].id }), mimi = f({ nome: "Mimi", especie: "Gato", raca: "SRD", porte: "Pequeno", clienteId: c[1].id });
    out.pets.push(thor, mimi);
    out.agenda.push(
      f({ data: hoje, hora: "09:00", clienteId: c[0].id, petId: thor.id, servicoId: banhoG.id, profissional: "", status: "Confirmado" }),
      f({ data: hoje, hora: "14:30", clienteId: c[1].id, petId: mimi.id, servicoId: cons.id, profissional: "", status: "Agendado" })
    );
  } else if (ramoId === "salao") {
    const corte = s("Corte feminino", 70, 60), mani = s("Manicure", 35, 40);
    out.servicos.push(corte, s("Corte masculino", 40, 30), s("Escova", 50, 45), mani, s("Coloração", 150, 120));
    out.produtos.push(p("Shampoo profissional", "Cabelo", 45, 25, 10, 3), p("Esmalte", "Unhas", 9, 4, 30, 10), p("Máscara capilar", "Cabelo", 60, 32, 6, 3));
    out.agenda.push(
      f({ data: hoje, hora: "10:00", clienteId: c[0].id, servicoId: corte.id, profissional: "Carla", status: "Confirmado" }),
      f({ data: hoje, hora: "15:00", clienteId: c[2].id, servicoId: mani.id, profissional: "Bia", status: "Agendado" })
    );
  } else if (ramoId === "restaurante") {
    const x = p("X-Burger", "Lanches", 22), xs = p("X-Salada", "Lanches", 20), bat = p("Batata frita", "Porções", 18), ref = p("Refrigerante lata", "Bebidas", 6, 3, 48, 12);
    out.produtos.push(x, xs, bat, ref, p("Suco natural", "Bebidas", 9), p("Prato feito", "Pratos", 28), p("Água mineral", "Bebidas", 4, 1.5, 36, 10));
    out.comandas.push(f({ numero: 1, nome: "Mesa 3", status: "Aberta", taxa: true, itens: [it(x, "produto", 2), it(ref, "produto", 2)], abertaEm: new Date().toISOString() }));
  } else {
    out.produtos.push(p("Camiseta básica", "Roupas", 49.9, 22, 20, 5), p("Boné", "Acessórios", 35, 15, 3, 4), p("Garrafa térmica", "Casa", 59, 30, 12, 4), p("Mochila", "Acessórios", 120, 65, 6, 2), p("Meia (par)", "Roupas", 12, 5, 40, 10));
  }
  return out;
}
