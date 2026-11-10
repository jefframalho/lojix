// Configuração do Firebase. Sem isso o sistema roda só em modo demonstração (dados no próprio navegador).
// Cole aqui os dados do seu projeto: Firebase, Configurações do projeto, Seus aplicativos, App da Web.
export const firebaseConfig = {
  apiKey: "AIzaSyAsSymJ9Oc4czSO4k1-lGo7ZFIkTjle8_o",
  authDomain: "lojix-26229.firebaseapp.com",
  projectId: "lojix-26229",
  storageBucket: "lojix-26229.firebasestorage.app",
  messagingSenderId: "987496336084",
  appId: "1:987496336084:web:584b4865647d0ce8958941",
};

export const configurado = () => !!firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith("COLE");

export const PRODUTO = {
  nome: "Lojix",                        // nome do sistema; troque aqui e vale em todas as telas
  slogan: "O sistema do seu negócio, do jeito do seu ramo.",
  suporteWhatsapp: "",                  // só números, com DDD (ex.: 83999999999). Se vazio, o botão de suporte some.
  diasDeTeste: 7,
};
