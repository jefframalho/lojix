// Camada de dados. Dois motores com a mesma interface:
//  - criarLocal(): modo demonstração, tudo no navegador (localStorage), sem Firebase
//  - criarNuvem(cfg): Firebase Auth + Firestore, um espaço separado por empresa
import { uid } from "./util.js";

const KEY = "lojix.demo.v1";

export function criarLocal() {
  let st = null;
  try { st = JSON.parse(localStorage.getItem(KEY)); } catch (e) { st = null; }
  if (!st || !st.cols) st = null;
  const subs = {};
  const gravar = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* sem espaço: segue só em memória */ } };
  const lista = (c) => Object.values((st && st.cols[c]) || {});
  const avisar = (c) => (subs[c] || new Set()).forEach((f) => f(lista(c)));
  return {
    modo: "demo",
    temSessao: () => !!st,
    iniciar(empresa) { st = { empresa: { ...empresa, assinatura: { status: "demo", venceEm: null } }, cols: {} }; gravar(); },
    async empresa() { return st ? { ...st.empresa, ativa: true } : null; },
    async salvarEmpresa(p) { Object.assign(st.empresa, p); gravar(); },
    watch(c, cb) { (subs[c] = subs[c] || new Set()).add(cb); cb(lista(c)); return () => subs[c].delete(cb); },
    async salvar(c, o) { const x = { ...o, id: o.id || uid() }; (st.cols[c] = st.cols[c] || {})[x.id] = x; gravar(); avisar(c); return x; },
    async apagar(c, id) { if (st.cols[c]) delete st.cols[c][id]; gravar(); avisar(c); },
    async incrementar(c, id, campo, d) { const x = st.cols[c] && st.cols[c][id]; if (x) { x[campo] = (Number(x[campo]) || 0) + d; gravar(); avisar(c); } },
    async sair() { st = null; try { localStorage.removeItem(KEY); } catch (e) { /* ok */ } },
    exportar: () => JSON.parse(JSON.stringify(st)),
    admin: { async ehAdmin() { return false; } },
  };
}

export async function criarNuvem(cfg) {
  const B = "https://www.gstatic.com/firebasejs/10.12.2/";
  const [{ initializeApp }, A, F] = await Promise.all([import(B + "firebase-app.js"), import(B + "firebase-auth.js"), import(B + "firebase-firestore.js")]);
  const app = initializeApp(cfg), auth = A.getAuth(app), db = F.getFirestore(app);
  const eid = () => auth.currentUser && auth.currentUser.uid;
  const iso = (t) => (t && t.toDate ? t.toDate().toISOString() : t || null);
  const lerEmp = (snap) => {
    if (!snap.exists()) return null;
    const d = snap.data(), a = d.assinatura || {}, venceEm = iso(a.venceEm);
    const ativa = a.status !== "bloqueada" && !!venceEm && new Date(venceEm) > new Date();
    return { ...d, id: snap.id, criadoEm: iso(d.criadoEm), assinatura: { status: a.status || "teste", venceEm }, ativa };
  };
  return {
    modo: "nuvem",
    onUser: (cb) => A.onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email } : null)),
    async cadastrar(email, senha) { await A.createUserWithEmailAndPassword(auth, email, senha); },
    async entrar(email, senha) { await A.signInWithEmailAndPassword(auth, email, senha); },
    async recuperar(email) { await A.sendPasswordResetEmail(auth, email); },
    async sair() { await A.signOut(auth); },
    async empresa() { return lerEmp(await F.getDoc(F.doc(db, "empresas", eid()))); },
    async criarEmpresa({ nome, ramo }) {
      const venceEm = new Date(Date.now() + 7 * 864e5); // 7 dias de teste grátis
      await F.setDoc(F.doc(db, "empresas", eid()), {
        nome, ramo, dono: eid(), email: auth.currentUser.email, criadoEm: F.serverTimestamp(),
        assinatura: { status: "teste", venceEm: F.Timestamp.fromDate(venceEm) },
      });
    },
    async salvarEmpresa(p) { await F.updateDoc(F.doc(db, "empresas", eid()), p); },
    watch: (c, cb) => F.onSnapshot(F.collection(db, "empresas", eid(), c), (s) => cb(s.docs.map((d) => ({ ...d.data(), id: d.id }))), (e) => console.error("watch " + c, e)),
    async salvar(c, o) {
      const x = JSON.parse(JSON.stringify({ ...o, id: o.id || uid() })); // tira campos undefined, que o Firestore não aceita
      await F.setDoc(F.doc(db, "empresas", eid(), c, x.id), x);
      return x;
    },
    async apagar(c, id) { await F.deleteDoc(F.doc(db, "empresas", eid(), c, id)); },
    async incrementar(c, id, campo, d) { await F.updateDoc(F.doc(db, "empresas", eid(), c, id), { [campo]: F.increment(d) }); },
    admin: {
      async ehAdmin() { try { return (await F.getDoc(F.doc(db, "admins", String(auth.currentUser.email).toLowerCase()))).exists(); } catch (e) { return false; } },
      async listar() { return (await F.getDocs(F.collection(db, "empresas"))).docs.map(lerEmp).filter(Boolean); },
      async definir(id, status, venceEm) { await F.updateDoc(F.doc(db, "empresas", id), { assinatura: { status, venceEm: F.Timestamp.fromDate(new Date(venceEm)) } }); },
    },
  };
}
