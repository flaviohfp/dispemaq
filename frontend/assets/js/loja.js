/* =========================================
   LOJA.JS (Versão Final com Clique no Card e Proteção)
   ========================================= */

import { db, collection, getDocs, doc, getDoc, auth } from './firebase-config.js';

let produtosLoja = [];

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Carrega o Banner do topo
    carregarBannerLoja();

    // 2. Atualiza número do carrinho
    atualizarBadgeLoja();

    const container = document.getElementById('gradeProdutosLoja');
    if(container) container.innerHTML = '<p style="grid-column:1/-1; text-align:center;">Carregando produtos...</p>';

    try {
        // 3. Busca produtos do Firebase
        const querySnapshot = await getDocs(collection(db, "produtos"));
        produtosLoja = [];
        
        querySnapshot.forEach((doc) => {
            let dados = doc.data();
            dados.id = doc.id; 
            produtosLoja.push(dados);
        });

        if (produtosLoja.length === 0 && container) {
            container.innerHTML = `<p style="grid-column:1/-1; text-align:center;">Nenhum produto cadastrado ainda.</p>`;
        }

    } catch (error) {
        console.error("Erro Firebase:", error);
        if(container) container.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:red;">Erro ao conectar com o banco de dados.</p>`;
    }

    // 4. Configura filtros vindos da URL
    const params = new URLSearchParams(window.location.search);
    filtrarLoja(params.get('marca'), params.get('cat'), params.get('busca'));

    configurarSidebar();
    configurarBuscaHeader();
});

/* --- FUNÇÃO: CARREGAR BANNER --- */
async function carregarBannerLoja() {
    try {
        const docRef = doc(db, "configuracoes", "banner_site");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const dados = docSnap.data();
            const imgBanner = document.getElementById("bannerPrincipal");
            
            if(imgBanner && dados.url) {
                imgBanner.src = dados.url;
            }
        }
    } catch (error) {
        console.log("Banner: usando padrão ou erro de conexão.");
    }
}

/* --- FUNÇÕES DE FILTRO E EXIBIÇÃO --- */
function filtrarLoja(marcaUrl, catUrl, buscaUrl) {
    const container = document.getElementById('gradeProdutosLoja');
    if (!container || (produtosLoja.length === 0 && container.innerText.includes("Erro"))) return;

    container.innerHTML = ""; 

    const m = marcaUrl ? marcaUrl.toLowerCase() : null;
    const c = catUrl ? catUrl.toLowerCase() : null;
    const b = buscaUrl ? buscaUrl.toLowerCase() : null;

    const resultados = produtosLoja.filter(p => {
        let okMarca = (m && m !== 'todas') ? (p.marca && p.marca.toLowerCase().includes(m)) : true;
        let okCat = (c && c !== 'todas') ? (p.categoria && p.categoria.toLowerCase() === c) : true;
        let okBusca = true;
        
        if (b) {
            const nome = p.nome ? p.nome.toLowerCase() : "";
            const cod = p.cod ? p.cod.toLowerCase() : "";
            okBusca = nome.includes(b) || cod.includes(b);
        }
        return okMarca && okCat && okBusca;
    });

    // Atualiza Título da Página
    const titulo = document.getElementById('tituloResultadoLoja');
    const qtd = document.getElementById('qtdResultados');
    
    if(titulo) {
        if(b) titulo.innerText = `Busca: "${buscaUrl}"`;
        else if(m && m !== 'todas') titulo.innerText = `Marca: ${m.toUpperCase()}`;
        else if(c && c !== 'todas') titulo.innerText = `Categoria: ${c.toUpperCase()}`;
        else titulo.innerText = "Todos os Produtos";
    }

    if(qtd) qtd.innerText = `${resultados.length} produtos encontrados`;

    // Desenha os cards
    if (resultados.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px;">Nenhum produto encontrado com estes filtros.</div>`;
    } else {
        resultados.forEach(p => {
            const card = document.createElement('div');
            card.className = "dyn-card"; 
            
            // [NOVO] Adiciona cursor de clique ao card
            card.style.cursor = "pointer";

            const img = p.img || './assets/images/placeholder.jpg'; 

            // Tratamento de preço
            let precoNumerico = 0;
            if (typeof p.preco === 'string') {
                precoNumerico = parseFloat(p.preco.replace(',', '.'));
            } else {
                precoNumerico = parseFloat(p.preco);
            }
            if(isNaN(precoNumerico)) precoNumerico = 0;

            card.innerHTML = `
                <div class="dyn-img-wrapper">
                    <img src="${img}" alt="${p.nome}" onerror="this.src='./assets/images/placeholder.jpg'">
                </div>
                <div class="dyn-info">
                    <span class="dyn-cat">${p.categoria || 'PEÇA'}</span>
                    <h3 class="dyn-titulo">${p.nome}</h3>
                    <div class="dyn-preco">
                        R$ ${precoNumerico.toFixed(2).replace('.', ',')}
                    </div>
                    <button class="dyn-btn-comprar btn-comprar-js" data-id="${p.id}">
                        <i class="fas fa-shopping-cart"></i> Adicionar
                    </button>
                </div>
            `;

            // [NOVO] Lógica de redirecionamento ao clicar no CARD
            card.addEventListener('click', (e) => {
                // Verifica se o elemento clicado (ou seus pais) NÃO É o botão de comprar
                const clicouNoBotao = e.target.closest('.btn-comprar-js');
                
                if (!clicouNoBotao) {
                    // Se não clicou no botão, vai para a página do produto
                    // Supondo que sua página de detalhes se chame 'produto.html'
                    window.location.href = `produto.html?id=${p.id}`;
                }
            });

            container.appendChild(card);
        });

        // Evento exclusivo do botão de comprar (mantido)
        document.querySelectorAll('.btn-comprar-js').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // O stopPropagation garante que o clique no botão não ative o clique do card (redundância de segurança)
                e.stopPropagation(); 
                const id = e.currentTarget.getAttribute('data-id');
                addCarrinhoLoja(id);
            });
        });
    }
}

function configurarSidebar() {
    const itens = document.querySelectorAll('.filtro-item');
    itens.forEach(item => {
        item.addEventListener('click', () => {
            const params = new URLSearchParams(window.location.search);
            
            if(item.dataset.marca) params.set('marca', item.dataset.marca);
            if(item.dataset.cat) params.set('cat', item.dataset.cat);
            
            if(item.dataset.marca === 'todas') params.delete('marca');
            if(item.dataset.cat === 'todas') params.delete('cat');
            
            if(item.dataset.marca || item.dataset.cat) params.delete('busca');
            
            window.location.href = `loja.html?${params.toString()}`;
        });
    });
}

function configurarBuscaHeader() {
    const btn = document.getElementById('btnBuscaLoja');
    const input = document.getElementById('campoBuscaLoja');
    if(btn && input) {
        const busca = () => { 
            if(input.value.trim()) {
                window.location.href = `loja.html?busca=${encodeURIComponent(input.value.trim())}`;
            }
        };
        btn.addEventListener('click', busca);
        input.addEventListener('keypress', (e) => { if(e.key === 'Enter') busca(); });
    }
}

/* --- FUNÇÕES DO CARRINHO (COM PROTEÇÃO DE LOGIN) --- */
function addCarrinhoLoja(id) {
    const user = auth.currentUser;
    
    if (!user) {
        alert("🔒 Atenção: Para adicionar itens ao carrinho, você precisa fazer login ou criar uma conta.");
        window.location.href = "login.html";
        return; 
    }

    let carrinho = JSON.parse(localStorage.getItem('dispemaq_carrinho')) || [];
    const prod = produtosLoja.find(p => p.id === id);
    
    if(prod) {
        let precoParaSalvar = typeof prod.preco === 'string' 
            ? parseFloat(prod.preco.replace(',', '.')) 
            : parseFloat(prod.preco);

        const existe = carrinho.find(x => x.id === id);
        if(existe) {
            existe.qtd++;
        } else {
            carrinho.push({
                ...prod, 
                preco: precoParaSalvar, 
                qtd: 1
            });
        }
        
        localStorage.setItem('dispemaq_carrinho', JSON.stringify(carrinho));
        atualizarBadgeLoja();
        
        const sidebar = document.getElementById('carrinhoLateral');
        const overlay = document.getElementById('overlay');
        if(sidebar) sidebar.classList.add('aberto');
        if(overlay) overlay.classList.add('ativo');
    }
}

function atualizarBadgeLoja() {
    const carrinho = JSON.parse(localStorage.getItem('dispemaq_carrinho')) || [];
    const total = carrinho.reduce((acc, i) => acc + i.qtd, 0);
    const badge = document.getElementById('badgeCarrinhoLoja');
    
    if(badge) {
        badge.innerText = total;
        badge.style.display = total > 0 ? 'flex' : 'none';
    }
    renderizarItensCarrinhoLateral(carrinho);
}

function renderizarItensCarrinhoLateral(carrinho) {
    const div = document.getElementById('itensCarrinhoHtml'); 
    if(!div) return;
    
    if(carrinho.length === 0) {
        div.innerHTML = "<p style='padding:20px; text-align:center; color: #666;'>Seu carrinho está vazio.</p>";
        return;
    }

    div.innerHTML = "";
    carrinho.forEach(item => {
        const precoUnitario = parseFloat(item.preco);
        const subtotal = item.qtd * precoUnitario;

        div.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #eee;">
                <div>
                    <strong style="font-size: 0.95rem;">${item.nome}</strong><br>
                    <small style="color:#888;">${item.qtd}x R$ ${precoUnitario.toFixed(2).replace('.', ',')}</small>
                </div>
                <div style="font-weight:bold; color:#333;">
                    R$ ${subtotal.toFixed(2).replace('.', ',')}
                </div>
            </div>
        `;
    });
}

window.atualizarBadgeLoja = atualizarBadgeLoja;