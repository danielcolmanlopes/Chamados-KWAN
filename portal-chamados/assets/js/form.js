document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-chamado');
    const msgBox = document.getElementById('msg');

    const showMessage = (message, type = 'success') => {
        msgBox.className = `alert ${type}`;
        msgBox.textContent = message;
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
            const response = await fetch('backend/api.php', {
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

            const link = `acompanhar.html?c=${encodeURIComponent(data.codigo)}`;
            showMessage(`Chamado registrado com sucesso! Código: ${data.codigo}. <a href="${link}">Clique aqui para acompanhar</a>.`, 'success');
        } catch (error) {
            console.error(error);
            showMessage(error.message || 'Erro inesperado ao enviar o chamado.', 'error');
        }
    });
});
