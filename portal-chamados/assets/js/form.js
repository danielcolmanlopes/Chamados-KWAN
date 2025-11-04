document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-chamado');
    const msgBox = document.getElementById('msg');

    const basePath = window.PORTAL_BASE_PATH || (window.location.pathname.includes('/portal-chamados/') ? '' : 'portal-chamados/');
    const apiUrl = `${basePath}backend/api.php`;
    const usePhpRoutes = basePath !== '';
    const acompanharPage = usePhpRoutes ? 'acompanhar.php' : 'acompanhar.html';

    let floatingMessageTimeout = null;

    const ensureFloatingAlert = () => {
        let element = document.getElementById('floating-alert');
        if (!element) {
            element = document.createElement('div');
            element.id = 'floating-alert';
            element.className = 'floating-alert hidden';
            element.setAttribute('role', 'alert');
            element.setAttribute('aria-live', 'assertive');
            document.body.appendChild(element);
        }
        return element;
    };

    const hideFloatingAlert = (element) => {
        if (!element) {
            return;
        }
        element.classList.remove('visible');
        const handleTransitionEnd = () => {
            element.classList.add('hidden');
            element.removeEventListener('transitionend', handleTransitionEnd);
        };
        element.addEventListener('transitionend', handleTransitionEnd, { once: true });
    };

    const showFloatingAlert = (message, type) => {
        const element = ensureFloatingAlert();
        element.className = `floating-alert alert ${type}`;
        element.innerHTML = message;
        element.classList.remove('hidden');

        element.classList.remove('visible');
        element.offsetHeight;
        element.classList.add('visible');

        if (floatingMessageTimeout) {
            window.clearTimeout(floatingMessageTimeout);
        }

        floatingMessageTimeout = window.setTimeout(() => {
            hideFloatingAlert(element);
        }, 6000);
    };

    const showMessage = (message, type = 'success') => {
        msgBox.className = `alert ${type}`;
        msgBox.innerHTML = message;
        msgBox.classList.remove('hidden');
        msgBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showFloatingAlert(message, type);
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

            const rawBody = await response.text();
            let data = null;

            if (rawBody) {
                try {
                    data = JSON.parse(rawBody);
                } catch (parseError) {
                    console.error('Resposta não está em JSON válido.', parseError);
                }
            }

            if (!response.ok || !data?.success) {
                const errorMessage = data?.message || rawBody || 'Não foi possível registrar o chamado.';
                throw new Error(errorMessage.trim());
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
