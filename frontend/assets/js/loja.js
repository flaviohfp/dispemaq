/* =========================================
   LOJA.JS (Versão Final - Escalável e Segura)
   ========================================= */

import { db, collection, getDocs, doc, getDoc, auth, query, where, limit, startAfter, orderBy } from './firebase-config.js';

// Variáveis de Estado (Controle da Paginação)
let ultimoDoc = null;      // Guarda o último item carregado para a próxima página
let carregando = false;    // Evita cliques duplos
let temMais = true;        // Sabe se ainda tem produtos no banco
const ITENS_POR_PAGINA = 12; 

// Estado atual dos filtros
let filtroAtivo = {
    marca: null,
    cat: null,
    busca: null
};

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Carrega o Banner do topo (Sua função original)
    carregarBannerLoja();

    // 2. Atualiza número do carrinho (Sua função original)
    atualizarBadgeLoja();

    // 3. Lê URL e Inicia a Busca (Substitui o carregamento total)
    const params = new URLSearchParams(window.location.search);
    const marca = params.get('marca');
    const cat = params.get('cat');
    const busca = params.get('busca'); // ou 'q'

    // Chama sua função de filtro, mas agora ela prepara o banco de dados
    filtrarLoja(marca, cat, busca);

    configurarSidebar();
    configurarBuscaHeader();
});

/* --- FUNÇÃO: CARREGAR BANNER (MANTIDA) --- */
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

/* --- FUNÇÃO PRINCIPAL DE BUSCA (NOVA LÓGICA DE ESCALABILIDADE) --- */
// Esta função substitui o "getDocs" solto que travava o site
async function buscarProdutosNoFirebase(reset = false) {
    if (carregando) return;
    if (!temMais && !reset) return;

    carregando = true;
    const container = document.getElementById('gradeProdutosLoja');
    const btnCarregar = document.getElementById('btnCarregarMais'); // Botão que criaremos dinamicamente

    if (reset) {
        container.innerHTML = '<div class="loader-centro" style="grid-column:1/-1; text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Buscando peças...</p></div>';
        ultimoDoc = null;
        temMais = true;
        if(btnCarregar) btnCarregar.remove();
    }

    try {
        const produtosRef = collection(db, "produtos");
        let q;
        let restricoes = [];

        // APLICAÇÃO DOS FILTROS (SERVER-SIDE)
        if (filtroAtivo.busca) {
            // Busca textual simples (Gambiarra oficial do Firebase para "começa com")
            // Requer índice no Firebase se combinar com outros campos
            const termo = filtroAtivo.busca;
            restricoes.push(orderBy("nome"));
            restricoes.push(where("nome", ">=", termo));
            restricoes.push(where("nome", "<=", termo + '\uf8ff'));
        } 
        else if (filtroAtivo.marca && filtroAtivo.marca !== 'todas') {
            restricoes.push(where("marca", "==", filtroAtivo.marca.toLowerCase())); // Garanta que no banco está minúsculo ou ajuste aqui
        } 
        else if (filtroAtivo.cat && filtroAtivo.cat !== 'todas') {
            restricoes.push(where("categoria", "==", filtroAtivo.cat.toLowerCase()));
        }

        // Paginação
        restricoes.push(limit(ITENS_POR_PAGINA));
        if (!reset && ultimoDoc) {
            restricoes.push(startAfter(ultimoDoc));
        }

        q = query(produtosRef, ...restricoes);
        
        const snapshot = await getDocs(q);

        if (reset) container.innerHTML = ''; // Limpa loader

        if (snapshot.empty) {
            temMais = false;
            if (reset) container.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding: 40px;">Nenhum produto encontrado.</p>`;
            carregando = false;
            return;
        }

        ultimoDoc = snapshot.docs[snapshot.docs.length - 1]; // Salva o ponto de parada

        // Renderiza
        snapshot.forEach((doc) => {
            let dados = doc.data();
            dados.id = doc.id;
            criarCardProduto(dados, container);
        });

        // Botão Carregar Mais
        if (snapshot.docs.length >= ITENS_POR_PAGINA) {
            adicionarBotaoCarregarMais(container);
        } else {
            temMais = false;
        }

    } catch (error) {
        console.error("Erro busca:", error);
        container.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:red;">Erro ao buscar dados. (Verifique índices no Console)</p>`;
        // Dica: Se der erro de índice, abra o console do navegador (F12) e clique no link que o Firebase fornece.
    } finally {
        carregando = false;
    }
}

/* --- FUNÇÃO VISUAL: CRIAR CARD (Extraída para organizar) --- */
function criarCardProduto(p, container) {
    const card = document.createElement('div');
    card.className = "dyn-card"; 
    card.style.cursor = "pointer";

    const img = p.img || p.urlImagem || './assets/images/placeholder.jpg'; 
    let precoNumerico = typeof p.preco === 'string' ? parseFloat(p.preco.replace(',', '.')) : parseFloat(p.preco);
    if(isNaN(precoNumerico)) precoNumerico = 0;

    card.innerHTML = `
        <div class="dyn-img-wrapper">
            ${p.promocao ? '<span class="badge-desconto" style="position:absolute;top:10px;left:10px;background:red;color:white;padding:2px 8px;border-radius:4px;font-size:12px;">Oferta</span>' : ''}
            <img src="${img}" alt="${p.nome}" onerror="this.src='./assets/images/placeholder.jpg'">
        </div>
        <div class="dyn-info">
            <span class="dyn-cat">${p.categoria || 'Peça'}</span>
            <h3 class="dyn-titulo">${p.nome}</h3>
            <span style="font-size:0.8rem; color:#888;">Cód: ${p.cod || p.codigo || '--'}</span>
            <div class="dyn-preco">
                R$ ${precoNumerico.toFixed(2).replace('.', ',')}
            </div>
            <button class="dyn-btn-comprar btn-comprar-js" data-id="${p.id}">
                <i class="fas fa-shopping-cart"></i> Adicionar
            </button>
        </div>
    `;

    // Evento de clique no card (Redireciona)
    card.addEventListener('click', (e) => {
        const clicouNoBotao = e.target.closest('.btn-comprar-js');
        if (!clicouNoBotao) {
            window.location.href = `produto.html?id=${p.id}`;
        }
    });

    // Evento de clique no botão (Adiciona Carrinho)
    const btn = card.querySelector('.btn-comprar-js');
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        addCarrinhoLoja(p.id, p); // Passamos o objeto P inteiro para evitar buscar de novo
    });

    container.appendChild(card);
}

function adicionarBotaoCarregarMais(container) {
    const antigo = document.getElementById('btnCarregarMais');
    if(antigo) antigo.remove();

    const div = document.createElement('div');
    div.style.gridColumn = "1/-1";
    div.style.textAlign = "center";
    div.style.marginTop = "20px";
    div.innerHTML = `<button id="btnCarregarMais" class="botao botao-secundario">Carregar Mais Produtos</button>`;
    
    container.appendChild(div);

    document.getElementById('btnCarregarMais').addEventListener('click', () => {
        div.remove(); // Remove botão para carregar novos
        buscarProdutosNoFirebase(false);
    });
}

/* --- FUNÇÃO: FILTRAR LOJA (ADAPTADA) --- */
// Agora ela atualiza o estado e dispara a busca no servidor
function filtrarLoja(marcaUrl, catUrl, buscaUrl) {
    
    // Atualiza variaveis globais
    filtroAtivo.marca = marcaUrl ? marcaUrl.toLowerCase() : null;
    filtroAtivo.cat = catUrl ? catUrl.toLowerCase() : null;
    filtroAtivo.busca = buscaUrl ? buscaUrl : null;

    // Atualiza Título da Página UI
    const titulo = document.getElementById('tituloResultadoLoja');
    const qtd = document.getElementById('qtdResultados'); // Esse ficará dinâmico
    
    if(titulo) {
        if(filtroAtivo.busca) titulo.innerText = `Busca: "${filtroAtivo.busca}"`;
        else if(filtroAtivo.marca && filtroAtivo.marca !== 'todas') titulo.innerText = `Marca: ${filtroAtivo.marca.toUpperCase()}`;
        else if(filtroAtivo.cat && filtroAtivo.cat !== 'todas') titulo.innerText = `Categoria: ${filtroAtivo.cat.toUpperCase()}`;
        else titulo.innerText = "Catálogo Completo";
    }
    
    // Dispara a busca real no banco
    buscarProdutosNoFirebase(true); // True = Resetar lista
}

/* --- SIDEBAR E BUSCA (UI) --- */
function configurarSidebar() {
    const itens = document.querySelectorAll('.filtro-item');
    itens.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active dos outros
            itens.forEach(i => i.style.fontWeight = 'normal');
            item.style.fontWeight = 'bold';

            const marca = item.dataset.marca;
            const cat = item.dataset.cat;
            
            // Redireciona via URL para manter histórico ou chama direto
            // Vamos fazer via reload suave chamando a função
            const url = new URL(window.location);
            if(marca) { url.searchParams.set('marca', marca); url.searchParams.delete('cat'); url.searchParams.delete('busca'); }
            if(cat) { url.searchParams.set('cat', cat); url.searchParams.delete('marca'); url.searchParams.delete('busca'); }
            if(marca === 'todas' || cat === 'todas') {
                 url.searchParams.delete('marca'); url.searchParams.delete('cat');
            }
            
            window.history.pushState({}, '', url);
            filtrarLoja(url.searchParams.get('marca'), url.searchParams.get('cat'), null);
        });
    });
}

function configurarBuscaHeader() {
    const btn = document.getElementById('btnBuscaLoja');
    const input = document.getElementById('campoBuscaLoja');
    if(btn && input) {
        const realizarBusca = () => { 
            if(input.value.trim()) {
                const termo = input.value.trim();
                const url = new URL(window.location);
                url.searchParams.set('busca', termo);
                url.searchParams.delete('marca');
                url.searchParams.delete('cat');
                window.history.pushState({}, '', url);
                filtrarLoja(null, null, termo);
            }
        };
        btn.addEventListener('click', realizarBusca);
        input.addEventListener('keypress', (e) => { if(e.key === 'Enter') realizarBusca(); });
    }
}

/* --- FUNÇÕES DO CARRINHO (MANTIDAS E PROTEGIDAS) --- */
// Pequeno ajuste: agora aceita o objeto 'produtoObj' opcional para não precisar buscar array
async function addCarrinhoLoja(id, produtoObj = null) {
    const user = auth.currentUser;
    
    if (!user) {
        // Exibe o popup que já existe no HTML em vez de alert
        const popup = document.getElementById('popupAvisoLogin');
        if(popup) popup.style.display = 'flex';
        else alert("Faça login para comprar.");
        return; 
    }

    let carrinho = JSON.parse(localStorage.getItem('dispemaq_carrinho')) || [];
    
    // Tenta usar o objeto passado, senão busca no DOM (fallback) ou Array antigo (não recomendado)
    // Como estamos paginando, não temos array global. Usamos o produtoObj passado pelo card.
    
    if(produtoObj) {
        let precoParaSalvar = typeof produtoObj.preco === 'string' 
            ? parseFloat(produtoObj.preco.replace(',', '.')) 
            : parseFloat(produtoObj.preco);

        const existe = carrinho.find(x => x.id === id);
        if(existe) {
            existe.qtd++;
        } else {
            carrinho.push({
                id: produtoObj.id,
                nome: produtoObj.nome,
                img: produtoObj.img || produtoObj.urlImagem,
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
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${item.img}" style="width:40px; height:40px; object-fit:cover;">
                    <div>
                        <strong style="font-size: 0.85rem; display:block;">${item.nome}</strong>
                        <small style="color:#888;">${item.qtd}x R$ ${precoUnitario.toFixed(2).replace('.', ',')}</small>
                    </div>
                </div>
                <div style="font-weight:bold; color:#1e3a8a;">
                    R$ ${subtotal.toFixed(2).replace('.', ',')}
                </div>
                <button onclick="removerDoCarrinhoLocal('${item.id}')" style="border:none; bg:none; color:red; cursor:pointer; margin-left:5px;">&times;</button>
            </div>
        `;
    });
}

// Função auxiliar global para remover item pelo carrinho lateral nesta página
window.removerDoCarrinhoLocal = function(id) {
    let carrinho = JSON.parse(localStorage.getItem('dispemaq_carrinho')) || [];
    carrinho = carrinho.filter(i => i.id !== id);
    localStorage.setItem('dispemaq_carrinho', JSON.stringify(carrinho));
    atualizarBadgeLoja();
}

window.atualizarBadgeLoja = atualizarBadgeLoja;
window.toggleCarrinho = function(e) {
    if(e) e.preventDefault();
    const c = document.getElementById('carrinhoLateral');
    const o = document.getElementById('overlay');
    c.classList.toggle('aberto');
    o.classList.toggle('ativo');
};