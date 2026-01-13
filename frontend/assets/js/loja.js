/* =========================================
   LOJA.JS (Versão Final - Produção)
   ========================================= */

import { db, auth } from './firebase-config.js';
// ADICIONADO: doc e getDoc na importação abaixo para o Banner funcionar
import { 
    collection, getDocs, query, where, limit, startAfter, orderBy, doc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- VARIAVEIS GLOBAIS ---
let ultimoDoc = null;
let carregando = false;
let temMais = true;
const ITENS_POR_PAGINA = 12; 

// Estado dos filtros
let filtroAtivo = {
    marca: null,
    cat: null,
    busca: null
};

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Loja iniciada. DB status:", db ? "Conectado" : "Erro de Conexão");

    // 1. Carrega componentes visuais
    carregarBannerLoja();
    atualizarBadgeLoja();

    // 2. Lê filtros da URL (Vindo da Home ou links externos)
    const params = new URLSearchParams(window.location.search);
    const marca = params.get('marca');
    const cat = params.get('cat');
    const busca = params.get('busca'); // Correção: busca estava como 'categoria' no exemplo anterior, ajustado para padrão

    // 3. Configura eventos
    configurarSidebar();
    configurarBuscaHeader();

    // 4. Inicia a busca com os filtros da URL
    filtrarLoja(marca, cat, busca);
});

/* --- FUNÇÃO PRINCIPAL DE BUSCA --- */
async function buscarProdutosNoFirebase(reset = false) {
    if (carregando) return;
    if (!temMais && !reset) return;

    carregando = true;
    const container = document.getElementById('gradeProdutosLoja');
    const qtdResultados = document.getElementById('qtdResultados');
    
    // Se for reset, mostra o loader limpo
    if (reset) {
        if(container) {
            container.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:50px;">
                    <i class="fas fa-circle-notch fa-spin" style="font-size:30px; color:#ff6600;"></i>
                    <p style="margin-top:10px; color:#666;">Buscando produtos...</p>
                </div>`;
        }
        ultimoDoc = null;
        temMais = true;
        removerBotaoCarregarMais();
    }

    try {
        // Verifica conexão antes de tentar
        if (!db) throw new Error("Banco de dados não inicializado.");

        const produtosRef = collection(db, "produtos");
        let restricoes = [];

        // --- APLICAÇÃO DE FILTROS ---
        
        if (filtroAtivo.busca) {
            // Busca textual (Nome)
            const termo = filtroAtivo.busca; 
            restricoes.push(orderBy("nome"));
            restricoes.push(where("nome", ">=", termo));
            restricoes.push(where("nome", "<=", termo + '\uf8ff'));
        } 
        else if (filtroAtivo.marca && filtroAtivo.marca !== 'todas') {
            // Filtro de Marca (Exato)
            restricoes.push(where("marca", "==", filtroAtivo.marca)); 
        } 
        else if (filtroAtivo.cat && filtroAtivo.cat !== 'todas') {
            // Filtro de Categoria
            restricoes.push(where("categoria", "==", filtroAtivo.cat));
        }

        // Paginação
        restricoes.push(limit(ITENS_POR_PAGINA));
        if (!reset && ultimoDoc) {
            restricoes.push(startAfter(ultimoDoc));
        }

        // Executa Query
        const q = query(produtosRef, ...restricoes);
        const snapshot = await getDocs(q);

        if (reset && container) container.innerHTML = ''; // Limpa loader

        // --- RESULTADO VAZIO ---
        if (snapshot.empty) {
            temMais = false;
            if (reset && container) {
                container.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding: 40px; color: #666;">
                        <i class="fas fa-search" style="font-size: 40px; margin-bottom: 15px; opacity: 0.3;"></i>
                        <h3>Nenhum produto encontrado</h3>
                        <p>Tente ajustar os filtros ou buscar por outro termo.</p>
                        <button onclick="window.location.href='loja.html'" class="botao" style="margin-top:15px;">Ver Todos</button>
                    </div>`;
                if(qtdResultados) qtdResultados.innerText = "0 produtos";
            }
            return;
        }

        // --- SUCESSO ---
        ultimoDoc = snapshot.docs[snapshot.docs.length - 1];
        
        if(reset && qtdResultados) {
            qtdResultados.innerText = `${snapshot.size} produtos listados`;
        }

        snapshot.forEach((doc) => {
            let dados = doc.data();
            dados.id = doc.id;
            criarCardProduto(dados, container);
        });

        // Verifica se precisa do botão "Carregar Mais"
        if (snapshot.docs.length >= ITENS_POR_PAGINA) {
            adicionarBotaoCarregarMais(container);
        } else {
            temMais = false;
        }

    } catch (error) {
        console.error("Erro LOJA:", error);
        
        // Mensagem de erro amigável na tela
        if(reset && container) {
            container.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding: 40px; color: #d9534f;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 30px;"></i>
                    <p>Não foi possível carregar os produtos no momento.</p>
                </div>`;
        }
        
        // Dica para o desenvolvedor no console
        if(error.message.includes("index")) {
            console.warn("ALERTA FIREBASE: É necessário criar um índice composto. Verifique o link no console acima.");
        }
    } finally {
        carregando = false;
    }
}

/* --- RENDERIZAÇÃO (UI) --- */
function criarCardProduto(p, container) {
    if(!container) return;

    const card = document.createElement('div');
    card.classList.add('produto-card');
    
    // Tratamento seguro da imagem
    const imgUrl = p.imagem || p.img || p.urlImagem || './assets/images/sem-foto.png';
    
    // Tratamento seguro do preço
    let precoDisplay = "Consulte";
    if (p.preco) {
        let valor = parseFloat(p.preco.toString().replace(',', '.'));
        if (!isNaN(valor) && valor > 0) {
            precoDisplay = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
    }

    card.innerHTML = `
        <div class="img-container">
            <img src="${imgUrl}" alt="${p.nome}" onerror="this.src='./assets/images/sem-foto.png'">
        </div>
        <div class="produto-info">
            <span class="categoria-tag">${p.marca || p.categoria || 'Peça'}</span>
            <h3 title="${p.nome}">${p.nome}</h3>
            <p class="codigo">Cód: ${p.codigo || '--'}</p>
            <div class="preco-box">
                <span class="preco">${precoDisplay}</span>
            </div>
            <button class="botao-comprar btn-add-carrinho">
                <i class="fas fa-shopping-cart"></i> Comprar
            </button>
        </div>
    `;

    // Click no botão comprar
    const btn = card.querySelector('.btn-add-carrinho');
    if(btn) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            addCarrinhoLoja(p.id, p);
        });
    }

    // Click no card (Detalhamento)
    card.addEventListener('click', (e) => {
        if(!e.target.closest('.btn-add-carrinho')) {
            // window.location.href = `produto.html?id=${p.id}`;
        }
    });

    container.appendChild(card);
}

function adicionarBotaoCarregarMais(container) {
    removerBotaoCarregarMais();
    
    const div = document.createElement('div');
    div.id = "area-btn-carregar";
    div.style.gridColumn = "1/-1";
    div.style.textAlign = "center";
    div.style.marginTop = "30px";
    div.style.paddingBottom = "20px";
    
    div.innerHTML = `<button id="btnCarregarMais" class="botao botao-secundario">Carregar mais produtos</button>`;
    
    container.appendChild(div);

    const btn = document.getElementById('btnCarregarMais');
    if(btn) {
        btn.addEventListener('click', () => {
            buscarProdutosNoFirebase(false); 
        });
    }
}

function removerBotaoCarregarMais() {
    const area = document.getElementById('area-btn-carregar');
    if(area) area.remove();
}

/* --- GERENCIAMENTO DE FILTROS --- */
function filtrarLoja(marcaUrl, catUrl, buscaUrl) {
    // 1. Atualiza Variáveis
    filtroAtivo.marca = (marcaUrl && marcaUrl !== 'todas') ? marcaUrl : null;
    filtroAtivo.cat = (catUrl && catUrl !== 'todas') ? catUrl : null;
    filtroAtivo.busca = buscaUrl ? buscaUrl : null;

    // 2. Atualiza Interface (Título)
    const titulo = document.getElementById('tituloResultadoLoja');
    if(titulo) {
        if(filtroAtivo.busca) titulo.innerText = `Busca: "${filtroAtivo.busca}"`;
        else if(filtroAtivo.marca) titulo.innerText = `Marca: ${formatarTexto(filtroAtivo.marca)}`;
        else if(filtroAtivo.cat) titulo.innerText = `Categoria: ${formatarTexto(filtroAtivo.cat)}`;
        else titulo.innerText = "Catálogo Completo";
    }

    // 3. Atualiza Visual da Sidebar
    document.querySelectorAll('.filtro-item').forEach(item => {
        item.classList.remove('ativo'); 
        if(item.dataset.marca === marcaUrl || item.dataset.cat === catUrl) {
            item.classList.add('ativo');
        }
    });

    // 4. Dispara Busca
    buscarProdutosNoFirebase(true); 
}

// Auxiliar para deixar texto bonito (ex: volvo -> Volvo)
function formatarTexto(str) {
    if(!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/* --- EVENT LISTENERS --- */
function configurarSidebar() {
    const itens = document.querySelectorAll('.filtro-item');
    itens.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            const marca = item.dataset.marca;
            const cat = item.dataset.cat;
            
            // Atualiza URL sem recarregar (SPA feel)
            const url = new URL(window.location);
            
            if(marca) { 
                url.searchParams.set('marca', marca); 
                url.searchParams.delete('cat'); 
                url.searchParams.delete('busca'); 
                filtrarLoja(marca, null, null);
            } else if(cat) { 
                url.searchParams.set('cat', cat); 
                url.searchParams.delete('marca'); 
                url.searchParams.delete('busca');
                filtrarLoja(null, cat, null);
            } else {
                // Caso clique em "Ver todas"
                url.searchParams.delete('marca');
                url.searchParams.delete('cat');
                url.searchParams.delete('busca');
                filtrarLoja(null, null, null);
            }
            
            window.history.pushState({}, '', url);
        });
    });
}

function configurarBuscaHeader() {
    const btn = document.getElementById('btnBuscaLoja');
    const input = document.getElementById('campoBuscaLoja');
    
    if(btn && input) {
        const acaoBusca = () => { 
            const termo = input.value.trim();
            if(termo) {
                const url = new URL(window.location);
                url.searchParams.set('busca', termo);
                url.searchParams.delete('marca');
                url.searchParams.delete('cat');
                window.history.pushState({}, '', url);
                filtrarLoja(null, null, termo);
            }
        };
        btn.addEventListener('click', acaoBusca);
        input.addEventListener('keypress', (e) => { if(e.key === 'Enter') acaoBusca(); });
    }
}

/* --- BANNER --- */
async function carregarBannerLoja() {
    try {
        const docRef = doc(db, "configuracoes", "banner_site");
        const docSnap = await getDoc(docRef);
        const imgBanner = document.getElementById("bannerPrincipal");
        if (docSnap.exists() && imgBanner && docSnap.data().url) {
            imgBanner.src = docSnap.data().url;
        }
    } catch (e) {
        console.log("Banner: padrão utilizado ou erro ao carregar.");
    }
}

/* --- CARRINHO --- */
async function addCarrinhoLoja(id, produtoObj) {
    // 1. Recupera carrinho
    let carrinho = JSON.parse(localStorage.getItem('carrinhoDispemaq')) || [];
    
    // 2. Prepara preço numérico
    let precoNum = 0;
    if(produtoObj.preco) {
        // Limpeza básica para garantir que é numero
        let clean = produtoObj.preco.toString().replace('R$', '').trim();
        // Se usar virgula como decimal
        if(clean.includes(',')) clean = clean.replace('.', '').replace(',', '.');
        precoNum = parseFloat(clean);
    }

    // 3. Verifica duplicidade
    const index = carrinho.findIndex(x => x.id === id);
    if(index > -1) {
        carrinho[index].qtd += 1;
    } else {
        carrinho.push({
            id: produtoObj.id,
            nome: produtoObj.nome,
            img: produtoObj.imagem || produtoObj.img || './assets/images/sem-foto.png',
            preco: isNaN(precoNum) ? 0 : precoNum, 
            qtd: 1
        });
    }
    
    // 4. Salva e Atualiza
    localStorage.setItem('carrinhoDispemaq', JSON.stringify(carrinho));
    atualizarBadgeLoja();
    
    // 5. Feedback Visual
    // Verifica se a função global toggleCarrinho existe (geralmente no script.js)
    if(typeof toggleCarrinho === 'function') {
        toggleCarrinho(true); // Abre o carrinho
    } else {
        alert("Produto adicionado ao carrinho!");
    }
}

function atualizarBadgeLoja() {
    const carrinho = JSON.parse(localStorage.getItem('carrinhoDispemaq')) || [];
    const totalItens = carrinho.reduce((acc, item) => acc + item.qtd, 0);
    
    const badge = document.getElementById('badgeCarrinhoLoja');
    if(badge) {
        badge.innerText = totalItens;
        badge.style.display = totalItens > 0 ? 'flex' : 'none';
    }
    
    renderizarItensCarrinhoLateral(carrinho);
}

function renderizarItensCarrinhoLateral(carrinho) {
    const div = document.getElementById('itensCarrinhoHtml'); 
    const totalEl = document.getElementById('totalCarrinhoLateral');
    if(!div) return;
    
    div.innerHTML = "";
    let totalValor = 0;

    if(carrinho.length === 0) {
        div.innerHTML = "<p style='padding:20px; text-align:center; color:#888;'>Seu carrinho está vazio.</p>";
    } else {
        carrinho.forEach(item => {
            const subtotal = item.qtd * item.preco;
            totalValor += subtotal;
            
            div.innerHTML += `
                <div class="item-carrinho-lateral">
                    <img src="${item.img}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
                    <div class="info-item" style="flex:1; margin-left:10px;">
                        <div style="font-size:0.9rem; font-weight:bold;">${item.nome}</div>
                        <div style="font-size:0.8rem; color:#666;">${item.qtd}x ${item.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    </div>
                    <button onclick="removerDoCarrinhoLocal('${item.id}')" style="border:none; background:transparent; color:red; cursor:pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });
    }

    if(totalEl) totalEl.innerText = totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Global para o HTML acessar (necessário para o onclick do botão de remover)
window.removerDoCarrinhoLocal = function(id) {
    let carrinho = JSON.parse(localStorage.getItem('carrinhoDispemaq')) || [];
    carrinho = carrinho.filter(i => i.id !== id);
    localStorage.setItem('carrinhoDispemaq', JSON.stringify(carrinho));
    atualizarBadgeLoja();
}

// Garante que a função esteja disponível globalmente
window.atualizarBadgeLoja = atualizarBadgeLoja;