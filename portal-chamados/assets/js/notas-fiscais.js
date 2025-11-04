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
    const exportExcelButton = document.getElementById('btn-export-excel');
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

    const extractKwanCodeFromText = (value) => {
        if (value === null || value === undefined) {
            return '';
        }
        const text = String(value).toUpperCase();
        const match = text.match(/KWAN[\s:_-]*([0-9][0-9A-Z\/.\-]*)/);
        if (!match) {
            return '';
        }
        const digits = match[1].replace(/\D/g, '');
        if (!digits) {
            return '';
        }
        return `KWAN-${digits}`;
    };

    const normalizeOrderValue = (value) => {
        if (value === null || value === undefined) {
            return '';
        }
        const trimmed = String(value).trim();
        if (!trimmed) {
            return '';
        }
        const normalized = trimmed
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase();
        const sanitized = normalized.replace(/[^A-Z0-9/_-]+/g, '');
        return sanitized;
    };

    const normalizeKwanCodeValue = (value) => {
        if (value === null || value === undefined) {
            return '';
        }
        const trimmed = String(value).trim();
        if (!trimmed) {
            return '';
        }
        const extracted = extractKwanCodeFromText(trimmed);
        if (extracted) {
            return extracted;
        }
        const digits = trimmed.replace(/\D/g, '');
        if (!digits) {
            return '';
        }
        return `KWAN-${digits}`;
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

    const gatherFormData = ({ silent = false } = {}) => {
        const formData = new FormData(form);
        const getValue = (name) => (formData.get(name) ?? '').toString().trim();
        const respondWithError = (message) => {
            if (!silent) {
                showMessage(message, 'error');
            }
            return { success: false, error: message };
        };

        const requiredFields = ['numero_nf', 'emitente_nome', 'emitente_cnpj', 'destinatario_nome', 'destinatario_cnpj'];
        const missingField = requiredFields.find((field) => !getValue(field));
        if (missingField) {
            return respondWithError('Preencha os campos obrigatórios antes de adicionar ao lote.');
        }

        const itens = [];
        container.querySelectorAll('.nf-item').forEach((item) => {
            const descricao = item.querySelector('[data-name="descricao"]');
            const quantidade = item.querySelector('[data-name="quantidade"]');
            const valorUnitario = item.querySelector('[data-name="valor_unitario"]');
            const pedido = item.querySelector('[data-name="pedido"]');
            if (
                !(descricao instanceof HTMLInputElement) ||
                !(quantidade instanceof HTMLInputElement) ||
                !(valorUnitario instanceof HTMLInputElement)
            ) {
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
                pedido: pedido instanceof HTMLInputElement ? normalizeOrderValue(pedido.value) || null : null,
            });
        });

        if (!itens.length) {
            return respondWithError('Adicione ao menos um item válido à nota fiscal.');
        }

        const total = calculateTotal(formData.get('valor_total'));

        const emitenteDocumento = normalizeDocument(getValue('emitente_cnpj'));
        const destinatarioDocumento = normalizeDocument(getValue('destinatario_cnpj'));
        const codigoKwan = normalizeKwanCodeValue(getValue('codigo_kwan'));
        const observacoes = getValue('observacoes');

        const invoice = {
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
            numero_pedido: numeroPedido,
            numero_serie: numeroSerie,
            codigo_kwan: codigoKwan,
            valor_total: Number.isFinite(total) ? Number(total.toFixed(2)) : 0,
            codigo_kwan: codigoKwan,
            observacoes,
            itens,
        };

        return { success: true, invoice };
    };

    const tryAddInvoiceToBatch = (invoice, { auto = false } = {}) => {
        if (!invoice) {
            return { success: false, message: null, type: 'error' };
        }

        const exists = invoiceBatch.some(
            (entry) =>
                entry.numero_nf === invoice.numero_nf &&
                entry.emitente_cnpj === invoice.emitente_cnpj &&
                entry.destinatario_cnpj === invoice.destinatario_cnpj
        );

        if (exists) {
            return {
                success: false,
                message: 'Esta nota fiscal já foi adicionada ao lote. Remova-a antes de incluir novamente.',
                type: 'error',
            };
        }

        invoiceCounter += 1;
        const uniqueId = `nf-${String(invoiceCounter).padStart(3, '0')}-${Date.now()}`;
        invoiceBatch.push({ ...invoice, id: uniqueId });
        renderBatchTable();
        checkBatchButton();

        return {
            success: true,
            message: auto
                ? 'Nota fiscal adicionada automaticamente ao lote.'
                : 'Nota fiscal adicionada ao lote. Você pode incluir outras antes de exportar.',
            type: auto ? 'info' : 'success',
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
                            invoice.codigo_kwan ? escapeXml(invoice.codigo_kwan) : '',
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

                const extrasCell = document.createElement('td');
                const extraSegments = [];
                const itemOrders = Array.isArray(invoice.itens)
                    ? Array.from(new Set(invoice.itens.map((item) => item?.pedido).filter(Boolean)))
                    : [];
                const hasPedido = Boolean(invoice.numero_pedido || itemOrders.length);
                const hasSerie = Boolean(invoice.numero_serie);
                const hasKwan = Boolean(invoice.codigo_kwan);

                if (hasPedido) {
                    if (invoice.numero_pedido) {
                        extraSegments.push(`<strong>Pedido ${escapeXml(invoice.numero_pedido)}</strong>`);
                    } else if (itemOrders.length) {
                        let pedidoLabel = '';
                        if (itemOrders.length === 1) {
                            pedidoLabel = itemOrders[0];
                        } else if (itemOrders.length === 2) {
                            pedidoLabel = `${itemOrders[0]}, ${itemOrders[1]}`;
                        } else {
                            pedidoLabel = `${itemOrders[0]}, ${itemOrders[1]} e +${itemOrders.length - 2}`;
                        }
                        extraSegments.push(`<strong>Pedidos ${escapeXml(pedidoLabel)}</strong>`);
                    }
                }
                if (hasSerie) {
                    extraSegments.push(`<span>Nº de série ${escapeXml(invoice.numero_serie)}</span>`);
                }
                if (hasKwan) {
                    extraSegments.push(`<span>KWAN ${escapeXml(invoice.codigo_kwan)}</span>`);
                }

                if (!hasPedido && !hasSerie && !hasKwan) {
                    extraSegments.push('<span class="muted">Nenhum dado complementar informado</span>');
                    extraSegments.push('<span class="muted">Solicitar número de série ao emitente</span>');
                } else if (!hasSerie) {
                    extraSegments.push('<span class="muted">Solicitar número de série ao emitente</span>');
                }

                extrasCell.innerHTML = `
                    <div class="batch-extra">
                        ${extraSegments.join('')}
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

                row.append(nfCell, emitenteCell, destinatarioCell, extrasCell, valorCell, actionsCell);
                batchListBody.append(row);
            });
        }

        if (batchCounter) {
            const count = invoiceBatch.length;
            const totalValue = invoiceBatch.reduce((accumulator, invoice) => {
                const value = Number.isFinite(invoice.valor_total) ? invoice.valor_total : 0;
                return accumulator + value;
            }, 0);
            const countLabel = count === 1 ? '1 nota' : `${count} notas`;
            batchCounter.textContent = totalValue > 0 ? `${countLabel} • ${toDisplayCurrency(totalValue)}` : countLabel;
        }

        if (exportButton) {
            exportButton.disabled = invoiceBatch.length === 0;
        }
        if (exportExcelButton) {
            exportExcelButton.disabled = invoiceBatch.length === 0;
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
            if (invoice.numero_pedido) {
                xmlLines.push(`      <pedido>${escapeXml(invoice.numero_pedido)}</pedido>`);
            }
            if (invoice.numero_serie) {
                xmlLines.push(`      <numeroSerie>${escapeXml(invoice.numero_serie)}</numeroSerie>`);
            }
            if (invoice.codigo_kwan) {
                xmlLines.push(`      <codigoKwan>${escapeXml(invoice.codigo_kwan)}</codigoKwan>`);
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
                if (item.pedido) {
                    xmlLines.push(`        <pedidoItem>${escapeXml(item.pedido)}</pedidoItem>`);
                }
                xmlLines.push('      </item>');
            });
            xmlLines.push('    </itens>');

            xmlLines.push(`    <valorTotal>${formatNumberForXml(invoice.valor_total)}</valorTotal>`);

            if (invoice.codigo_kwan || invoice.observacoes) {
                xmlLines.push('    <informacoesAdicionais>');
                if (invoice.codigo_kwan) {
                    xmlLines.push(`      <codigoKWAN>${escapeXml(invoice.codigo_kwan)}</codigoKWAN>`);
                }
                if (invoice.observacoes) {
                    xmlLines.push(`      <observacoes>${escapeXml(invoice.observacoes)}</observacoes>`);
                }
                xmlLines.push('    </informacoesAdicionais>');
            }

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

    const exportBatchToExcel = () => {
        if (!invoiceBatch.length) {
            showMessage('Adicione ao menos uma nota ao lote antes de exportar.', 'error');
            return;
        }

        const buildExcelCell = (value, { styleId = null } = {}) => {
            const cellValue = value === null || value === undefined ? '' : value;
            const type = typeof cellValue === 'number' && Number.isFinite(cellValue) ? 'Number' : 'String';
            const normalizedValue =
                type === 'Number' ? String(Number(cellValue)) : String(cellValue);
            const styleAttr = styleId ? ` ss:StyleID="${styleId}"` : '';
            return `<Cell${styleAttr}><Data ss:Type="${type}">${escapeXml(normalizedValue)}</Data></Cell>`;
        };

        const buildWorksheet = (name, headers, rows) => {
            const headerRow = `<Row>${headers
                .map((header) => buildExcelCell(header, { styleId: 'Header' }))
                .join('')}</Row>`;
            const dataRows = rows
                .map((row) => `<Row>${row.map((cell) => buildExcelCell(cell)).join('')}</Row>`)
                .join('');
            return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${headerRow}${dataRows}</Table></Worksheet>`;
        };

        const createWorkbook = (worksheets) => {
            const header =
                '<?xml version="1.0" encoding="UTF-8"?>' +
                '<?mso-application progid="Excel.Sheet"?>' +
                '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">' +
                '<Styles><Style ss:ID="Header"><Font ss:Bold="1"/></Style></Styles>';
            const sheets = worksheets.map(({ name, headers, rows }) => buildWorksheet(name, headers, rows)).join('');
            return `${header}${sheets}</Workbook>`;
        };

        const summaryHeaders = [
            'Número NF',
            'Série',
            'Data emissão',
            'Estado emissor',
            'Pedido (nota)',
            'Número de série',
            'Código KWAN',
            'Emitente',
            'Documento emitente',
            'Destinatário',
            'Documento destinatário',
            'Transportadora',
            'Valor total (R$)',
        ];

        const summaryRows = invoiceBatch.map((invoice) => [
            invoice.numero_nf || '',
            invoice.serie || '',
            invoice.data_emissao || '',
            invoice.estado_emissor || '',
            invoice.numero_pedido || '',
            invoice.numero_serie || '',
            invoice.codigo_kwan || '',
            invoice.emitente_nome || '',
            invoice.emitente_cnpj_display || invoice.emitente_cnpj || '',
            invoice.destinatario_nome || '',
            invoice.destinatario_cnpj_display || invoice.destinatario_cnpj || '',
            invoice.transportadora || '',
            Number.isFinite(invoice.valor_total) ? Number(invoice.valor_total.toFixed(2)) : '',
        ]);

        const itemsHeaders = [
            'Número NF',
            'Item',
            'Descrição',
            'Quantidade',
            'Valor unitário (R$)',
            'Valor total (R$)',
            'Pedido da nota',
            'Pedido do item (xPed)',
            'Número de série',
            'Código KWAN',
            'Emitente',
            'Destinatário',
        ];

        const itemRows = invoiceBatch
            .map((invoice) => {
                const pedidoNota = invoice.numero_pedido || '';
                const numeroSerie = invoice.numero_serie || '';
                const codigoKwan = invoice.codigo_kwan || '';
                return invoice.itens.map((item, index) => {
                    const quantidadeRaw =
                        typeof item.quantidade === 'number' && Number.isFinite(item.quantidade)
                            ? item.quantidade
                            : parseDecimal(item.quantidade);
                    const quantidade = Number.isFinite(quantidadeRaw)
                        ? Number(quantidadeRaw.toFixed(3))
                        : '';
                    const valorUnitarioRaw =
                        typeof item.valor_unitario === 'number' && Number.isFinite(item.valor_unitario)
                            ? item.valor_unitario
                            : parseDecimal(item.valor_unitario);
                    const valorUnitario = Number.isFinite(valorUnitarioRaw)
                        ? Number(valorUnitarioRaw.toFixed(2))
                        : '';
                    const totalLinha =
                        Number.isFinite(quantidadeRaw) && Number.isFinite(valorUnitarioRaw)
                            ? Number((quantidadeRaw * valorUnitarioRaw).toFixed(2))
                            : '';
                    return [
                        invoice.numero_nf || '',
                        index + 1,
                        item.descricao || '',
                        quantidade,
                        valorUnitario,
                        totalLinha,
                        pedidoNota,
                        item.pedido || '',
                        numeroSerie,
                        codigoKwan,
                        invoice.emitente_nome || '',
                        invoice.destinatario_nome || '',
                    ];
                });
            })
            .flat();

        const workbookXml = createWorkbook([
            {
                name: 'Notas',
                headers: summaryHeaders,
                rows: summaryRows,
            },
            {
                name: 'Itens',
                headers: itemsHeaders,
                rows: itemRows,
            },
        ]);

        const blob = new Blob([workbookXml], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
        const link = document.createElement('a');
        link.href = url;
        link.download = `notas-fiscais-lote-${timestamp}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showMessage('Lote exportado com sucesso em Excel.', 'success');
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
            observacoes: (data?.observacoes ?? data?.observacao ?? data?.informacoes ?? data?.infoAdicional ?? '').toString().trim(),
            codigo_kwan: normalizeKwanCodeValue(data?.codigo_kwan ?? data?.codigoKwan ?? data?.kwan ?? ''),
            itens: Array.isArray(data?.itens)
                ? data.itens.map((item) => ({
                      descricao: (item?.descricao ?? '').toString().trim(),
                      quantidade: formatDecimal(item?.quantidade ?? item?.qtd ?? '', 3),
                      valor_unitario: formatDecimal(item?.valor_unitario ?? item?.valorUnitario ?? '', 2),
                      pedido: normalizeOrderValue(
                          item?.pedido ??
                              item?.xPed ??
                              item?.xpEd ??
                              item?.numeroPedido ??
                              item?.numero_pedido ??
                              item?.itemPedido ??
                              ''
                      ),
                  }))
                : [],
        };

        fields.itens = fields.itens.filter((item) => item.descricao && item.quantidade !== null);

        if (!fields.codigo_kwan && fields.observacoes) {
            fields.codigo_kwan = extractKwanCodeFromText(fields.observacoes) || '';
        }

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
            codigo_kwan: fields.codigo_kwan,
            observacoes: fields.observacoes.replace(/\s+/g, ' '),
        };

        const itemsDisplay = fields.itens.map((item) => ({
            descricao: item.descricao,
            pedido: item.pedido || '',
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
                fields.codigo_kwan ||
                fields.observacoes ||
                fields.itens.length
        );

        const needsSerial = !fields.numero_serie;

        return { fields, display, itemsDisplay, hasData, needsSerial };
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

        const data = { itens: [], observacoes: '', codigo_kwan: '' };

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

        const observacoesIndex = lines.findIndex((line) => /observa[çc][õo]es?/i.test(line));
        if (observacoesIndex !== -1) {
            const collected = [];
            for (let i = observacoesIndex; i < lines.length && collected.length < 5; i += 1) {
                const currentLine = lines[i];
                if (
                    i !== observacoesIndex &&
                    /^(?:dados|itens|produtos|tributos|emitente|destinat[áa]rio|transporte)\b/i.test(currentLine)
                ) {
                    break;
                }
                collected.push(currentLine);
            }
            const obsText = collected.join(' ').replace(/^[^:]*:/, '').trim();
            if (obsText) {
                data.observacoes = obsText;
            }
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

        const kwanCode = extractKwanCodeFromText(joined) || extractKwanCodeFromText(data.observacoes);
        if (kwanCode) {
            data.codigo_kwan = kwanCode;
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

        const selectNode = (selector, context = infNFe) => {
            if (!context) {
                return null;
            }
            try {
                const direct = context.querySelector(selector);
                if (direct) {
                    return direct;
                }
            } catch (error) {
                // Ignora falhas de seletor quando o XML utiliza namespaces padrão
            }
            const parts = selector
                .split('>')
                .map((part) => part.trim())
                .filter(Boolean);
            let current = context;
            for (const part of parts) {
                if (!current) {
                    return null;
                }
                const localName = part.replace(/^[^:]*:/, '').toLowerCase();
                current = Array.from(current.children).find(
                    (child) => child.localName && child.localName.toLowerCase() === localName
                );
            }
            return current || null;
        };

        const getText = (selector, context = infNFe) => selectNode(selector, context)?.textContent?.trim() ?? '';

        const getNodesByLocalName = (context, localName) => {
            if (!context) {
                return [];
            }
            const desired = localName.toLowerCase();
            return Array.from(context.getElementsByTagName('*')).filter(
                (node) => node.localName && node.localName.toLowerCase() === desired
            );
        };

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
            observacoes: '',
            codigo_kwan: '',
            itens: [],
        };

        const detNodes = getNodesByLocalName(infNFe, 'det');
        const firstDet = detNodes[0] ?? null;
        if (firstDet) {
            const icmsRoot = selectNode('imposto > ICMS', firstDet);
            if (icmsRoot) {
                const icmsChild = Array.from(icmsRoot.children)[0];
                if (icmsChild) {
                    data.percentual_icms = getText('pICMS', icmsChild);
                }
            }
            const ipiRoot = selectNode('imposto > IPI', firstDet);
            if (ipiRoot) {
                const ipiNode =
                    selectNode('IPITrib', ipiRoot) || selectNode('IPINT', ipiRoot) || ipiRoot;
                data.percentual_ipi = getText('pIPI', ipiNode);
                if (!data.valor_ipi) {
                    data.valor_ipi = getText('vIPI', ipiNode);
                }
            }
            if (!data.numero_pedido) {
                data.numero_pedido = getText('prod > xPed', firstDet) || getText('prod > nItemPed', firstDet);
            }
            if (!data.numero_serie) {
                data.numero_serie = getText('prod > nSerie', firstDet) || getText('prod > nSerieFab', firstDet);
            }
            if (!data.codigo_kwan) {
                const prodCode = getText('prod > cProd', firstDet);
                if (/kwan/i.test(prodCode)) {
                    data.codigo_kwan = prodCode;
                }
            }
        }

        detNodes.forEach((det) => {
            const descricao = getText('prod > xProd', det);
            const quantidade = getText('prod > qCom', det);
            const valorUnitario = getText('prod > vUnCom', det);
            const pedidoItem = getText('prod > xPed', det) || getText('prod > nItemPed', det);
            if (descricao) {
                data.itens.push({
                    descricao,
                    quantidade,
                    valor_unitario: valorUnitario,
                    pedido: pedidoItem,
                });
            }
        });

        const infAdic = infNFe.querySelector('infAdic');
        if (infAdic) {
            const notes = [];
            const infoComplementar = getText('infCpl', infAdic);
            if (infoComplementar) {
                notes.push(infoComplementar);
            }
            infAdic.querySelectorAll('obsCont, obsFisco').forEach((node) => {
                const campo = node.getAttribute?.('xCampo') || '';
                if (campo) {
                    notes.push(campo);
                }
                const text = getText('xTexto', node) || node.textContent?.trim() || '';
                if (text) {
                    notes.push(text);
                }
            });
            if (notes.length) {
                data.observacoes = notes.join('\n');
            }
        }

        if (!data.codigo_kwan) {
            data.codigo_kwan =
                extractKwanCodeFromText(getText('det > prod > xPed')) || extractKwanCodeFromText(data.observacoes);
        }

        return { data, raw: xmlString };
    };

    const renderOcrResults = (normalized, raw) => {
        const { display, itemsDisplay, hasData, needsSerial } = normalized;

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
                { label: 'Código KWAN', value: display.codigo_kwan },
                {
                    label: 'Observações',
                    value: display.observacoes
                        ? `${display.observacoes.slice(0, 220)}${display.observacoes.length > 220 ? '…' : ''}`
                        : '',
                },
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
                cell.colSpan = 4;
                cell.className = 'muted';
                cell.textContent = 'Nenhum item identificado automaticamente.';
                emptyRow.append(cell);
                ocrItemsBody.append(emptyRow);
            } else {
                itemsDisplay.forEach((item) => {
                    const row = document.createElement('tr');
                    const descricao = document.createElement('td');
                    descricao.textContent = item.descricao;
                    const pedido = document.createElement('td');
                    pedido.textContent = item.pedido || '-';
                    const qtd = document.createElement('td');
                    qtd.textContent = item.quantidade;
                    const valor = document.createElement('td');
                    valor.textContent = item.valor_unitario;
                    row.append(descricao, pedido, qtd, valor);
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
            const pedidoInput = newItem.querySelector('[data-name="pedido"]');

            if (descricaoInput) {
                descricaoInput.value = itemData.descricao ?? '';
            }
            if (pedidoInput) {
                pedidoInput.value = itemData.pedido ?? '';
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
        assignValue('codigo_kwan', extractedData.codigo_kwan ?? '');
        assignValue('observacoes', extractedData.observacoes ?? '');

        const estadoSelect = form.elements.namedItem('estado_emissor');
        if (estadoSelect instanceof HTMLSelectElement && extractedData.estado_emissor) {
            estadoSelect.value = extractedData.estado_emissor;
        }

        container.innerHTML = '';
        if (extractedData.itens && extractedData.itens.length) {
            extractedData.itens.forEach((item) => {
                addItem({
                    descricao: item.descricao,
                    pedido: item.pedido ?? '',
                    quantidade: item.quantidade ?? '',
                    valor_unitario: item.valor_unitario ?? '',
                });
            });
        } else {
            addItem();
        }

        calculateTotal(extractedData.valor_total ?? null);
        checkBatchButton();

        const serialField = form.elements.namedItem('numero_serie');
        const serialValue = serialField instanceof HTMLInputElement ? serialField.value.trim() : '';
        const gatherResult = gatherFormData({ silent: true });

        const messageParts = ['Campos preenchidos com os dados importados. Revise antes de salvar.'];
        let messageType = 'success';

        if (!serialValue) {
            messageParts.push('Número de série não identificado. Solicite ao emitente.');
            messageType = 'warning';
        }

        if (gatherResult.success) {
            const batchOutcome = tryAddInvoiceToBatch(gatherResult.invoice, { auto: true });
            if (batchOutcome.success) {
                messageParts.push('Nota fiscal adicionada automaticamente ao lote.');
                if (!serialValue) {
                    messageType = 'warning';
                }
            } else if (batchOutcome.message) {
                messageParts.push(batchOutcome.message);
                if (batchOutcome.type) {
                    messageType = batchOutcome.type;
                }
            }
        } else if (gatherResult.error) {
            messageParts.push(gatherResult.error);
            messageType = 'error';
        }

        showMessage(messageParts.join(' '), messageType);
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
            const result = gatherFormData();
            if (!result.success) {
                return;
            }
            const outcome = tryAddInvoiceToBatch(result.invoice, { auto: false });
            if (outcome.message) {
                showMessage(outcome.message, outcome.type);
            }
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

    if (exportExcelButton) {
        exportExcelButton.addEventListener('click', () => {
            exportBatchToExcel();
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
                const errorMessage = data?.message || rawBody || 'Não foi possível salvar a nota fiscal.';
                throw new Error(errorMessage.trim());
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
