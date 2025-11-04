const params = new URLSearchParams(window.location.search);
const codigo = params.get('c');
const infoDiv = document.getElementById('infoChamado');
const msgDiv = document.getElementById('msg');

const escapeHtml = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

async function carregarChamado(){
  if(!codigo){ infoDiv.textContent = "❌ Código de chamado não informado."; return; }
  try{
    const res = await fetch(`backend/api_get.php?c=${encodeURIComponent(codigo)}`);
    const data = await res.json();
    if(!data.success){ infoDiv.textContent = "❌ " + (data.message || 'Não encontrado.'); return; }
    const ch = data.chamado;
    const eventos = Array.isArray(data.eventos) ? data.eventos : [];
    const mensagens = Array.isArray(data.mensagens) ? data.mensagens : [];
    const infoHtml = [
      `<p><b>Código:</b> ${escapeHtml(ch.codigo_publico)}</p>`,
      `<p><b>Status:</b> ${escapeHtml(ch.status)}</p>`,
      `<p><b>Produto:</b> ${escapeHtml(ch.marca)} ${escapeHtml(ch.modelo)}</p>`,
      `<p><b>Serial:</b> ${escapeHtml(ch.serial)}</p>`,
      `<p><b>Problema:</b> ${escapeHtml(ch.descricao_problema)}</p>`,
      '<hr><h4>Histórico</h4>',
      `<ul>${eventos.map(e=>`<li>${escapeHtml(e.data)} — ${escapeHtml(e.texto)}</li>`).join('')}</ul>`
    ].join('');
    infoDiv.innerHTML = infoHtml;
    const mensagensDiv = document.getElementById('mensagens');
    mensagensDiv.innerHTML = mensagens.map(m=>{
      const autor = escapeHtml(m.autor);
      const mensagem = escapeHtml(m.mensagem);
      const classe = m.autor === 'cliente' ? 'msg-cli' : 'msg-int';
      return `<div class="${classe}"><b>${autor}</b>: ${mensagem}</div>`;
    }).join('');
  }catch(_){ infoDiv.textContent = "❌ Falha ao carregar."; }
}

document.getElementById('formUpload').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(e.target); fd.append('codigo', codigo);
  const res = await fetch('backend/upload.php',{method:'POST',body:fd});
  const data = await res.json();
  msgDiv.textContent = data.success ? '✅ Anexo enviado.' : '❌ ' + (data.message||'Falha no upload.');
});

document.getElementById('formMensagem').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(e.target); fd.append('codigo', codigo);
  const res = await fetch('backend/api_get.php',{method:'POST',body:fd});
  const data = await res.json();
  if(data.success){ msgDiv.textContent='💬 Mensagem enviada.'; e.target.reset(); carregarChamado(); }
  else{ msgDiv.textContent='❌ ' + (data.message||'Falha ao enviar.'); }
});

carregarChamado();
