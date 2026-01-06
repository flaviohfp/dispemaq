/* =========================================
   LOJA.JS (Versão de Correção e Diagnóstico)
   ========================================= */

import { db, collection, getDocs, doc, getDoc, auth, query, where, limit, startAfter, orderBy } from './firebase-config.js';

// Variáveis de Controle
let ultimoDoc = null;
let carregando = false;
let temMais = true;
const ITENS_POR_PAGINA = 12; 

// Estado atual dos filtros
let filtroAtivo = {
    marca: null,
    cat: null,
    busca: null
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Loja iniciada. Verificando DOM...");
    
    // 1. Carrega Banner
    carregarBannerLoja();

    // 2. Atualiza Carrinho
    atualizarBadgeLoja();

    // 3. Verifica se os elementos HTML existem
    const grade = document.getElementById('gradeProdutosLoja');
    if (!grade) {
        console.error("❌ ERRO CRÍTICO: Não encontrei a <div id='gradeProdutosLoja'> no HTML.");
        alert("Erro no HTML: Falta a div com id 'gradeProdutosLoja'");
        return;
    }

    // 4. Lê URL
    const params = new URLSearchParams(window.location.search);
    // Truque: Se veio da home, pega o valor direto sem converter para minúsculo primeiro para testar
    const marca = params.get('marca'); 
    const cat = params.get('cat');
    const busca = params.get('busca');

    // 5. Inicia a busca
    filtrarLoja(marca, cat, busca);

    // 6. Ativa os cliques (Sidebar e Busca)
    configurarSidebar();
    configurarBuscaHeader();
});

/* --- BUSCA NO FIREBASE (CORRIGIDA) --- */
async function buscarProdutosNoFirebase(reset = false) {
    if (carregando) return;
    if (!temMais && !reset) return;

    carregando = true;
    const container = document.getElementById('gradeProdutosLoja');

    if (reset) {
        container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Carregando catálogo...</p></div>';
        ultimoDoc = null;
        temMais = true;
        removerBotaoCarregar();
    }

    try {
        const produtosRef = collection(db, "produtos");
        let q;
        let restricoes = [];

        console.log("🔍 Buscando com filtros:", filtroAtivo);

        // --- LÓGICA DE FILTROS ---
        // Se houver busca por texto
        if (filtroAtivo.busca) {
            // Nota: Busca textual simples
            const termo = filtroAtivo.busca; 
            restricoes.push(orderBy("nome"));
            restricoes.push(where("nome", ">=", termo));
            restricoes.push(where("nome", "<=", termo + '\uf8ff'));
        } 
        // Se houver Marca (REMOVE O toLowerCase para testar compatibilidade)
        else if (filtroAtivo.marca && filtroAtivo.marca !== 'todas') {
            // Tenta buscar exato primeiro. Se você cadastrou "Caterpillar", tem que buscar "Caterpillar"
            restricoes.push(where("marca", "==", filtroAtivo.marca)); 
        } 
        // Se houver Categoria
        else if (filtroAtivo.cat && filtroAtivo.cat !== 'todas') {
            restricoes.push(where("categoria", "==", filtroAtivo.cat));
        }

        // Ordenação Padrão (Se não tiver busca por texto)
        if (!filtroAtivo.busca) {
            // Opcional: ordenar por data ou nome se tiver índice criado
            // restricoes.push(orderBy("nome")); 
        }

        // Paginação
        restricoes.push(limit(ITENS_POR_PAGINA));
        
        if (!reset && ultimoDoc) {
            restricoes.push(startAfter(ultimoDoc));
        }

        // Monta a Query
        q = query(produtosRef, ...restricoes);
        
        // Executa
        const snapshot = await getDocs(q);

        if (reset) container.innerHTML = '';

        if (snapshot.empty) {
            console.warn("⚠️ A busca retornou vazia.");
            temMais = false;
            if (reset) {
                container.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding: 40px;">
                        <h3>Nenhum produto encontrado.</h3>
                        <p>Filtro usado: ${JSON.stringify(filtroAtivo)}</p>
                        <button onclick="window.location.href='loja.html'" class="botao botao-primario">Ver Tudo</button>
                    </div>`;
            }
            carregando = false;
            return;
        }

        ultimoDoc = snapshot.docs[snapshot.docs.length - 1];

        snapshot.forEach((doc) => {
            let dados = doc.data();
            dados.id = doc.id;
            criarCardProduto(dados, container);
        });

        if (snapshot.docs.length >= ITENS_POR_PAGINA) {
            adicionarBotaoCarregarMais(container);
        } else {
            temMais = false;
        }

    } catch (error) {
        console.error("❌ ERRO FIREBASE:", error);
        
        let mensagemErro = "Erro ao buscar produtos.";
        
        // IDENTIFICA O ERRO DO ÍNDICE
        if (error.message.includes("requires an index")) {
            mensagemErro = `
                <strong>⚠️ ATENÇÃO DESENVOLVEDOR:</strong><br>
                O Firebase bloqueou a busca porque falta um Índice.<br>
                1. Abra o Console do Navegador (F12).<br>
                2. Procure uma linha vermelha de erro.<br>
                3. Clique no link longo que começa com https://console.firebase...<br>
                4. Crie o índice e espere 2 minutos.
            `;
        } else {
            mensagemErro += ` (${error.message})`;
        }

        container.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:red; border:1px solid red; padding:20px;">${mensagemErro}</div>`;
    } finally {
        carregando = false;
    }
}

/* --- RENDERIZAÇÃO --- */
function criarCardProduto(p, container) {
    const card = document.createElement('div');
    card.className = "dyn-card animate-fade-in"; 
    // Garante estilo pointer
    card.style.cursor = "pointer";

    const img = p.img || p.urlImagem || './assets/images/placeholder.jpg'; 
    let preco = p.preco || 0;
    // Tenta converter se for string
    if(typeof preco === 'string') preco = parseFloat(preco.replace(',','.'));
    if(isNaN(preco)) preco = 0;

    card.innerHTML = `
        <div class="dyn-img-wrapper">
            ${p.promocao ? '<span class="badge-desconto" style="position:absolute;top:10px;left:10px;background:#ff6600;color:white;padding:2px 8px;border-radius:4px;font-size:12px;z-index:2;">Oferta</span>' : ''}
            <img src="${img}" alt="${p.nome}" style="width:100%; height:100%; object-fit:cover;">
        </div>
        <div class="dyn-info">
            <span class="dyn-cat">${p.categoria || 'Geral'}</span>
            <h3 class="dyn-titulo">${p.nome}</h3>
            <span style="font-size:0.8rem; color:#888;">Cód: ${p.cod || '--'}</span>
            <div class="dyn-preco">
                R$ ${preco.toFixed(2).replace('.', ',')}
            </div>
            <button class="dyn-btn-comprar btn-add-carrinho" type="button">
                <i class="fas fa-shopping-cart"></i> Adicionar
            </button>
        </div>
    `;

    // CLIQUE NO CARD (IR PARA PRODUTO)
    card.addEventListener('click', (e) => {
        // Se NÃO clicou no botão de comprar, vai para o produto
        if (!e.target.closest('.btn-add-carrinho')) {
            console.log("Indo para produto:", p.id);
            window.location.href = `produto.html?id=${p.id}`;
        }
    });

    // CLIQUE NO BOTÃO (ADICIONAR AO CARRINHO)
    const btn = card.querySelector('.btn-add-carrinho');
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Impede que o clique suba para o card
        e.preventDefault();
        addCarrinhoLoja(p.id, p);
    });

    container.appendChild(card);
}

function adicionarBotaoCarregarMais(container) {
    removerBotaoCarregar();
    const div = document.createElement('div');
    div.id = "area-btn-mais";
    div.style.gridColumn = "1/-1";
    div.style.textAlign = "center";
    div.style.marginTop = "20px";
    div.innerHTML = `<button id="btnCarregarMais" class="botao botao-secundario">Carregar Mais Produtos</button>`;
    container.appendChild(div);

    document.getElementById('btnCarregarMais').addEventListener('click', () => {
        buscarProdutosNoFirebase(false);
    });
}

function removerBotaoCarregar() {
    const area = document.getElementById("area-btn-mais");
    if(area) area.remove();
}

/* --- FILTROS E SIDEBAR --- */
function filtrarLoja(marca, cat, busca) {
    filtroAtivo.marca = marca; // Removemos o toLowerCase() forçado para evitar erro
    filtroAtivo.cat = cat;
    filtroAtivo.busca = busca;

    const titulo = document.getElementById('tituloResultadoLoja');
    if(titulo) {
        if(busca) titulo.innerText = `Busca: "${busca}"`;
        else if(marca) titulo.innerText = `Marca: ${marca}`;
        else if(cat) titulo.innerText = `Categoria: ${cat}`;
        else titulo.innerText = "Todos os Produtos";
    }

    buscarProdutosNoFirebase(true);
}

function configurarSidebar() {
    // Pega todos os links da sidebar
    const itens = document.querySelectorAll('.filtro-item');
    console.log(`Sidebar configurada: ${itens.length} botões encontrados.`);

    itens.forEach(item => {
        item.addEventListener('click', (e) => {
            // Evita comportamento padrão se for link
            e.preventDefault(); 
            
            // Pega o valor exato do HTML (data-marca="Caterpillar")
            const marca = item.getAttribute('data-marca');
            const cat = item.getAttribute('data-cat');
            
            console.log("Clique filtro:", marca, cat);

            // Atualiza URL sem recarregar a página (opcional, mas bom pra UX)
            const url = new URL(window.location);
            
            // Limpa filtros anteriores
            url.searchParams.delete('marca');
            url.searchParams.delete('cat');
            url.searchParams.delete('busca');

            if(marca && marca !== 'todas') url.searchParams.set('marca', marca);
            if(cat && cat !== 'todas') url.searchParams.set('cat', cat);

            window.history.pushState({}, '', url);

            // Chama o filtro
            filtrarLoja(marca === 'todas' ? null : marca, cat === 'todas' ? null : cat, null);
        });
    });
}

function configurarBuscaHeader() {
    const btn = document.getElementById('btnBuscaLoja');
    const input = document.getElementById('campoBuscaLoja');
    
    const realizarBusca = () => {
        if(input && input.value.trim()) {
            const termo = input.value.trim();
            window.location.href = `loja.html?busca=${encodeURIComponent(termo)}`;
        }
    };

    if(btn) btn.addEventListener('click', realizarBusca);
    if(input) input.addEventListener('keypress', (e) => { if(e.key === 'Enter') realizarBusca(); });
}

/* --- CARRINHO --- */
async function addCarrinhoLoja(id, produtoObj) {
    const user = auth.currentUser;
    if (!user) {
        const popup = document.getElementById('popupAvisoLogin');
        if(popup) popup.style.display = 'flex';
        else alert("Faça login para comprar.");
        return; 
    }

    let carrinho = JSON.parse(localStorage.getItem('dispemaq_carrinho')) || [];
    const existe = carrinho.find(x => x.id === id);
    
    // Converte preço
    let pFinal = 0;
    if(produtoObj.preco) {
        pFinal = typeof produtoObj.preco === 'string' ? parseFloat(produtoObj.preco.replace(',','.')) : produtoObj.preco;
    }

    if(existe) {
        existe.qtd++;
    } else {
        carrinho.push({
            id: id,
            nome: produtoObj.nome,
            img: produtoObj.img || produtoObj.urlImagem,
            preco: pFinal,
            qtd: 1
        });
    }
    
    localStorage.setItem('dispemaq_carrinho', JSON.stringify(carrinho));
    atualizarBadgeLoja();
    
    // Abre sidebar
    const sidebar = document.getElementById('carrinhoLateral');
    const overlay = document.getElementById('overlay');
    if(sidebar) sidebar.classList.add('aberto');
    if(overlay) overlay.classList.add('ativo');
}

function atualizarBadgeLoja() {
    const carrinho = JSON.parse(localStorage.getItem('dispemaq_carrinho')) || [];
    const total = carrinho.reduce((acc, i) => acc + i.qtd, 0);
    const badge = document.getElementById('badgeCarrinhoLoja');
    if(badge) {
        badge.innerText = total;
        badge.style.display = total > 0 ? 'flex' : 'none';
    }
    
    const div = document.getElementById('itensCarrinhoHtml');
    if(div) {
        div.innerHTML = carrinho.length ? '' : '<p style="padding:20px;text-align:center;">Carrinho Vazio</p>';
        carrinho.forEach(item => {
            div.innerHTML += `
                <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
                    <div>${item.qtd}x ${item.nome}</div>
                    <div>R$ ${(item.qtd * item.preco).toFixed(2)}</div>
                    <button onclick="removerItemLoja('${item.id}')" style="color:red;border:none;background:none;">&times;</button>
                </div>`;
        });
    }
}

// Banner
async function carregarBannerLoja() {
    try {
        const docSnap = await getDoc(doc(db, "configuracoes", "banner_site"));
        if (docSnap.exists()) {
            const img = document.getElementById("bannerPrincipal");
            if(img) img.src = docSnap.data().url;
        }
    } catch(e) { console.log("Banner padrão"); }
}

// Globais necessárias
window.removerItemLoja = function(id) {
    let c = JSON.parse(localStorage.getItem('dispemaq_carrinho')) || [];
    c = c.filter(x => x.id !== id);
    localStorage.setItem('dispemaq_carrinho', JSON.stringify(c));
    atualizarBadgeLoja();
}
window.toggleCarrinho = function(e) {
    if(e) e.preventDefault();
    document.getElementById('carrinhoLateral').classList.toggle('aberto');
    document.getElementById('overlay').classList.toggle('ativo');
}