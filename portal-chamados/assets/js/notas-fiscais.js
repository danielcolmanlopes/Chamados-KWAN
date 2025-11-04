document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-nota');
    const msgBox = document.getElementById('nf-msg');
    const container = document.getElementById('itens-container');
    const template = document.getElementById('item-template');
    const addButton = document.getElementById('add-item');

    const dropzone = document.getElementById('nf-dropzone');
    const fileInput = document.getElementById('nf-file');
    const ocrStatus = document.getElementById('ocr-status');
    const ocrResults = document.getElementById('ocr-results');
    const badgesList = document.getElementById('ocr-badges');
    const ocrItemsBody = document.getElementById('ocr-items-body');
    const applyButton = document.getElementById('btn-apply-ocr');
    const rawPreview = document.getElementById('ocr-preview');
    const rawDetails = document.getElementById('ocr-raw');

    if (!form || !container || !template || !addButton) {
        return;
    }

    let extractedData = null;
    let rawText = '';

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const supportedImageTypes = ['image/png', 'image/jpeg'];

    const showMessage = (message, type = 'success') => {
        msgBox.className = `alert ${type}`;
        msgBox.innerHTML = message;
        msgBox.classList.remove('hidden');
        msgBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const setStatus = (message, state = 'idle') => {
        if (!ocrStatus) {
            return;
        }
        ocrStatus.textContent = message;
        ocrStatus.dataset.state = state;
    };

    setStatus('Nenhum arquivo enviado.', 'idle');

    const resetOcr = () => {
        extractedData = null;
        rawText = '';
        if (badgesList) {
            badgesList.innerHTML = '';
        }
        if (ocrItemsBody) {
            ocrItemsBody.innerHTML = '';
        }
        if (ocrResults) {
            ocrResults.classList.add('hidden');
        }
        if (rawPreview) {
            rawPreview.textContent = '';
        }
        if (rawDetails) {
            rawDetails.classList.add('hidden');
        }
        if (applyButton) {
            applyButton.disabled = true;
        }
    };

    const parseDecimal = (value) => {
        if (value === null || value === undefined) {
            return null;
        }
        let normalized = String(value).trim();
        if (!normalized) {
            return null;
        }
        normalized = normalized.replace(/[R$%]/gi, '');
        const hasComma = normalized.includes(',');
        const hasDot = normalized.includes('.');
        if (hasComma && hasDot) {
            normalized = normalized.replace(/\./g, '').replace(',', '.');
        } else if (hasComma) {
            normalized = normalized.replace(',', '.');
        }
        normalized = normalized.replace(/\s+/g, '');
        const number = Number.parseFloat(normalized);
        if (!Number.isFinite(number)) {
            return null;
        }
        return number;
    };

    const formatDecimal = (value, decimals = 2) => {
        const number = parseDecimal(value);
        if (number === null) {
            return null;
        }
        return number.toFixed(decimals);
    };

    const parseDate = (value) => {
        if (!value) {
            return null;
        }
        const trimmed = String(value).trim();
        if (!trimmed) {
            return null;
        }
        const directIso = trimmed.match(/(\d{4}-\d{2}-\d{2})/);
        if (directIso) {
            return directIso[1];
        }
        const brMatch = trimmed.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (brMatch) {
            return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
        }
        const compact = trimmed.match(/(\d{4})(\d{2})(\d{2})/);
        if (compact) {
            return `${compact[1]}-${compact[2]}-${compact[3]}`;
        }
        const parsed = new Date(trimmed);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString().slice(0, 10);
        }
        return null;
    };

    const formatDateDisplay = (iso) => {
        if (!iso) {
            return '';
        }
        const date = new Date(`${iso}T00:00:00`);
        if (Number.isNaN(date.getTime())) {
            return '';
        }
        return new Intl.DateTimeFormat('pt-BR').format(date);
    };

    const toDisplayCurrency = (value) => {
        const number = parseDecimal(value);
        if (number === null) {
            return '';
        }
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number);
    };

    const toDisplayPercent = (value) => {
        const number = parseDecimal(value);
        if (number === null) {
            return '';
        }
        return `${number.toFixed(2)} %`;
    };

    const toDisplayQuantity = (value) => {
        const number = parseDecimal(value);
        if (number === null) {
            return '';
        }
        return number.toFixed(3);
    };

    const normalizeExtractedData = (data) => {
        const fields = {
            numero_nf: (data?.numero_nf ?? '').toString().trim(),
            serie: (data?.serie ?? '').toString().trim(),
            data_emissao: parseDate(data?.data_emissao ?? ''),
            estado_emissor: (data?.estado_emissor ?? '').toString().trim().toUpperCase().slice(0, 2),
            transportadora: (data?.transportadora ?? '').toString().trim(),
            percentual_icms: formatDecimal(data?.percentual_icms ?? data?.percentualICMS ?? '' , 4),
            valor_icms: formatDecimal(data?.valor_icms ?? data?.valorICMS ?? '', 2),
            percentual_ipi: formatDecimal(data?.percentual_ipi ?? data?.percentualIPI ?? '', 4),
            valor_ipi: formatDecimal(data?.valor_ipi ?? data?.valorIPI ?? '', 2),
            itens: Array.isArray(data?.itens)
                ? data.itens.map((item) => ({
                      descricao: (item?.descricao ?? '').toString().trim(),
                      quantidade: formatDecimal(item?.quantidade ?? item?.qtd ?? '', 3),
                      valor_unitario: formatDecimal(item?.valor_unitario ?? item?.valorUnitario ?? '', 2),
                  }))
                : [],
        };

        fields.itens = fields.itens.filter((item) => item.descricao && item.quantidade !== null);

        const display = {
            numero_nf: fields.numero_nf,
            serie: fields.serie,
            data_emissao: fields.data_emissao ? formatDateDisplay(fields.data_emissao) : '',
            estado_emissor: fields.estado_emissor,
            transportadora: fields.transportadora,
            percentual_icms: fields.percentual_icms !== null ? toDisplayPercent(fields.percentual_icms) : '',
            valor_icms: fields.valor_icms !== null ? toDisplayCurrency(fields.valor_icms) : '',
            percentual_ipi: fields.percentual_ipi !== null ? toDisplayPercent(fields.percentual_ipi) : '',
            valor_ipi: fields.valor_ipi !== null ? toDisplayCurrency(fields.valor_ipi) : '',
        };

        const itemsDisplay = fields.itens.map((item) => ({
            descricao: item.descricao,
            quantidade: item.quantidade !== null ? toDisplayQuantity(item.quantidade) : '',
            valor_unitario: item.valor_unitario !== null ? toDisplayCurrency(item.valor_unitario) : '',
        }));

        const hasData = Boolean(
            fields.numero_nf ||
                fields.serie ||
                fields.data_emissao ||
                fields.estado_emissor ||
                fields.transportadora ||
                fields.percentual_icms !== null ||
                fields.valor_icms !== null ||
                fields.percentual_ipi !== null ||
                fields.valor_ipi !== null ||
                fields.itens.length
        );

        return { fields, display, itemsDisplay, hasData };
    };

    const parseInvoiceText = (text) => {
        if (!text) {
            return { itens: [] };
        }

        const cleaned = text.replace(/\r/g, '\n');
        const lines = cleaned
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
        const joined = lines.join(' ');

        const data = { itens: [] };

        const nfMatch = joined.match(/(?:NF[-\s]?E?|NOTA\s+FISCAL)[^0-9]*(\d{3,})/i);
        if (nfMatch) {
            data.numero_nf = nfMatch[1];
        }

        const serieMatch = joined.match(/S[ée]rie\s*[:#-]?\s*([A-Z0-9]{1,4})/i);
        if (serieMatch) {
            data.serie = serieMatch[1];
        }

        for (const line of lines) {
            const parsedDate = parseDate(line);
            if (parsedDate) {
                data.data_emissao = parsedDate;
                break;
            }
        }

        const estadoMatch = joined.match(/UF\s*[:#-]?\s*([A-Z]{2})/);
        if (estadoMatch) {
            data.estado_emissor = estadoMatch[1];
        }

        const transporteLine = lines.find((line) => /transportador|transportadora|transporte/i.test(line));
        if (transporteLine) {
            const transMatch = transporteLine.match(/transportadora[:\s-]*(.+)/i);
            data.transportadora = transMatch ? transMatch[1] : transporteLine.replace(/transportadora/i, '').trim();
        }

        const icmsPercentMatch = joined.match(/ICMS[^%0-9]*(\d{1,3}[,.]\d{1,4})\s*%/i);
        if (icmsPercentMatch) {
            data.percentual_icms = icmsPercentMatch[1];
        }

        const icmsValueMatch = joined.match(/(?:VALOR\s+DO\s+)?ICMS[^0-9]*(\d+[.,]\d{2,})/i);
        if (icmsValueMatch) {
            data.valor_icms = icmsValueMatch[1];
        }

        const ipiPercentMatch = joined.match(/IPI[^%0-9]*(\d{1,3}[,.]\d{1,4})\s*%/i);
        if (ipiPercentMatch) {
            data.percentual_ipi = ipiPercentMatch[1];
        }

        const ipiValueMatch = joined.match(/(?:VALOR\s+DO\s+)?IPI[^0-9]*(\d+[.,]\d{2,})/i);
        if (ipiValueMatch) {
            data.valor_ipi = ipiValueMatch[1];
        }

        const itemRegex = /^(\d{1,3})\s+(.+?)\s+(\d+(?:[.,]\d{1,3}))\s+(?:UN|UND|UNID|PC|KG|LT|CX|DZ|SC|M|MT|PCT|ROL)?\s+(\d+(?:[.,]\d{1,4}))/i;
        lines.forEach((line) => {
            const match = line.match(itemRegex);
            if (match) {
                data.itens.push({
                    descricao: match[2],
                    quantidade: match[3],
                    valor_unitario: match[4],
                });
            }
        });

        if (data.itens.length === 0) {
            const blockItems = cleaned.split(/ITEM\s+\d+/i).slice(1);
            blockItems.forEach((block) => {
                const linhas = block.split('\n').map((line) => line.trim()).filter(Boolean);
                if (!linhas.length) {
                    return;
                }
                const descricao = linhas[0];
                const quantidadeLinha = linhas.find((linha) => /Qtd|Quantidade/i.test(linha));
                const valorLinha = linhas.find((linha) => /Valor\s+Unit/i.test(linha));
                const quantidadeMatch = quantidadeLinha?.match(/([0-9]+[.,][0-9]+)/);
                const valorMatch = valorLinha?.match(/([0-9]+[.,][0-9]+)/);
                if (descricao && (quantidadeMatch || valorMatch)) {
                    data.itens.push({
                        descricao,
                        quantidade: quantidadeMatch ? quantidadeMatch[1] : '',
                        valor_unitario: valorMatch ? valorMatch[1] : '',
                    });
                }
            });
        }

        return data;
    };

    const parseXmlContent = (xmlString) => {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlString, 'application/xml');
        if (xml.querySelector('parsererror')) {
            throw new Error('Não foi possível ler o XML informado. Verifique o arquivo.');
        }

        const infNFe = xml.querySelector('infNFe');
        if (!infNFe) {
            throw new Error('Estrutura da NF-e não encontrada no XML enviado.');
        }

        const getText = (selector, context = infNFe) => context?.querySelector(selector)?.textContent?.trim() ?? '';

        const data = {
            numero_nf: getText('ide > nNF'),
            serie: getText('ide > serie'),
            data_emissao: getText('ide > dhEmi') || getText('ide > dEmi'),
            estado_emissor: getText('emit > enderEmit > UF'),
            transportadora: getText('transp > transporta > xNome'),
            valor_icms: getText('total > ICMSTot > vICMS'),
            valor_ipi: getText('total > ICMSTot > vIPI'),
            itens: [],
        };

        const firstDet = infNFe.querySelector('det');
        if (firstDet) {
            const icmsRoot = firstDet.querySelector('imposto > ICMS');
            if (icmsRoot) {
                const icmsChild = Array.from(icmsRoot.children)[0];
                if (icmsChild) {
                    data.percentual_icms = getText('pICMS', icmsChild);
                }
            }
            const ipiRoot = firstDet.querySelector('imposto > IPI');
            if (ipiRoot) {
                const ipiNode = ipiRoot.querySelector('IPITrib') || ipiRoot.querySelector('IPINT') || ipiRoot;
                data.percentual_ipi = getText('pIPI', ipiNode);
                if (!data.valor_ipi) {
                    data.valor_ipi = getText('vIPI', ipiNode);
                }
            }
        }

        infNFe.querySelectorAll('det').forEach((det) => {
            const descricao = getText('prod > xProd', det);
            const quantidade = getText('prod > qCom', det);
            const valorUnitario = getText('prod > vUnCom', det);
            if (descricao) {
                data.itens.push({
                    descricao,
                    quantidade,
                    valor_unitario: valorUnitario,
                });
            }
        });

        return { data, raw: xmlString };
    };

    const renderOcrResults = (normalized, raw) => {
        const { display, itemsDisplay, hasData } = normalized;

        if (badgesList) {
            badgesList.innerHTML = '';
            const entries = [
                { label: 'Número da NF', value: display.numero_nf },
                { label: 'Série', value: display.serie },
                { label: 'Data de emissão', value: display.data_emissao },
                { label: 'Estado emissor', value: display.estado_emissor },
                { label: 'Transportadora', value: display.transportadora },
                { label: 'Percentual ICMS', value: display.percentual_icms },
                { label: 'Valor ICMS', value: display.valor_icms },
                { label: 'Percentual IPI', value: display.percentual_ipi },
                { label: 'Valor IPI', value: display.valor_ipi },
            ].filter((entry) => entry.value);

            if (!entries.length) {
                const dt = document.createElement('dt');
                dt.textContent = 'Informações';
                const dd = document.createElement('dd');
                dd.textContent = 'Nenhum campo identificado automaticamente.';
                badgesList.append(dt, dd);
            } else {
                entries.forEach((entry) => {
                    const dt = document.createElement('dt');
                    dt.textContent = entry.label;
                    const dd = document.createElement('dd');
                    dd.textContent = entry.value;
                    badgesList.append(dt, dd);
                });
            }
        }

        if (ocrItemsBody) {
            ocrItemsBody.innerHTML = '';
            if (!itemsDisplay.length) {
                const emptyRow = document.createElement('tr');
                const cell = document.createElement('td');
                cell.colSpan = 3;
                cell.className = 'muted';
                cell.textContent = 'Nenhum item identificado automaticamente.';
                emptyRow.append(cell);
                ocrItemsBody.append(emptyRow);
            } else {
                itemsDisplay.forEach((item) => {
                    const row = document.createElement('tr');
                    const descricao = document.createElement('td');
                    descricao.textContent = item.descricao;
                    const qtd = document.createElement('td');
                    qtd.textContent = item.quantidade;
                    const valor = document.createElement('td');
                    valor.textContent = item.valor_unitario;
                    row.append(descricao, qtd, valor);
                    ocrItemsBody.append(row);
                });
            }
        }

        if (ocrResults) {
            ocrResults.classList.remove('hidden');
        }

        if (rawPreview) {
            rawPreview.textContent = (raw || '').trim();
        }
        if (rawDetails) {
            rawDetails.classList.toggle('hidden', !rawPreview || !rawPreview.textContent);
        }

        if (applyButton) {
            applyButton.disabled = !hasData;
        }
    };

    const uploadPdfAndExtract = async (file) => {
        const formData = new FormData();
        formData.append('nf_arquivo', file);
        const response = await fetch('backend/api_nf_ocr.php', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json().catch(() => ({ success: false }));
        if (!response.ok || !data?.success) {
            throw new Error(data?.message || 'Não foi possível processar o PDF enviado.');
        }
        return data.text || '';
    };

    const readFileAsDataURL = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Falha ao ler o arquivo local.'));
            reader.readAsDataURL(file);
        });

    const processImageWithTesseract = async (file) => {
        if (typeof Tesseract === 'undefined') {
            throw new Error('Biblioteca de OCR não carregada. Atualize a página e tente novamente.');
        }
        const dataUrl = await readFileAsDataURL(file);
        let lastProgress = 0;
        const result = await Tesseract.recognize(dataUrl, 'por', {
            logger: (info) => {
                if (info.status === 'recognizing text') {
                    const percent = Math.round((info.progress || 0) * 100);
                    if (percent !== lastProgress) {
                        setStatus(`Lendo imagem... ${percent}%`, 'loading');
                        lastProgress = percent;
                    }
                }
            },
        });
        return result?.data?.text ?? '';
    };

    const handleFileSelection = async (file) => {
        if (!file) {
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            setStatus('O arquivo excede o limite de 10MB.', 'error');
            return;
        }

        resetOcr();
        setStatus('Processando arquivo, aguarde...', 'loading');

        try {
            let raw;
            let baseData;

            if (file.name.toLowerCase().endsWith('.xml') || file.type === 'text/xml') {
                const xmlString = await file.text();
                const parsed = parseXmlContent(xmlString);
                raw = xmlString;
                baseData = parsed.data;
            } else if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
                raw = await uploadPdfAndExtract(file);
                baseData = parseInvoiceText(raw);
            } else if (supportedImageTypes.includes(file.type) || /\.(jpe?g|png)$/i.test(file.name)) {
                raw = await processImageWithTesseract(file);
                baseData = parseInvoiceText(raw);
            } else {
                throw new Error('Formato de arquivo não suportado. Utilize PDF, XML, JPG ou PNG.');
            }

            rawText = raw || '';
            const normalized = normalizeExtractedData(baseData);
            extractedData = normalized.fields;
            renderOcrResults(normalized, rawText);

            if (normalized.hasData) {
                setStatus('Leitura concluída. Revise os dados antes de aplicar.', 'success');
            } else {
                setStatus('Arquivo processado, mas nenhum dado relevante foi identificado automaticamente.', 'error');
            }
        } catch (error) {
            console.error(error);
            resetOcr();
            setStatus(error.message || 'Não foi possível processar o arquivo enviado.', 'error');
        }
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

    const addItem = (itemData = null) => {
        const fragment = template.content.cloneNode(true);
        const newItem = fragment.querySelector('.nf-item');
        if (itemData && newItem) {
            const descricaoInput = newItem.querySelector('[data-name="descricao"]');
            const quantidadeInput = newItem.querySelector('[data-name="quantidade"]');
            const valorUnitarioInput = newItem.querySelector('[data-name="valor_unitario"]');
            if (descricaoInput) {
                descricaoInput.value = itemData.descricao ?? '';
            }
            if (quantidadeInput) {
                quantidadeInput.value = itemData.quantidade ?? '';
            }
            if (valorUnitarioInput) {
                valorUnitarioInput.value = itemData.valor_unitario ?? '';
            }
        }
        container.appendChild(fragment);
        reindexItems();
        updateRemoveButtons();
    };

    const applyExtractedData = () => {
        if (!extractedData) {
            showMessage('Nenhum dado foi extraído para aplicar.', 'error');
            return;
        }

        const assignValue = (name, value) => {
            const field = form.elements.namedItem(name);
            if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
                field.value = value ?? '';
            }
        };

        assignValue('numero_nf', extractedData.numero_nf);
        assignValue('serie', extractedData.serie);
        assignValue('data_emissao', extractedData.data_emissao ?? '');
        assignValue('transportadora', extractedData.transportadora);
        assignValue('percentual_icms', extractedData.percentual_icms ?? '');
        assignValue('valor_icms', extractedData.valor_icms ?? '');
        assignValue('percentual_ipi', extractedData.percentual_ipi ?? '');
        assignValue('valor_ipi', extractedData.valor_ipi ?? '');

        const estadoSelect = form.elements.namedItem('estado_emissor');
        if (estadoSelect instanceof HTMLSelectElement && extractedData.estado_emissor) {
            estadoSelect.value = extractedData.estado_emissor;
        }

        container.innerHTML = '';
        if (extractedData.itens && extractedData.itens.length) {
            extractedData.itens.forEach((item) => {
                addItem({
                    descricao: item.descricao,
                    quantidade: item.quantidade ?? '',
                    valor_unitario: item.valor_unitario ?? '',
                });
            });
        } else {
            addItem();
        }

        showMessage('Campos preenchidos com os dados importados. Revise antes de salvar.', 'success');
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

    if (dropzone && fileInput) {
        dropzone.addEventListener('click', () => {
            fileInput.click();
        });

        ['dragenter', 'dragover'].forEach((eventName) => {
            dropzone.addEventListener(eventName, (event) => {
                event.preventDefault();
                dropzone.classList.add('dragover');
            });
        });

        ['dragleave', 'dragend', 'drop'].forEach((eventName) => {
            dropzone.addEventListener(eventName, (event) => {
                if (event.type !== 'drop') {
                    event.preventDefault();
                }
                dropzone.classList.remove('dragover');
            });
        });

        dropzone.addEventListener('drop', (event) => {
            event.preventDefault();
            const files = event.dataTransfer?.files;
            if (files && files.length) {
                const dt = new DataTransfer();
                dt.items.add(files[0]);
                fileInput.files = dt.files;
                handleFileSelection(files[0]);
            }
        });

        fileInput.addEventListener('change', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement) || !target.files?.length) {
                return;
            }
            handleFileSelection(target.files[0]);
        });
    }

    if (applyButton) {
        applyButton.addEventListener('click', () => {
            applyExtractedData();
        });
    }

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
            resetOcr();
            setStatus('Nenhum arquivo enviado.', 'idle');
        } catch (error) {
            console.error(error);
            showMessage(error.message || 'Erro inesperado ao salvar a nota fiscal.', 'error');
        }
    });
});
