document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-nota');
    const msgBox = document.getElementById('nf-msg');
    const container = document.getElementById('itens-container');
    const template = document.getElementById('item-template');
    const addButton = document.getElementById('add-item');

    if (!form || !container || !template || !addButton) {
        return;
    }

    const showMessage = (message, type = 'success') => {
        msgBox.className = `alert ${type}`;
        msgBox.innerHTML = message;
        msgBox.classList.remove('hidden');
        msgBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const reindexItems = () => {
        const items = container.querySelectorAll('.nf-item');
        items.forEach((item, index) => {
            item.dataset.index = index;
            item.querySelectorAll('[data-name]').forEach((input) => {
                const fieldName = input.getAttribute('data-name');
                input.setAttribute('name', `itens[${index}][${fieldName}]`);
            });
        });
    };

    const updateRemoveButtons = () => {
        const items = container.querySelectorAll('.nf-item');
        const disableRemoval = items.length <= 1;
        items.forEach((item) => {
            const removeButton = item.querySelector('.remove-item');
            if (!removeButton) {
                return;
            }
            removeButton.disabled = disableRemoval;
            removeButton.classList.toggle('disabled', disableRemoval);
        });
    };

    const addItem = () => {
        const fragment = template.content.cloneNode(true);
        container.appendChild(fragment);
        reindexItems();
        updateRemoveButtons();
    };

    addButton.addEventListener('click', () => {
        addItem();
    });

    container.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }
        if (target.classList.contains('remove-item')) {
            const item = target.closest('.nf-item');
            if (!item) {
                return;
            }
            if (container.querySelectorAll('.nf-item').length <= 1) {
                return;
            }
            item.remove();
            reindexItems();
            updateRemoveButtons();
        }
    });

    addItem();

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const items = container.querySelectorAll('.nf-item');
        if (!items.length) {
            showMessage('Adicione pelo menos um item à nota fiscal.', 'error');
            return;
        }

        showMessage('Salvando nota fiscal, aguarde...', 'info');

        const formData = new FormData(form);

        try {
            const response = await fetch('backend/api_nf.php', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Não foi possível salvar a nota fiscal.');
            }

            form.reset();
            container.innerHTML = '';
            addItem();
            showMessage('Nota fiscal registrada com sucesso!', 'success');
        } catch (error) {
            console.error(error);
            showMessage(error.message || 'Erro inesperado ao salvar a nota fiscal.', 'error');
        }
    });
});
