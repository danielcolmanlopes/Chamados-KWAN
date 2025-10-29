const apiBase = 'backend';

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleString('pt-BR');
}

function sanitize(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function renderChamado(data) {
    const infoBox = document.getElementById('info-chamado');
    const statusEl = document.getElementById('status-atual');
    const clienteNome = document.getElementById('cliente-nome');
    const clienteEmail = document.getElementById('cliente-email');
    const produto = document.getElementById('produto');
    const dataAbertura = document.getElementById('data-abertura');
    const descricao = document.getElementById('descricao');

    statusEl.textContent = (data.status || '').replace(/_/g, ' ');
    clienteNome.textContent = data.cliente_nome;
    clienteEmail.textContent = data.cliente_email;
    produto.textContent = `${data.produto_marca} • ${data.produto_modelo} • Série ${data.produto_serial}`;
    dataAbertura.textContent = formatDateTime(data.created_at);
    descricao.textContent = data.descricao_problema;

    infoBox.classList.remove('hidden');
}

function renderEventos(eventos) {
    const lista = document.getElementById('lista-eventos');
    lista.innerHTML = '';
    if (!eventos || eventos.length === 0) {
        lista.innerHTML = '<li>Sem eventos registrados até o momento.</li>';
        return;
    }

    eventos.forEach((evento) => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${sanitize(evento.status.replace(/_/g, ' '))}</strong><br>${sanitize(evento.observacao || '')}<br><time>${formatDateTime(evento.created_at)} • ${sanitize(evento.criado_por || 'Sistema')}</time>`;
        lista.appendChild(li);
    });
}

function renderMensagens(mensagens) {
    const container = document.getElementById('lista-mensagens');
    container.innerHTML = '';
    if (!mensagens || mensagens.length === 0) {
        container.innerHTML = '<p class="muted">Sem mensagens até o momento.</p>';
        return;
    }

    mensagens.forEach((msg) => {
        const div = document.createElement('div');
        div.className = `mensagem ${msg.origem === 'admin' ? 'admin' : 'cliente'}`;
        div.innerHTML = `${sanitize(msg.mensagem)}<time>${formatDateTime(msg.created_at)} • ${msg.origem === 'admin' ? 'Equipe KWAN' : 'Você'}</time>`;
        container.appendChild(div);
    });
}

async function carregarChamado(codigo) {
    const erro = document.getElementById('erro');
    const linkDireto = document.getElementById('link-direto');
    erro.classList.add('hidden');
    erro.textContent = '';

    try {
        const response = await fetch(`${apiBase}/api_get.php?c=${encodeURIComponent(codigo)}`);
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Chamado não encontrado.');
        }

        renderChamado(data.chamado);
        renderMensagens(data.mensagens);
        renderEventos(data.eventos);
        linkDireto.textContent = `${window.location.origin}${window.location.pathname}?c=${codigo}`;
        document.getElementById('codigo').value = codigo;
        document.getElementById('form-mensagem').dataset.codigo = codigo;
        document.getElementById('form-upload').dataset.codigo = codigo;
    } catch (error) {
        console.error(error);
        erro.textContent = error.message;
        erro.classList.remove('hidden');
    }
}

function setupBusca() {
    const form = document.getElementById('buscar-form');
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const codigo = form.codigo.value.trim().toUpperCase();
        if (!codigo.startsWith('KWAN-')) {
            form.codigo.value = `KWAN-${codigo.replace(/^[^A-Z0-9]+/g, '')}`;
        }
        carregarChamado(form.codigo.value.trim());
    });
}

function setupMensagem() {
    const form = document.getElementById('form-mensagem');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const codigo = form.dataset.codigo;
        const mensagem = form.mensagem.value.trim();
        if (!codigo || mensagem.length === 0) return;

        const body = new URLSearchParams();
        body.set('codigo', codigo);
        body.set('mensagem', mensagem);

        form.querySelector('button').disabled = true;
        form.querySelector('button').textContent = 'Enviando...';

        try {
            const response = await fetch(`${apiBase}/api_get.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString()
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Erro ao enviar mensagem.');
            }
            form.mensagem.value = '';
            await carregarChamado(codigo);
        } catch (error) {
            alert(error.message);
        } finally {
            form.querySelector('button').disabled = false;
            form.querySelector('button').textContent = 'Enviar mensagem';
        }
    });
}

function setupUpload() {
    const form = document.getElementById('form-upload');
    const statusEl = document.getElementById('upload-status');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const codigo = form.dataset.codigo;
        if (!codigo) {
            alert('Carregue um chamado antes de enviar anexos.');
            return;
        }

        const formData = new FormData(form);
        formData.append('codigo', codigo);

        statusEl.textContent = 'Enviando arquivo...';

        try {
            const response = await fetch(`${apiBase}/upload.php`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Erro ao enviar arquivo.');
            }
            statusEl.textContent = 'Arquivo enviado com sucesso!';
            form.reset();
            await carregarChamado(codigo);
        } catch (error) {
            statusEl.textContent = error.message;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupBusca();
    setupMensagem();
    setupUpload();

    const urlParams = new URLSearchParams(window.location.search);
    const codigo = urlParams.get('c');
    if (codigo) {
        document.getElementById('codigo').value = codigo;
        carregarChamado(codigo);
    }
});
