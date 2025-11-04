document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-chamado');
    const msgBox = document.getElementById('msg');

    const basePath = window.PORTAL_BASE_PATH || (window.location.pathname.includes('/portal-chamados/') ? '' : 'portal-chamados/');
    const apiUrl = `${basePath}backend/api.php`;
    const usePhpRoutes = basePath !== '';
    const acompanharPage = usePhpRoutes ? 'acompanhar.php' : 'acompanhar.html';

    const showMessage = (message, type = 'success') => {
        msgBox.className = `alert ${type}`;
        msgBox.innerHTML = message;
        msgBox.classList.remove('hidden');
        msgBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        msgBox.className = 'alert info';
        msgBox.textContent = 'Enviando chamado, aguarde...';
        msgBox.classList.remove('hidden');

        const formData = new FormData(form);

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Não foi possível registrar o chamado.');
            }

            form.reset();
            if (typeof grecaptcha !== 'undefined') {
                grecaptcha.reset();
            }

            const link = `${acompanharPage}?c=${encodeURIComponent(data.codigo)}`;
            showMessage(`Chamado registrado com sucesso! Código: ${data.codigo}. <a href="${link}">Clique aqui para acompanhar</a>.`, 'success');
        } catch (error) {
            console.error(error);
            showMessage(error.message || 'Erro inesperado ao enviar o chamado.', 'error');
        }
    });
});
