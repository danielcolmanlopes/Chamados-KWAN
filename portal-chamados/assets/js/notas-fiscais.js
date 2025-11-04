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
    const applyButtons = Array.from(document.querySelectorAll('[data-apply-ocr]'));
    const rawPreview = document.getElementById('ocr-preview');
    const rawDetails = document.getElementById('ocr-raw');
    const totalDisplay = document.getElementById('nf-total-display');
    const totalInput = document.getElementById('valor_total');
    const batchButton = document.getElementById('btn-add-to-batch');
    const exportButton = document.getElementById('btn-export-xml');
    const batchListBody = document.getElementById('batch-list-body');
    const batchEmptyState = document.getElementById('batch-empty-state');
    const batchCounter = document.getElementById('batch-counter');

    if (!form || !container || !template || !addButton) {
        return;
    }

    let extractedData = null;
    let rawText = '';
    let currentTotal = 0;
    const invoiceBatch = [];
    let invoiceCounter = 0;

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

    const setApplyButtonsState = (enabled) => {
        if (!applyButtons.length) {
            return;
        }
        applyButtons.forEach((button) => {
            button.disabled = !enabled;
        });
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
        setApplyButtonsState(false);
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

    const toDisplayDocument = (value) => {
        if (value === null || value === undefined) {
            return '';
        }
        const digits = String(value).replace(/\D/g, '');
        if (!digits) {
            return '';
        }
        if (digits.length === 14) {
            return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        }
        if (digits.length === 11) {
            return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }
        return digits;
    };

    const normalizeDocument = (value) => {
        if (value === null || value === undefined) {
            return '';
        }
        return String(value).replace(/\D/g, '');
    };

    const calculateItemsTotal = (items) => {
        if (!Array.isArray(items) || !items.length) {
            return null;
        }
        const total = items.reduce((accumulator, item) => {
            const quantity = parseDecimal(item?.quantidade ?? item?.qtd ?? '');
            const unitValue = parseDecimal(item?.valor_unitario ?? item?.valorUnitario ?? '');
            if (quantity === null || unitValue === null) {
                return accumulator;
            }
            return accumulator + quantity * unitValue;
        }, 0);
        if (!Number.isFinite(total) || total <= 0) {
            return null;
        }
        return total;
    };

    const calculateTotal = (fallback = null) => {
        let total = 0;
        container.querySelectorAll('.nf-item').forEach((item) => {
            const quantityInput = item.querySelector('[data-name="quantidade"]');
            const unitInput = item.querySelector('[data-name="valor_unitario"]');
            if (!(quantityInput instanceof HTMLInputElement) || !(unitInput instanceof HTMLInputElement)) {
                return;
            }
            const quantity = parseDecimal(quantityInput.value);
            const unitValue = parseDecimal(unitInput.value);
            if (quantity === null || unitValue === null) {
                return;
            }
            total += quantity * unitValue;
        });

        if (total <= 0 && fallback !== null) {
            const fallbackNumber = parseDecimal(fallback);
            if (fallbackNumber !== null && fallbackNumber > 0) {
                total = fallbackNumber;
            }
        }

        if (!Number.isFinite(total) || total < 0) {
            total = 0;
        }

        currentTotal = total;

        if (totalDisplay) {
            totalDisplay.textContent = total > 0 ? toDisplayCurrency(total) : 'R$ 0,00';
        }

        if (totalInput) {
            totalInput.value = total > 0 ? total.toFixed(2) : '';
        }

        return total;
    };

    const escapeXml = (value) => {
        if (value === null || value === undefined) {
            return '';
        }
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    };

    const formatNumberForXml = (value) => {
        const parsed = parseDecimal(value);
        if (parsed === null || !Number.isFinite(parsed)) {
            return '0.00';
        }
        return parsed.toFixed(2);
    };

    const checkBatchButton = () => {
        if (!batchButton) {
            return;
        }

        const formData = new FormData(form);
        const requiredFields = ['numero_nf', 'emitente_nome', 'emitente_cnpj', 'destinatario_nome', 'destinatario_cnpj'];
        const hasRequiredFields = requiredFields.every((field) => {
            const value = formData.get(field);
            return value && String(value).trim();
        });

        const items = Array.from(container.querySelectorAll('.nf-item'));
        if (!items.length) {
            batchButton.disabled = true;
            return;
        }

        const allItemsValid = items.every((item) => {
            const descricao = item.querySelector('[data-name="descricao"]');
            const quantidade = item.querySelector('[data-name="quantidade"]');
            const valorUnitario = item.querySelector('[data-name="valor_unitario"]');
            if (!(descricao instanceof HTMLInputElement) || !(quantidade instanceof HTMLInputElement) || !(valorUnitario instanceof HTMLInputElement)) {
                return false;
            }
            if (!descricao.value.trim()) {
                return false;
            }
            const quantidadeValor = parseDecimal(quantidade.value);
            const unitarioValor = parseDecimal(valorUnitario.value);
            return quantidadeValor !== null && unitarioValor !== null;
        });

        batchButton.disabled = !(hasRequiredFields && allItemsValid);
    };

    const gatherFormData = () => {
        const formData = new FormData(form);
        const getValue = (name) => (formData.get(name) ?? '').toString().trim();

        const requiredFields = ['numero_nf', 'emitente_nome', 'emitente_cnpj', 'destinatario_nome', 'destinatario_cnpj'];
        const missingField = requiredFields.find((field) => !getValue(field));
        if (missingField) {
            showMessage('Preencha os campos obrigatórios antes de adicionar ao lote.', 'error');
            return null;
        }

        const itens = [];
        container.querySelectorAll('.nf-item').forEach((item) => {
            const descricao = item.querySelector('[data-name="descricao"]');
            const quantidade = item.querySelector('[data-name="quantidade"]');
            const valorUnitario = item.querySelector('[data-name="valor_unitario"]');
            if (!(descricao instanceof HTMLInputElement) || !(quantidade instanceof HTMLInputElement) || !(valorUnitario instanceof HTMLInputElement)) {
                return;
            }
            if (!descricao.value.trim()) {
                return;
            }
            const quantidadeValor = parseDecimal(quantidade.value);
            const unitarioValor = parseDecimal(valorUnitario.value);
            if (quantidadeValor === null || unitarioValor === null) {
                return;
            }
            itens.push({
                descricao: descricao.value.trim(),
                quantidade: quantidadeValor,
                valor_unitario: unitarioValor,
            });
        });

        if (!itens.length) {
            showMessage('Adicione ao menos um item válido à nota fiscal.', 'error');
            return null;
        }

        const total = calculateTotal(formData.get('valor_total'));

        const emitenteDocumento = normalizeDocument(getValue('emitente_cnpj'));
        const destinatarioDocumento = normalizeDocument(getValue('destinatario_cnpj'));

        return {
            numero_nf: getValue('numero_nf'),
            serie: getValue('serie'),
            data_emissao: getValue('data_emissao'),
            estado_emissor: getValue('estado_emissor'),
            transportadora: getValue('transportadora'),
            percentual_icms: getValue('percentual_icms'),
            valor_icms: getValue('valor_icms'),
            percentual_ipi: getValue('percentual_ipi'),
            valor_ipi: getValue('valor_ipi'),
            emitente_nome: getValue('emitente_nome'),
            emitente_cnpj: emitenteDocumento,
            emitente_cnpj_display: toDisplayDocument(emitenteDocumento) || getValue('emitente_cnpj'),
            destinatario_nome: getValue('destinatario_nome'),
            destinatario_cnpj: destinatarioDocumento,
            destinatario_cnpj_display: toDisplayDocument(destinatarioDocumento) || getValue('destinatario_cnpj'),
            valor_total: Number.isFinite(total) ? Number(total.toFixed(2)) : 0,
            itens,
        };
    };

    const renderBatchTable = () => {
        if (!batchListBody) {
            return;
        }

        batchListBody.querySelectorAll('tr:not(#batch-empty-state)').forEach((row) => row.remove());

        if (!invoiceBatch.length) {
            if (batchEmptyState) {
                batchEmptyState.classList.remove('hidden');
            }
        } else {
            if (batchEmptyState) {
                batchEmptyState.classList.add('hidden');
            }

            invoiceBatch.forEach((invoice) => {
                const row = document.createElement('tr');
                row.dataset.id = invoice.id;

                const nfCell = document.createElement('td');
                nfCell.innerHTML = `
                    <div class="batch-nf">
                        <strong>${escapeXml(invoice.numero_nf || '-')}</strong>
                        <span class="muted">${[
                            invoice.serie ? `Série ${escapeXml(invoice.serie)}` : '',
                            invoice.data_emissao ? `Emitida em ${formatDateDisplay(invoice.data_emissao)}` : '',
                        ]
                            .filter(Boolean)
                            .join(' • ')}</span>
                    </div>
                `;

                const emitenteCell = document.createElement('td');
                emitenteCell.innerHTML = `
                    <div class="batch-entity">
                        <strong>${escapeXml(invoice.emitente_nome || '-')}</strong>
                        <span class="muted">${escapeXml(invoice.emitente_cnpj_display || '')}</span>
                    </div>
                `;

                const destinatarioCell = document.createElement('td');
                destinatarioCell.innerHTML = `
                    <div class="batch-entity">
                        <strong>${escapeXml(invoice.destinatario_nome || '-')}</strong>
                        <span class="muted">${escapeXml(invoice.destinatario_cnpj_display || '')}</span>
                    </div>
                `;

                const valorCell = document.createElement('td');
                valorCell.className = 'batch-value';
                valorCell.textContent = toDisplayCurrency(invoice.valor_total) || 'R$ 0,00';

                const actionsCell = document.createElement('td');
                const removeButton = document.createElement('button');
                removeButton.type = 'button';
                removeButton.className = 'btn-text remove-from-batch';
                removeButton.dataset.id = invoice.id;
                removeButton.textContent = 'Remover';
                actionsCell.append(removeButton);

                row.append(nfCell, emitenteCell, destinatarioCell, valorCell, actionsCell);
                batchListBody.append(row);
            });
        }

        if (batchCounter) {
            const count = invoiceBatch.length;
            batchCounter.textContent = count === 1 ? '1 nota' : `${count} notas`;
        }

        if (exportButton) {
            exportButton.disabled = invoiceBatch.length === 0;
        }
    };

    const exportBatchToXml = () => {
        if (!invoiceBatch.length) {
            showMessage('Adicione ao menos uma nota ao lote antes de exportar.', 'error');
            return;
        }

        const xmlLines = ['<?xml version="1.0" encoding="UTF-8"?>', '<notasFiscais xmlns="https://kwansolucoes.com.br/nfe/lote">'];

        invoiceBatch.forEach((invoice) => {
            xmlLines.push(`  <notaFiscal id="${escapeXml(invoice.id)}">`);
            xmlLines.push('    <identificacao>');
            xmlLines.push(`      <numero>${escapeXml(invoice.numero_nf)}</numero>`);
            if (invoice.serie) {
                xmlLines.push(`      <serie>${escapeXml(invoice.serie)}</serie>`);
            }
            if (invoice.data_emissao) {
                xmlLines.push(`      <dataEmissao>${escapeXml(invoice.data_emissao)}</dataEmissao>`);
            }
            if (invoice.estado_emissor) {
                xmlLines.push(`      <estadoEmissor>${escapeXml(invoice.estado_emissor)}</estadoEmissor>`);
            }
            if (invoice.transportadora) {
                xmlLines.push(`      <transportadora>${escapeXml(invoice.transportadora)}</transportadora>`);
            }
            xmlLines.push('    </identificacao>');

            xmlLines.push('    <emitente>');
            xmlLines.push(`      <nome>${escapeXml(invoice.emitente_nome)}</nome>`);
            if (invoice.emitente_cnpj) {
                xmlLines.push(`      <documento>${escapeXml(invoice.emitente_cnpj)}</documento>`);
            }
            xmlLines.push('    </emitente>');

            xmlLines.push('    <destinatario>');
            xmlLines.push(`      <nome>${escapeXml(invoice.destinatario_nome)}</nome>`);
            if (invoice.destinatario_cnpj) {
                xmlLines.push(`      <documento>${escapeXml(invoice.destinatario_cnpj)}</documento>`);
            }
            xmlLines.push('    </destinatario>');

            xmlLines.push('    <tributos>');
            if (invoice.percentual_icms) {
                xmlLines.push(`      <percentualICMS>${escapeXml(invoice.percentual_icms)}</percentualICMS>`);
            }
            if (invoice.valor_icms) {
                xmlLines.push(`      <valorICMS>${escapeXml(invoice.valor_icms)}</valorICMS>`);
            }
            if (invoice.percentual_ipi) {
                xmlLines.push(`      <percentualIPI>${escapeXml(invoice.percentual_ipi)}</percentualIPI>`);
            }
            if (invoice.valor_ipi) {
                xmlLines.push(`      <valorIPI>${escapeXml(invoice.valor_ipi)}</valorIPI>`);
            }
            xmlLines.push('    </tributos>');

            xmlLines.push('    <itens>');
            invoice.itens.forEach((item, index) => {
                const itemTotal = (parseDecimal(item.quantidade) ?? 0) * (parseDecimal(item.valor_unitario) ?? 0);
                xmlLines.push(`      <item numero="${index + 1}">`);
                xmlLines.push(`        <descricao>${escapeXml(item.descricao)}</descricao>`);
                xmlLines.push(`        <quantidade>${formatNumberForXml(item.quantidade)}</quantidade>`);
                xmlLines.push(`        <valorUnitario>${formatNumberForXml(item.valor_unitario)}</valorUnitario>`);
                xmlLines.push(`        <valorTotal>${formatNumberForXml(itemTotal)}</valorTotal>`);
                xmlLines.push('      </item>');
            });
            xmlLines.push('    </itens>');

            xmlLines.push(`    <valorTotal>${formatNumberForXml(invoice.valor_total)}</valorTotal>`);
            xmlLines.push('  </notaFiscal>');
        });

        xmlLines.push('</notasFiscais>');

        const blob = new Blob([xmlLines.join('\n')], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
        const link = document.createElement('a');
        link.href = url;
        link.download = `notas-fiscais-lote-${timestamp}.xml`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showMessage('Lote exportado com sucesso em XML.', 'success');
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
            emitente_nome: (data?.emitente_nome ?? data?.emitenteNome ?? data?.emitente ?? '').toString().trim(),
            emitente_cnpj: (data?.emitente_cnpj ?? data?.emitenteCnpj ?? data?.cnpj_emitente ?? '').toString().trim(),
            destinatario_nome: (data?.destinatario_nome ?? data?.destinatarioNome ?? data?.destinatario ?? '').toString().trim(),
            destinatario_cnpj: (data?.destinatario_cnpj ?? data?.destinatarioCnpj ?? data?.cnpj_destinatario ?? '').toString().trim(),
            valor_total: formatDecimal(data?.valor_total ?? data?.valorTotal ?? data?.total ?? '', 2),
            itens: Array.isArray(data?.itens)
                ? data.itens.map((item) => ({
                      descricao: (item?.descricao ?? '').toString().trim(),
                      quantidade: formatDecimal(item?.quantidade ?? item?.qtd ?? '', 3),
                      valor_unitario: formatDecimal(item?.valor_unitario ?? item?.valorUnitario ?? '', 2),
                  }))
                : [],
        };

        fields.itens = fields.itens.filter((item) => item.descricao && item.quantidade !== null);

        if (fields.valor_total === null) {
            const itemsTotal = calculateItemsTotal(fields.itens);
            if (itemsTotal !== null) {
                fields.valor_total = itemsTotal.toFixed(2);
            }
        }

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
            emitente_nome: fields.emitente_nome,
            emitente_cnpj: toDisplayDocument(fields.emitente_cnpj),
            destinatario_nome: fields.destinatario_nome,
            destinatario_cnpj: toDisplayDocument(fields.destinatario_cnpj),
            valor_total: fields.valor_total !== null ? toDisplayCurrency(fields.valor_total) : '',
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
                fields.emitente_nome ||
                fields.emitente_cnpj ||
                fields.destinatario_nome ||
                fields.destinatario_cnpj ||
                fields.valor_total !== null ||
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

        const sanitizeName = (text) =>
            text
                .replace(/^[^:]*:/, '')
                .replace(/emitente|destinat[áa]rio/gi, '')
                .trim();

        const cnpjCandidates = [];
        lines.forEach((line, index) => {
            const cnpjMatch = line.match(/(?:CNPJ|CPF)[:\s-]*([0-9./-]+)/i);
            if (cnpjMatch) {
                cnpjCandidates.push({ value: cnpjMatch[1], index, line });
            }
        });

        if (cnpjCandidates[0]) {
            data.emitente_cnpj = cnpjCandidates[0].value;
            const previousLine = lines[cnpjCandidates[0].index - 1];
            if (previousLine && !/(?:CNPJ|CPF)/i.test(previousLine)) {
                data.emitente_nome = sanitizeName(previousLine);
            }
        }
        if (cnpjCandidates[1]) {
            data.destinatario_cnpj = cnpjCandidates[1].value;
            const previousLine = lines[cnpjCandidates[1].index - 1];
            if (previousLine && !/(?:CNPJ|CPF)/i.test(previousLine)) {
                data.destinatario_nome = sanitizeName(previousLine);
            }
        }

        const emitenteLine = lines.find((line) => /emitente[:\s-]/i.test(line));
        if (emitenteLine && !data.emitente_nome) {
            data.emitente_nome = sanitizeName(emitenteLine);
        }

        const destinatarioLine = lines.find((line) => /destinat[áa]rio[:\s-]/i.test(line));
        if (destinatarioLine && !data.destinatario_nome) {
            data.destinatario_nome = sanitizeName(destinatarioLine);
        }

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

        const totalMatch =
            joined.match(/valor\s+total[^0-9]*(\d+[.,]\d{2,})/i) ||
            joined.match(/total\s+da\s+nota[^0-9]*(\d+[.,]\d{2,})/i) ||
            joined.match(/v(?:l)?\.?\s*nf[^0-9]*(\d+[.,]\d{2,})/i);
        if (totalMatch) {
            data.valor_total = totalMatch[1];
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
            emitente_nome: getText('emit > xNome'),
            emitente_cnpj: getText('emit > CNPJ') || getText('emit > CPF'),
            destinatario_nome: getText('dest > xNome'),
            destinatario_cnpj: getText('dest > CNPJ') || getText('dest > CPF'),
            valor_total: getText('total > ICMSTot > vNF') || getText('total > ICMSTot > vProd'),
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
                { label: 'Emitente', value: display.emitente_nome },
                { label: 'CNPJ do emitente', value: display.emitente_cnpj },
                { label: 'Destinatário', value: display.destinatario_nome },
                { label: 'CNPJ do destinatário', value: display.destinatario_cnpj },
                { label: 'Valor total', value: display.valor_total },
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

        setApplyButtonsState(hasData);
    };

    const portalBase = window.PORTAL_BASE_PATH || (window.location.pathname.includes('/portal-chamados/') ? '' : 'portal-chamados/');
    const ocrEndpoint = `${portalBase}backend/api_nf_ocr.php`;
    const salvarEndpoint = `${portalBase}backend/api_nf.php`;

    const uploadPdfAndExtract = async (file) => {
        const formData = new FormData();
        formData.append('nf_arquivo', file);
        const response = await fetch(ocrEndpoint, {
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

        if (newItem && itemData) {
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
        calculateTotal();
        checkBatchButton();
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
        assignValue('emitente_nome', extractedData.emitente_nome ?? '');
        assignValue('emitente_cnpj', extractedData.emitente_cnpj ?? '');
        assignValue('destinatario_nome', extractedData.destinatario_nome ?? '');
        assignValue('destinatario_cnpj', extractedData.destinatario_cnpj ?? '');
        assignValue('valor_total', extractedData.valor_total ?? '');

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

        calculateTotal(extractedData.valor_total ?? null);
        checkBatchButton();
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
            calculateTotal();
            checkBatchButton();
        }
    });

    container.addEventListener('input', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) {
            return;
        }
        if (target.hasAttribute('data-name')) {
            calculateTotal();
            checkBatchButton();
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

    if (batchButton) {
        batchButton.addEventListener('click', () => {
            const invoice = gatherFormData();
            if (!invoice) {
                return;
            }
            const exists = invoiceBatch.some(
                (entry) =>
                    entry.numero_nf === invoice.numero_nf && entry.emitente_cnpj === invoice.emitente_cnpj && entry.destinatario_cnpj === invoice.destinatario_cnpj
            );
            if (exists) {
                showMessage('Esta nota fiscal já foi adicionada ao lote. Remova-a antes de incluir novamente.', 'error');
                return;
            }

            invoiceCounter += 1;
            const uniqueId = `nf-${String(invoiceCounter).padStart(3, '0')}-${Date.now()}`;
            invoiceBatch.push({ ...invoice, id: uniqueId });
            renderBatchTable();
            checkBatchButton();
            showMessage('Nota fiscal adicionada ao lote. Você pode incluir outras antes de exportar.', 'success');
        });
    }

    if (batchListBody) {
        batchListBody.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }
            if (target.classList.contains('remove-from-batch')) {
                const id = target.dataset.id;
                if (!id) {
                    return;
                }
                const index = invoiceBatch.findIndex((invoice) => invoice.id === id);
                if (index === -1) {
                    return;
                }
                invoiceBatch.splice(index, 1);
                renderBatchTable();
                showMessage('Nota fiscal removida do lote.', 'info');
            }
        });
    }

    if (exportButton) {
        exportButton.addEventListener('click', () => {
            exportBatchToXml();
        });
    }

    applyButtons.forEach((button) => {
        button.addEventListener('click', () => {
            applyExtractedData();
        });
    });

    form.addEventListener('input', () => {
        checkBatchButton();
    });

    renderBatchTable();

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
            const response = await fetch(salvarEndpoint, {
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
