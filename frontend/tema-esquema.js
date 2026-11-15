// Esquema único da paleta: nomes, IDs e variáveis CSS não são definidos pelo cliente.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.PetHubPaletaEsquema=factory();})(typeof window==='undefined'?globalThis:window,function(){
 const DEFAULT_COLORS = {
            primary: [
                { id: 'primary-blue', name: 'Azul Principal', hex: '#007bff', var: '--color-primary', usage: 'Botões principais, links' },
                { id: 'primary-blue-hover', name: 'Azul Hover', hex: '#0056b3', var: '--color-primary-hover', usage: 'Hover de botões primários' },
                { id: 'primary-light', name: 'Azul Claro', hex: '#3498db', var: '--color-primary-light', usage: 'Variações de azul' }
            ],
            sidebar: [
                { id: 'sidebar-start', name: 'Sidebar Topo', hex: '#2c3e50', var: '--bg-sidebar-start', usage: 'Cor inicial do gradiente do menu lateral' },
                { id: 'sidebar-end', name: 'Sidebar Base', hex: '#34495e', var: '--bg-sidebar-end', usage: 'Cor final do gradiente do menu lateral' }
            ],
            status: [
                { id: 'status-success', name: 'Sucesso', hex: '#28a745', var: '--color-success', usage: 'Mensagens de sucesso, estados positivos' },
                { id: 'status-danger', name: 'Erro/Perigo', hex: '#dc3545', var: '--color-danger', usage: 'Erros, alertas críticos, exclusões' },
                { id: 'status-warning', name: 'Aviso', hex: '#ffc107', var: '--color-warning', usage: 'Avisos, atenção' },
                { id: 'status-info', name: 'Info', hex: '#17a2b8', var: '--color-info', usage: 'Informações, dicas' }
            ],
            buttons: [
                { id: 'btn-primary', name: 'Botão Principal', hex: '#28a745', var: '--btn-primary', usage: 'Botões de ação principal' },
                { id: 'btn-primary-hover', name: 'Botão Principal Hover', hex: '#1e7e34', var: '--btn-primary-hover', usage: 'Hover dos botões principais' },
                { id: 'btn-danger', name: 'Botão Perigo', hex: '#e74c3c', var: '--btn-danger', usage: 'Botões de exclusão/cancelar' },
                { id: 'btn-danger-hover', name: 'Botão Perigo Hover', hex: '#c0392b', var: '--btn-danger-hover', usage: 'Hover dos botões de perigo' }
            ],
            backgrounds: [
                { id: 'bg-body', name: 'Fundo da Página', hex: '#f8f9fa', var: '--bg-body', usage: 'Fundo principal das páginas' },
                { id: 'bg-white', name: 'Fundo Branco', hex: '#ffffff', var: '--bg-white', usage: 'Fundo de cards, modais' },
                { id: 'bg-light', name: 'Fundo Claro', hex: '#f8f9fa', var: '--bg-light', usage: 'Backgrounds secundários' }
            ],
            text: [
                { id: 'text-primary', name: 'Texto Principal', hex: '#333333', var: '--text-primary', usage: 'Textos principais' },
                { id: 'text-secondary', name: 'Texto Secundário', hex: '#6c757d', var: '--text-secondary', usage: 'Textos secundários' },
                { id: 'text-muted', name: 'Texto Discreto', hex: '#495057', var: '--text-muted', usage: 'Textos menos importantes' },
                { id: 'text-white', name: 'Texto Branco', hex: '#ffffff', var: '--text-white', usage: 'Textos sobre fundos escuros' }
            ],
            borders: [
                { id: 'border-color', name: 'Borda Principal', hex: '#dee2e6', var: '--border-color', usage: 'Bordas de inputs, cards' },
                { id: 'border-light', name: 'Borda Clara', hex: '#e9ecef', var: '--border-light', usage: 'Bordas sutis' }
            ]
        };
 const itens=Object.values(DEFAULT_COLORS).flat(),porId=Object.fromEntries(itens.map(c=>[c.id,c]));
 function erro(m){return Object.assign(new Error(m),{status:400});}
 function patches(v){if(!v||typeof v!=='object'||Array.isArray(v)||!Object.keys(v).length||Object.keys(v).length>itens.length)throw erro('Informe cores válidas para a paleta.');const r={};for(const [id,hex]of Object.entries(v)){if(!Object.hasOwn(porId,id)||typeof hex!=='string'||!/^#[a-f0-9]{6}$/i.test(hex))throw erro('Cor inválida. Use um ID conhecido e hexadecimal #RRGGBB.');r[id]=hex.toLowerCase();}return r;}
 function normalizar(v){if(!v||typeof v!=='object'||Array.isArray(v))throw erro('Paleta inválida.');const p={};for(const [categoria,cores]of Object.entries(v)){if(!Object.hasOwn(DEFAULT_COLORS,categoria)||!Array.isArray(cores))throw erro('Categoria de cores inválida.');for(const c of cores){if(!c||!Object.hasOwn(porId,c.id)||!DEFAULT_COLORS[categoria].some(x=>x.id===c.id)||Object.hasOwn(p,c.id))throw erro('Identificador de cor inválido.');p[c.id]=c.hex;}}return montar(patches(p));}
 function montar(p={}){return Object.fromEntries(Object.entries(DEFAULT_COLORS).map(([k,a])=>[k,a.map(c=>({...c,hex:p[c.id]||c.hex}))]));}
 function valores(c){return Object.fromEntries(Object.values(c).flat().map(v=>[v.id,v.hex]));}
 return {DEFAULT_COLORS,itens,porId,patches,normalizar,montar,valores};
});
