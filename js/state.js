// Estado único do sistema. As telas só leem daqui.
export const COLS = ["clientes", "produtos", "servicos", "pets", "profissionais", "pacotes", "vendas", "lancamentos", "os", "agenda", "comandas"];

export const S = {
  dados: null, user: null, empresa: null, ramo: null, ehAdmin: false,
  cols: {}, rota: "painel",
  pdv: { itens: [], desc: "", pag: "Dinheiro", cliente: "" },
  dia: null, agIni: null, agProf: "todos", agView: "lista", retDias: 45, caixa: "hoje", busca: {},
  m: null,       // contexto do modal aberto (itens da OS ou comanda, id em edição)
  pag: null,     // o que está sendo cobrado no modal de pagamento
  assinantes: null,
};
COLS.forEach((c) => { S.cols[c] = []; });
