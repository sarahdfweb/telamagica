/* ===== Fundo Mágico – aceita QUALQUER cor ou gradiente digitado =====
 * Regras:
 * - Se você digitar um gradiente CSS (linear-/radial-/conic-/repeating-...), ele usa exatamente isso.
 * - Se digitar 1 cor (nome, #hex, rgb/rgba, hsl/hsla), aplica sólido.
 * - Se digitar 2+ cores separadas por "e", vírgula, "/", ";", "para", gera gradiente na MESMA ORDEM.
 * - Retorna HTML + CSS nas caixas e aplica no fundo da página.
 */


console.log("index.js carregado ✅");

document.addEventListener("DOMContentLoaded", () => {
  const form     = document.getElementById("form-group");
  const textarea = document.getElementById("description");
  const preview  = document.getElementById("preview-section");
  const htmlOut  = document.getElementById("html-code");
  const cssOut   = document.getElementById("css-code");
  const btn      = document.getElementById("generate-btn");
  const btnTxt   = document.getElementById("btn-text") || btn;

  if (!form || !textarea || !preview || !htmlOut || !cssOut) {
    console.error("IDs não encontrados no HTML.");
    return;
  }

  ensurePageBg(); // cria a camada fixa do fundo

  /* ---------- utils ---------- */
  function injectCss(css){
    let s = document.getElementById("dynamic-style");
    if (s) s.remove();
    s = document.createElement("style");
    s.id = "dynamic-style";
    s.textContent = css;
    document.head.appendChild(s);
  }

  function ensurePageBg(){
    let el = document.getElementById("page-dynamic-bg");
    if (!el) {
      el = document.createElement("div");
      el.id = "page-dynamic-bg";
      Object.assign(el.style, { position:"fixed", inset:"0", zIndex:"-1", pointerEvents:"none" });
      document.body.appendChild(el);
    }
    return el;
  }

  // valida cores/gradientes usando o parser do próprio browser
  function isValidCssColor(c){
    const el = document.createElement("div");
    el.style.color = "";
    el.style.color = c;
    return el.style.color !== "";
  }
  function isValidCssBackgroundImage(value){
    const el = document.createElement("div");
    el.style.backgroundImage = "";
    el.style.backgroundImage = value;
    return el.style.backgroundImage !== "";
  }

  /* ---------- dicionário de cores em PT (expanda à vontade) ---------- */
  const PT_COLORS = {
    // neutras
    "preto":"#000000","branco":"#ffffff",
    "cinza":"#9aa3ab","cinza claro":"#cfd6dc","cinza escuro":"#4b5563",
    "bege":"#f5f5dc","creme":"#fffdd0","dourado":"#d4af37","prata":"#c0c0c0",

    // marrons/terrosos
    "marrom":"#8b4513","castanho":"#7b3f00","caramelo":"#af6f2a","chocolate":"#d2691e",
    "bronze":"#cd7f32","cobre":"#b87333","areia":"#c2b280","terracota":"#e2725b",

    // vermelhos/rosas
    "vermelho":"#ef4444","vinho":"#7f1d1d","bordo":"#800020","magenta":"#ff00ff",
    "fúcsia":"#ff00ff","pink":"#ff4da6","salmão":"#fa8072","coral":"#ff7f50",
    "pêssego":"#ffcba4","tomate":"#ff6347",

    // laranjas/amarelos
    "laranja":"#ffa500","ambar":"#ffbf00","mostarda":"#e1ad01",
    "amarelo":"#ffd900","amarelo claro":"#fff176","amarelo escuro":"#b58900",

    // verdes
    "verde":"#22c55e","verde claro":"#a2ffd0","verde escuro":"#087f5b",
    "limão":"#c7f000","oliva":"#808000","oliva escuro":"#556b2f",
    "menta":"#98ff98","esmeralda":"#2ecc71","musgo":"#556b2f",

    // azuis / cianos / turquesas
    "azul":"#3b82f6","azul claro":"#8cc3ff","azul escuro":"#1e3a8a",
    "marinho":"#001f3f","anil":"#4b0082","cobalto":"#0047ab","celeste":"#87ceeb",
    "ciano":"#00ffff","água":"#00ffff","aqua":"#00ffff","turquesa":"#40e0d0","teal":"#008080",

    // roxos/violetas
    "roxo":"#9d7cff","lilás":"#b18cff","violeta":"#7c3aed","lavanda":"#e6e6fa","púrpura":"#800080"
  };

  /* ---------- parser principal ---------- */
  function parseInputToBackground(text){
    const raw = (text || "").trim();
    if (!raw) return { ok:false, reason:"Digite pelo menos uma cor." };

    const t = raw.toLowerCase();

    // Se já veio um gradiente CSS pronto, usa exatamente ele
    if (/\b(repeating-)?(linear|radial|conic)-gradient\s*\(/i.test(t)) {
      const bgValue = raw;
      if (isValidCssBackgroundImage(bgValue)) return { ok:true, mode:"gradient", background: bgValue };
      return { ok:false, reason:"Gradiente inválido. Verifique a sintaxe." };
    }

    // Preferências do usuário (tipo, ângulo, repeating)
    const wantsRepeating = /\b(repetindo|repetido|repeating)\b/.test(t);
    const isRadial  = /\b(radial|circular)\b/.test(t);
    const isConic   = /\b(c[oô]nico|cônico|conic)\b/.test(t);
    let angle = null;
    const mDeg  = t.match(/(-?\d+(?:\.\d+)?)\s*deg/);
    const mGrau = t.match(/(-?\d+(?:\.\d+)?)\s*grau[s]?/);
    if (mDeg)  angle = parseFloat(mDeg[1]);
    if (mGrau) angle = parseFloat(mGrau[1]);

    // limpa palavras auxiliares e separa cores por conectores
    const cleaned = t
      .replace(/\b(gradiente|fundo|cor|cores|tom|tons|de|em|para|no|na|ao|a)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const parts = cleaned
      .split(/\s*[,/;]\s*|\s+e\s+/g)   // vírgula, /, ;, " e "
      .map(s=>s.trim())
      .filter(Boolean);

    if (parts.length === 0) return { ok:false, reason:"Não reconheci nenhuma cor." };

    // converte cada pedaço em cor CSS válida
    const keysByLen = Object.keys(PT_COLORS).sort((a,b)=>b.length-a.length);
    function toColor(p){
      if (/^#([0-9a-f]{3,8})$/i.test(p)) return p;                        // hex
      if (/^rgba?\(\s*[\d.\s,%]+\)$/i.test(p)) return p;                   // rgb/rgba
      if (/^hsla?\(\s*[\d.\s,%]+\)$/i.test(p)) return p;                   // hsl/hsla
      for (const k of keysByLen) {                                         // PT names
        const re = new RegExp("^" + k.replace(/\s+/g,"\\s+") + "$","i");
        if (re.test(p)) return PT_COLORS[k];
      }
      if (isValidCssColor(p)) return p;                                    // nomes CSS em inglês
      return null;
    }
    const colors = parts.map(toColor).filter(Boolean);

    if (colors.length === 0)
      return { ok:false, reason:"Nenhuma cor reconhecida. Exemplos: '#0f0', 'rgb(10,120,30)', 'marrom'." };

    // 1 cor -> sólido
    if (colors.length === 1) {
      const c = colors[0];
      if (!isValidCssColor(c)) return { ok:false, reason:"Cor inválida." };
      return { ok:true, mode:"solid", background: c };
    }

    // 2+ cores -> gradiente no tipo escolhido
    let bgValue;
    if (isRadial) {
      bgValue = `${wantsRepeating ? "repeating-" : ""}radial-gradient(circle at center, ${colors.join(", ")})`;
    } else if (isConic) {
      const from = (typeof angle === "number") ? `from ${angle}deg ` : "";
      bgValue = `${wantsRepeating ? "repeating-" : ""}conic-gradient(${from}at center, ${colors.join(", ")})`;
    } else { // linear (padrão)
      const ang = (typeof angle === "number") ? `${angle}deg` : "90deg";
      bgValue = `${wantsRepeating ? "repeating-" : ""}linear-gradient(${ang}, ${colors.join(", ")})`;
    }

    if (!isValidCssBackgroundImage(bgValue))
      return { ok:false, reason:"Gradiente gerado ficou inválido. Revise as cores." };

    return { ok:true, mode:"gradient", background: bgValue };
  }

  /* ---------- monta HTML + CSS completos ---------- */
  function buildHtmlCss(backgroundValue){
    const isGrad = /\bgradient\(/i.test(backgroundValue);
    const html = `<div class="bg-generated" aria-hidden="true"></div>`;
    const css = `
/* Fundo da página (injetado pelo JS em #page-dynamic-bg) */
#page-dynamic-bg{
  background: ${backgroundValue};
  ${isGrad ? "background-size: 200% 100%; animation: bgSweep 8s ease-in-out infinite;" : ""}
}

/* Preview pequeno dentro do card */
.bg-generated{
  height: 180px;
  border-radius: 16px;
  background: ${backgroundValue};
  ${isGrad ? "background-size: 200% 100%; animation: bgSweep 8s ease-in-out infinite;" : ""}
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.06);
}

@keyframes bgSweep{
  0%,100%{ background-position: 0% 50%; }
  50%{    background-position: 100% 50%; }
}`;
    return { html, css };
  }

  /* ---------- submit ---------- */
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const text = (textarea.value || "").trim();
    if (!text) { textarea.focus(); return; }

    btn.disabled = true; (btnTxt||btn).textContent = "Gerando...";
    setTimeout(() => { btn.disabled = false; (btnTxt||btn).textContent = "Gerar Background Mágico"; }, 400);

    const parsed = parseInputToBackground(text);

    if (!parsed.ok) {
      preview.innerHTML   = "";
      injectCss("");
      htmlOut.textContent = "—";
      cssOut.textContent  = `/* ${parsed.reason} */`;
      return;
    }

    const { html, css } = buildHtmlCss(parsed.background);
    preview.innerHTML   = html;
    injectCss(css);
    htmlOut.textContent = html;
    cssOut.textContent  = css;
  });
});
