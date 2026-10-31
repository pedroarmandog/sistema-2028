// JS mínimo para a página de descontos (ponto de partida)
console.log('descontos.js carregado');

// futuro: carregar dados via API e interações da página
// --- Helpers to control the position of the '+' buttons from the console
function setCardAddGap(value) {
	// value: number (pixels) or string with unit (e.g. '12px' or '0.6rem')
	const val = typeof value === 'number' ? value + 'px' : value;
	document.documentElement.style.setProperty('--card-add-gap', val);
}

function setCardAddLeftOffset(value) {
	// value: number (pixels) or string with unit
	const val = typeof value === 'number' ? value + 'px' : value;
	document.documentElement.style.setProperty('--card-add-left-offset', val);
}

// expose to window for easy use from the browser console
window.setCardAddGap = setCardAddGap;
window.setCardAddLeftOffset = setCardAddLeftOffset;

// --- Runtime helpers to adjust Desconto Relações widths
function setRelTableMaxWidth(value) {
	const val = typeof value === 'number' ? value + 'px' : value;
	document.documentElement.style.setProperty('--rel-table-max-width', val);
}
function setRelProdColWidth(value) {
	const val = typeof value === 'number' ? value + '%' : value;
	document.documentElement.style.setProperty('--rel-prod-col', val);
}
function setRelClienteColWidth(value) {
	const val = typeof value === 'number' ? value + '%' : value;
	document.documentElement.style.setProperty('--rel-cliente-col', val);
}

window.setRelTableMaxWidth = setRelTableMaxWidth;
window.setRelProdColWidth = setRelProdColWidth;
window.setRelClienteColWidth = setRelClienteColWidth;

console.log('descontos helpers: use setCardAddGap(px) and setCardAddLeftOffset(px) to adjust the + position');

// --- Toast helper (uses existing #toast-container and .toast styles)
function showToast(message, type = 'info', duration = 3500) {
		let container = document.getElementById('toast-container');
		if (!container) {
			container = document.createElement('div');
			container.id = 'toast-container';
			// try to append to a main wrapper if exists, otherwise to body
			const main = document.querySelector('.main-content') || document.querySelector('body');
			main.appendChild(container);
		}
	const toast = document.createElement('div');
	toast.className = 'toast ' + (type === 'error' ? 'error' : (type === 'success' ? 'success' : 'info'));
	toast.innerHTML = `
		<div class="toast-icon">${type === 'success' ? '<i class="fas fa-check-circle"></i>' : (type === 'error' ? '<i class="fas fa-exclamation-circle"></i>' : '<i class="fas fa-info-circle"></i>')}</div>
		<div class="toast-body">${escapeHtml(message)}</div>
		<button class="toast-close" aria-label="Fechar">×</button>
	`;
	container.appendChild(toast);
	// close handler
	toast.querySelector('.toast-close').addEventListener('click', () => {
		toast.remove();
	});
	// auto remove
	setTimeout(() => { try { toast.remove(); } catch (e) {} }, duration);
}

// --- Perfil de Produto CRUD (carregado do backend via API)
let perfilProdutos = [];
let perfilEditId = null;

async function loadPerfilProdutos() {
	try {
		// Chamada direta ao endpoint específico de perfis de produto
		const resp = await fetch('/api/perfis-produto');
		if (!resp.ok) throw new Error('Erro HTTP ' + resp.status);
		perfilProdutos = await resp.json();
		console.log('✅ Perfis de produto carregados (fetch direto):', perfilProdutos.length);
		// Filtrar possíveis perfis de "validade" que foram salvos na mesma tabela
		try {
			const before = perfilProdutos.length;
			const isValidade = desc => {
				if(!desc) return false;
				const s = String(desc).toLowerCase();
				// padrões típicos: "20 - 10 dias", "50-60 DIAS", ou apenas ranges numéricos
				if (s.indexOf('dia') !== -1) return true;
				if (/^\s*\d+\s*[-–]\s*\d+\s*$/.test(s)) return true;
				if (/^\s*\d+\s*[-–]\s*\d+\s*dias?\b/.test(s)) return true;
				return false;
			};
			perfilProdutos = perfilProdutos.filter(p => !isValidade(p.descricao));
			const removed = before - perfilProdutos.length;
			if (removed > 0) console.log(`⚠️ Removidos ${removed} perfis que parecem de validade (não mostrar em Perfil de Produto)`);
		} catch(filtErr) { console.debug('Erro ao filtrar perfis de validade:', filtErr); }
	} catch (e) {
		console.error('Erro ao carregar perfis de produto do backend (fetch direto):', e);
		perfilProdutos = [];
	}
}

// Não há mais necessidade de savePerfilProdutos - os dados são salvos no backend via API

function renderPerfilProdutos() {
	const tbody = document.getElementById('perfilProdutoTableBody');
	if (!tbody) return;
	tbody.innerHTML = '';
	if (perfilProdutos.length === 0) {
		const tr = document.createElement('tr');
		tr.innerHTML = '<td colspan="5" class="empty">Não há perfis cadastrados.</td>';
		tbody.appendChild(tr);
		return;
	}

	perfilProdutos.forEach(p => {
		const tr = document.createElement('tr');
		tr.dataset.id = p.id;
		tr.style.cursor = 'pointer';
		tr.innerHTML = `
			<td class="pp-desc">${escapeHtml(p.descricao)}</td>
			<td class="pp-fixo">${p.fixo === '' ? '-' : p.fixo + '%'}</td>
			<td class="pp-maximo">${p.maximo === '' ? '-' : p.maximo + '%'}</td>
			<td class="pp-gerente">${p.gerente === '' ? '-' : p.gerente + '%'}</td>
			<td style="text-align:right;"><button class="btn icon-btn perfil-trash" data-id="${p.id}" title="Excluir"><i class="fas fa-trash" style="color:#999"></i></button></td>
		`;
		tbody.appendChild(tr);
	});
}

function escapeHtml(str) {
	if (!str) return '';
	return String(str).replace(/&/g, '&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Modal control
function openPerfilProdutoModal(editId=null) {
	perfilEditId = editId;
	const modal = document.getElementById('perfilProdutoModal');
	if (!modal) return;
	document.getElementById('pp_descricao').value = '';
	document.getElementById('pp_fixo').value = '';
	document.getElementById('pp_maximo').value = '';
	document.getElementById('pp_gerente').value = '';
	document.getElementById('perfilProdutoModalTitle').textContent = editId ? 'Editar Perfil de Desconto - PRODUTO' : 'Novo Perfil de Desconto - PRODUTO';
	if (editId) {
		const item = perfilProdutos.find(x => x.id === editId);
		if (item) {
			document.getElementById('pp_descricao').value = item.descricao || '';
			document.getElementById('pp_fixo').value = item.fixo || '';
			document.getElementById('pp_maximo').value = item.maximo || '';
			document.getElementById('pp_gerente').value = item.gerente || '';
		}
	}
	modal.style.display = 'flex';
	document.body.style.overflow = 'hidden';
}

function closePerfilProdutoModal() {
	const modal = document.getElementById('perfilProdutoModal');
	if (!modal) return;
	modal.style.display = 'none';
	document.body.style.overflow = '';
	perfilEditId = null;
}

async function onSavePerfilProduto() {
	const desc = document.getElementById('pp_descricao').value.trim();
	const fixo = document.getElementById('pp_fixo').value.trim();
	const maximo = document.getElementById('pp_maximo').value.trim();
	const gerente = document.getElementById('pp_gerente').value.trim();
	if (!desc) {
		showToast('Preencha a descrição', 'error');
		return;
	}

	const perfilData = { descricao: desc, fixo: fixo || null, maximo: maximo || null, gerente: gerente || null };

	try {
		if (perfilEditId) {
			await ApiClient.atualizarPerfilProduto(perfilEditId, perfilData);
			showToast('Perfil atualizado com sucesso!', 'success');
		} else {
			await ApiClient.criarPerfilProduto(perfilData);
			showToast('Perfil criado com sucesso!', 'success');
		}
		await loadPerfilProdutos();
		renderPerfilProdutos();
		closePerfilProdutoModal();
	} catch (error) {
		console.error('Erro ao salvar perfil de produto:', error);
		showToast('Erro ao salvar perfil: ' + error.message, 'error');
	}
}

// Delegated click handlers for table: edit on row click, delete on trash
function attachPerfilProdutoHandlers() {
	const tbody = document.getElementById('perfilProdutoTableBody');
	if (!tbody) return;
	tbody.addEventListener('click', async function(e) {
		const trash = e.target.closest('.perfil-trash');
		if (trash) {
			const id = trash.dataset.id;
			try {
				await ApiClient.deletarPerfilProduto(id);
				showToast('Perfil excluído com sucesso!', 'success');
				await loadPerfilProdutos();
				renderPerfilProdutos();
			} catch (error) {
				console.error('Erro ao excluir perfil:', error);
				showToast('Erro ao excluir perfil: ' + error.message, 'error');
			}
			return;
		}

		const tr = e.target.closest('tr');
		if (tr && tr.dataset && tr.dataset.id) {
			const id = tr.dataset.id;
			openPerfilProdutoModal(id);
		}
	});
}

// wire UI on DOM ready
document.addEventListener('DOMContentLoaded', async function() {
	// Perfis de produto: aguardar carregar antes de renderizar
	await loadPerfilProdutos();
	renderPerfilProdutos();
	attachPerfilProdutoHandlers();

	const btnAdd = document.getElementById('btnAddPerfilProduto');
	if (btnAdd) btnAdd.addEventListener('click', () => openPerfilProdutoModal(null));

	const btnClose = document.getElementById('closePerfilProdutoModal');
	if (btnClose) btnClose.addEventListener('click', closePerfilProdutoModal);
	const btnCancel = document.getElementById('cancelPerfilProduto');
	if (btnCancel) btnCancel.addEventListener('click', closePerfilProdutoModal);
	const btnSave = document.getElementById('savePerfilProduto');
	if (btnSave) btnSave.addEventListener('click', onSavePerfilProduto);

	// --- Perfil de Cliente: aguardar carregar antes de renderizar
	await loadPerfilClientes();
	renderPerfilClientes();
	attachPerfilClienteHandlers();

	const btnAddCli = document.getElementById('btnAddPerfilCliente');
	if (btnAddCli) btnAddCli.addEventListener('click', () => openPerfilClienteModal(null));

	const btnCloseCli = document.getElementById('closePerfilClienteModal');
	if (btnCloseCli) btnCloseCli.addEventListener('click', closePerfilClienteModal);
	const btnCancelCli = document.getElementById('cancelPerfilCliente');
	if (btnCancelCli) btnCancelCli.addEventListener('click', closePerfilClienteModal);
	const btnSaveCli = document.getElementById('savePerfilCliente');
	if (btnSaveCli) btnSaveCli.addEventListener('click', onSavePerfilCliente);

	// --- Desconto por Produto e Cliente wiring (aguardar relacoes)
	await loadRelacoes();
	renderRelacoes();
	attachRelacaoHandlers();

	const btnAddRel = document.getElementById('btnAddRelacao');
	if (btnAddRel) btnAddRel.addEventListener('click', () => openRelacaoModal(null));
	const btnCloseRel = document.getElementById('closeRelacaoModal'); if (btnCloseRel) btnCloseRel.addEventListener('click', closeRelacaoModal);
	const btnCancelRel = document.getElementById('cancelRelacao'); if (btnCancelRel) btnCancelRel.addEventListener('click', closeRelacaoModal);
	const btnSaveRel = document.getElementById('saveRelacao'); if (btnSaveRel) btnSaveRel.addEventListener('click', onSaveRelacao);
});

// --- Perfil de Cliente CRUD (carregado do backend via API)
let perfilClientes = [];
let perfilClienteEditId = null;

async function loadPerfilClientes() {
	try {
		perfilClientes = await ApiClient.getPerfisCliente();
		console.log('✅ Perfis de cliente carregados do backend:', perfilClientes.length);
	} catch (e) {
		console.error('Erro ao carregar perfis de cliente do backend:', e);
		perfilClientes = [];
	}
}

// Não há mais necessidade de savePerfilClientes - os dados são salvos no backend via API

function renderPerfilClientes() {
	const tbody = document.getElementById('perfilClienteTableBody');
	if (!tbody) return;
	tbody.innerHTML = '';
	if (perfilClientes.length === 0) {
		const tr = document.createElement('tr');
		tr.innerHTML = '<td colspan="5" class="empty">Não há perfis de cliente cadastrados.</td>';
		tbody.appendChild(tr);
		return;
	}
	perfilClientes.forEach(p => {
		const tr = document.createElement('tr');
		tr.dataset.id = p.id;
		tr.style.cursor = 'pointer';
		tr.innerHTML = `
			<td class="pc-desc">${escapeHtml(p.descricao)}</td>
			<td class="pc-fixo">${p.fixo === '' ? '-' : p.fixo + '%'}</td>
			<td class="pc-maximo">${p.maximo === '' ? '-' : p.maximo + '%'}</td>
			<td class="pc-gerente">${p.gerente === '' ? '-' : p.gerente + '%'}</td>
			<td style="text-align:right;"><button class="btn icon-btn perfilcliente-trash" data-id="${p.id}" title="Excluir"><i class="fas fa-trash" style="color:#999"></i></button></td>
		`;
		tbody.appendChild(tr);
	});
}

function openPerfilClienteModal(editId=null) {
	perfilClienteEditId = editId;
	const modal = document.getElementById('perfilClienteModal');
	if (!modal) return;
	document.getElementById('pc_descricao').value = '';
	document.getElementById('pc_fixo').value = '';
	document.getElementById('pc_maximo').value = '';
	document.getElementById('pc_gerente').value = '';
	document.getElementById('perfilClienteModalTitle').textContent = editId ? 'Editar Perfil de Desconto - CLIENTE' : 'Novo Perfil de Desconto - CLIENTE';
	if (editId) {
		const item = perfilClientes.find(x => x.id === editId);
		if (item) {
			document.getElementById('pc_descricao').value = item.descricao || '';
			document.getElementById('pc_fixo').value = item.fixo || '';
			document.getElementById('pc_maximo').value = item.maximo || '';
			document.getElementById('pc_gerente').value = item.gerente || '';
		}
	}
	modal.style.display = 'flex';
	document.body.style.overflow = 'hidden';
}

function closePerfilClienteModal() {
	const modal = document.getElementById('perfilClienteModal');
	if (!modal) return;
	modal.style.display = 'none';
	document.body.style.overflow = '';
	perfilClienteEditId = null;
}

async function onSavePerfilCliente() {
	const desc = document.getElementById('pc_descricao').value.trim();
	const fixo = document.getElementById('pc_fixo').value.trim();
	const maximo = document.getElementById('pc_maximo').value.trim();
	const gerente = document.getElementById('pc_gerente').value.trim();
	if (!desc) { showToast('Preencha a descrição', 'error'); return; }

	const perfilData = { descricao: desc, fixo: fixo || null, maximo: maximo || null, gerente: gerente || null };

	try {
		if (perfilClienteEditId) {
			await ApiClient.atualizarPerfilCliente(perfilClienteEditId, perfilData);
			showToast('Perfil atualizado com sucesso!', 'success');
		} else {
			await ApiClient.criarPerfilCliente(perfilData);
			showToast('Perfil criado com sucesso!', 'success');
		}
		await loadPerfilClientes();
		renderPerfilClientes();
		closePerfilClienteModal();
	} catch (error) {
		console.error('Erro ao salvar perfil de cliente:', error);
		showToast('Erro ao salvar perfil: ' + error.message, 'error');
	}
}

function attachPerfilClienteHandlers() {
	const tbody = document.getElementById('perfilClienteTableBody');
	if (!tbody) return;
	tbody.addEventListener('click', async function(e) {
		const trash = e.target.closest('.perfilcliente-trash');
		if (trash) {
			const id = trash.dataset.id;
			try {
				await ApiClient.deletarPerfilCliente(id);
				showToast('Perfil excluído com sucesso!', 'success');
				await loadPerfilClientes();
				renderPerfilClientes();
			} catch (error) {
				console.error('Erro ao excluir perfil:', error);
				showToast('Erro ao excluir perfil: ' + error.message, 'error');
			}
			return;
		}
		const tr = e.target.closest('tr');
		if (tr && tr.dataset && tr.dataset.id) {
			const id = tr.dataset.id; openPerfilClienteModal(id);
		}
	});
}

// --- Desconto por Produto e Cliente CRUD (carregado do backend via API)
let relacoes = [];
let relacaoEditId = null;

async function loadRelacoes() {
	try {
		relacoes = await ApiClient.getDescontosRelacoes();
		console.log('✅ Relações de desconto carregadas do backend:', relacoes.length);
	} catch (e) {
		console.error('Erro ao carregar relações de desconto do backend:', e);
		relacoes = [];
	}
}

// Não há mais necessidade de saveRelacoes - os dados são salvos no backend via API

function renderRelacoes() {
	const tbody = document.getElementById('descontoRelacaoTableBody');
	if (!tbody) return;
	tbody.innerHTML = '';
	if (relacoes.length === 0) {
		const tr = document.createElement('tr');
		tr.innerHTML = '<td colspan="5" class="empty">Não há descontos relacionados cadastrados.</td>';
		tbody.appendChild(tr); return;
	}
	relacoes.forEach(r => {
		const tr = document.createElement('tr');
		tr.dataset.id = r.id;
		tr.style.cursor = 'pointer';

		// determinar labels de produto/cliente
		const produtoLabel = r.produtoLabel || r.perfilProduto || r.produtoPerfilId || '';
		const clienteLabel = r.clienteLabel || r.perfilCliente || r.clientePerfilId || '';

		// tentar recuperar o perfil de produto para mostrar fixo/maximo/gerente
		let perfilFromProduto = null;
		try {
			perfilFromProduto = perfilProdutos.find(p => {
				if (!p) return false;
				if (String(p.id) === String(r.produtoPerfilId || '')) return true;
				if ((p.descricao || '').toString().trim() === (r.perfilProduto || '').toString().trim()) return true;
				if ((p.descricao || '').toString().trim() === (r.produtoLabel || '').toString().trim()) return true;
				return false;
			});
		} catch (e) { perfilFromProduto = null; }

		const formatPct = (v) => {
			if (v === undefined || v === null || v === '') return '-';
			return String(v) + '%';
		};

		const fixoVal = perfilFromProduto ? perfilFromProduto.fixo : (r.fixo !== undefined ? r.fixo : '');
		const maximoVal = perfilFromProduto ? perfilFromProduto.maximo : (r.maximo !== undefined ? r.maximo : '');
		const gerenteVal = perfilFromProduto ? perfilFromProduto.gerente : (r.gerente !== undefined ? r.gerente : '');

		tr.innerHTML = `
			<td style="max-width:400px">${escapeHtml(produtoLabel)}</td>
			<td style="max-width:300px">${escapeHtml(clienteLabel)}</td>
			<td class="rp-fixo">${formatPct(fixoVal)}</td>
			<td class="rp-maximo">${formatPct(maximoVal)}</td>
			<td class="rp-gerente">${formatPct(gerenteVal)}</td>
			<td style="text-align:right;"><button class="btn icon-btn relacao-trash" data-id="${r.id}" title="Excluir"><i class="fas fa-trash" style="color:#999"></i></button></td>
		`;
		tbody.appendChild(tr);
	});
}

function populateRelacaoSelects() {
	// prepare lookup lists (custom dropdown) instead of native select
	loadPerfilProdutos(); loadPerfilClientes();
	const prodList = document.getElementById('rp_produto_list');
	const cliList = document.getElementById('rp_cliente_list');
	const prodInput = document.getElementById('rp_produto_input');
	const cliInput = document.getElementById('rp_cliente_input');
	if (!prodList || !cliList || !prodInput || !cliInput) return;
		prodList.innerHTML = '';
	cliList.innerHTML = '';
	perfilProdutos.forEach(p => {
		const div = document.createElement('div');
		div.className = 'lookup-item';
		div.dataset.id = p.id;
		div.dataset.label = p.descricao || p.id;
		div.innerHTML = `<div>${escapeHtml(p.descricao || p.id)}</div><div class="small-muted">Código: ${escapeHtml(String(p.id || ''))}</div>`;
		div.addEventListener('click', () => {
			document.getElementById('rp_perfil_produto').value = p.id;
			prodInput.value = p.descricao || p.id;
			prodList.style.display = 'none';
		});
				prodList.appendChild(div);
	});
	perfilClientes.forEach(p => {
		const div = document.createElement('div');
		div.className = 'lookup-item';
		div.dataset.id = p.id;
		div.dataset.label = p.descricao || p.id;
		div.innerHTML = `<div>${escapeHtml(p.descricao || p.id)}</div><div class="small-muted">Código: ${escapeHtml(String(p.id || ''))}</div>`;
		div.addEventListener('click', () => {
			document.getElementById('rp_perfil_cliente').value = p.id;
			cliInput.value = p.descricao || p.id;
			cliList.style.display = 'none';
		});
			cliList.appendChild(div);
	});
		// attach input behaviors (filter/show) once
		if (!prodInput.dataset.__lookup_attached) {
			prodInput.addEventListener('focus', () => { prodList.style.display = 'block'; prodInput.select(); });
			prodInput.addEventListener('input', () => {
				const q = prodInput.value.toLowerCase();
				Array.from(prodList.children).forEach(it => {
					const label = (it.dataset.label||'').toLowerCase();
					it.style.display = label.indexOf(q) === -1 ? 'none' : 'block';
				});
			});
			prodInput.dataset.__lookup_attached = '1';
		}
		if (!cliInput.dataset.__lookup_attached) {
			cliInput.addEventListener('focus', () => { cliList.style.display = 'block'; cliInput.select(); });
			cliInput.addEventListener('input', () => {
				const q = cliInput.value.toLowerCase();
				Array.from(cliList.children).forEach(it => {
					const label = (it.dataset.label||'').toLowerCase();
					it.style.display = label.indexOf(q) === -1 ? 'none' : 'block';
				});
			});
			cliInput.dataset.__lookup_attached = '1';
		}
		// close on outside click (attach only once)
		if (!window.__descontos_lookup_handler_attached) {
			document.addEventListener('click', function _closeLookup(e) {
				const prodListEl = document.getElementById('rp_produto_list');
				const cliListEl = document.getElementById('rp_cliente_list');
				const prodInputEl = document.getElementById('rp_produto_input');
				const cliInputEl = document.getElementById('rp_cliente_input');
				if (prodListEl && prodInputEl && !prodListEl.contains(e.target) && e.target !== prodInputEl) prodListEl.style.display = 'none';
				if (cliListEl && cliInputEl && !cliListEl.contains(e.target) && e.target !== cliInputEl) cliListEl.style.display = 'none';
			});
			window.__descontos_lookup_handler_attached = true;
		}
}

function openRelacaoModal(editId=null) {
	relacaoEditId = editId;
	const modal = document.getElementById('descontoRelacaoModal'); if (!modal) return;
	// reset
	document.getElementById('rp_descricao').value = '';
	document.getElementById('rp_fixo').value = '';
	document.getElementById('rp_maximo').value = '';
	document.getElementById('rp_gerente').value = '';
	populateRelacaoSelects();
	document.getElementById('descontoRelacaoModalTitle').textContent = editId ? 'Editar Perfil de Desconto - Produto/Cliente' : 'Novo Perfil de Desconto - Produto/Cliente';
	if (editId) {
		const item = relacoes.find(x => x.id === editId);
		if (item) {
			document.getElementById('rp_descricao').value = item.descricao || '';
			// produto: tentar encontrar perfil pelo id ou pela descrição armazenada
			try {
				const prodInput = document.getElementById('rp_produto_input');
				const perfilProdField = document.getElementById('rp_perfil_produto');
				let matchedProd = null;
				if (item.produtoPerfilId) matchedProd = perfilProdutos.find(p => String(p.id) === String(item.produtoPerfilId));
				if (!matchedProd && item.perfilProduto) matchedProd = perfilProdutos.find(p => (p.descricao||'').toString().trim() === (item.perfilProduto||'').toString().trim());
				if (matchedProd) {
					if (perfilProdField) perfilProdField.value = matchedProd.id;
					if (prodInput) prodInput.value = matchedProd.descricao || matchedProd.id || '';
				} else {
					if (prodInput) prodInput.value = item.perfilProduto || item.produtoLabel || '';
					if (perfilProdField && item.produtoPerfilId) perfilProdField.value = item.produtoPerfilId;
				}
			} catch(e) {}

			// cliente: mesmo princípio
			try {
				const cliInput = document.getElementById('rp_cliente_input');
				const perfilCliField = document.getElementById('rp_perfil_cliente');
				let matchedCli = null;
				if (item.clientePerfilId) matchedCli = perfilClientes.find(p => String(p.id) === String(item.clientePerfilId));
				if (!matchedCli && item.perfilCliente) matchedCli = perfilClientes.find(p => (p.descricao||'').toString().trim() === (item.perfilCliente||'').toString().trim());
				if (matchedCli) {
					if (perfilCliField) perfilCliField.value = matchedCli.id;
					if (cliInput) cliInput.value = matchedCli.descricao || matchedCli.id || '';
				} else {
					if (cliInput) cliInput.value = item.perfilCliente || item.clienteLabel || '';
					if (perfilCliField && item.clientePerfilId) perfilCliField.value = item.clientePerfilId;
				}
			} catch(e) {}

			document.getElementById('rp_fixo').value = item.fixo || item.desconto || '';
			document.getElementById('rp_maximo').value = item.maximo || '';
			document.getElementById('rp_gerente').value = item.gerente || '';
		}
	}
	modal.style.display = 'flex'; document.body.style.overflow = 'hidden';
}

function closeRelacaoModal() { const modal = document.getElementById('descontoRelacaoModal'); if (!modal) return; modal.style.display = 'none'; document.body.style.overflow = ''; relacaoEditId = null; }

async function onSaveRelacao() {
	const produtoId = document.getElementById('rp_perfil_produto').value;
	const clienteId = document.getElementById('rp_perfil_cliente').value;
	const desc = document.getElementById('rp_descricao').value.trim();
	const fixo = document.getElementById('rp_fixo').value.trim();
	const maximo = document.getElementById('rp_maximo').value.trim();
	const gerente = document.getElementById('rp_gerente').value.trim();
	if (!produtoId) { showToast('Escolha um Perfil de Produto', 'error'); return; }
	if (!clienteId) { showToast('Escolha um Perfil de Cliente', 'error'); return; }
	// find labels
	const prod = perfilProdutos.find(p => p.id == produtoId);
	const cli = perfilClientes.find(p => p.id == clienteId);
	const produtoLabel = prod ? prod.descricao : produtoId;
	const clienteLabel = cli ? cli.descricao : clienteId;

	const relacaoData = {
		perfilProduto: produtoLabel,
		perfilCliente: clienteLabel,
		desconto: fixo || maximo || gerente || 0,
		obs: desc || null
	};

	try {
		if (relacaoEditId) {
			await ApiClient.atualizarDescontoRelacao(relacaoEditId, relacaoData);
			showToast('Relação atualizada com sucesso!', 'success');
		} else {
			await ApiClient.criarDescontoRelacao(relacaoData);
			showToast('Relação criada com sucesso!', 'success');
		}
		await loadRelacoes();
		renderRelacoes();
		closeRelacaoModal();
	} catch (error) {
		console.error('Erro ao salvar relação:', error);
		showToast('Erro ao salvar relação: ' + error.message, 'error');
	}
}

function attachRelacaoHandlers() {
	const tbody = document.getElementById('descontoRelacaoTableBody'); if (!tbody) return;
	tbody.addEventListener('click', async function(e) {
		const trash = e.target.closest('.relacao-trash');
		if (trash) {
			const id = trash.dataset.id;
			try {
				await ApiClient.deletarDescontoRelacao(id);
				showToast('Relação excluída com sucesso!', 'success');
				await loadRelacoes();
				renderRelacoes();
			} catch (error) {
				console.error('Erro ao excluir relação:', error);
				showToast('Erro ao excluir relação: ' + error.message, 'error');
			}
			return;
		}
		const tr = e.target.closest('tr'); if (tr && tr.dataset && tr.dataset.id) { const id = tr.dataset.id; openRelacaoModal(id); }
	});
}
