// Estado único do sistema. As telas só leem daqui.
export const COLS = ["clientes", "produtos", "servicos", "pets", "vendas", "lancamentos", "os", "agenda", "comandas"];

export const S = {
  dados: null, user: null, empresa: null, ramo: null, ehAdmin: false,
  cols: {}, rota: "painel",
  pdv: { itens: [], desc: "", pag: "Dinheiro", cliente: "" },
  dia: null, caixa: "hoje", busca: {},
  m: null,       // contexto do modal aberto (itens da OS ou comanda, id em edição)
  pag: null,     // o que está sendo cobrado no modal de pagamento
  assinantes: null,
};
COLS.forEach((c) => { S.cols[c] = []; });
