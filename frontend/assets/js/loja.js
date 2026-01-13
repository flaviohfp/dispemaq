/* =========================================
   LOJA.JS (Corrigido e Funcional)
   ========================================= */

// 1. IMPORTAÇÕES CORRETAS
// Trazemos 'db' e 'auth' do seu arquivo de configuração
import { db, auth } from './firebase-config.js';
// Trazemos as ferramentas de banco de dados direto da fonte oficial para não dar erro
import { 
    collection, getDocs, doc, getDoc, query, where, limit, startAfter, orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Variáveis de Estado (Controle da Paginação)
let ultimoDoc = null;      // Guarda o último item carregado
let carregando = false;    // Evita cliques duplos
let temMais = true;        // Sabe se ainda tem produtos
const ITENS_POR_PAGINA = 12; 

// Estado atual dos filtros
let filtroAtivo = {
    marca: null,
    cat: null,
    busca: null
};

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Carrega Banner
    carregarBannerLoja();

    // 2. Atualiza Carrinho Visual
    atualizarBadgeLoja();

    // 3. Lê URL para ver se tem filtros ativos (ex: link vindo do Google ou Index)
    const params = new URLSearchParams(window.location.search);
    const marca = params.get('marca');
    const cat = params.get('cat');
    const busca = params.get('busca');

    // 4. Configura os cliques da sidebar e busca
    configurarSidebar();
    configurarBuscaHeader();

    // 5. Inicia a busca no Banco de Dados
    filtrarLoja(marca, cat, busca);
});

/* --- FUNÇÃO PRINCIPAL DE BUSCA (BACKEND FIREBASE) --- */
async function buscarProdutosNoFirebase(reset = false) {
    if (carregando) return;
    if (!temMais && !reset) return;

    carregando = true;
    const container = document.getElementById('gradeProdutosLoja');
    const qtdResultados = document.getElementById('qtdResultados'); // Elemento de texto
    
    // Se for um reset (nova filtragem), limpa a tela
    if (reset) {
        container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:#ff6600"></i><p>Buscando peças...</p></div>';
        ultimoDoc = null;
        temMais = true;
        removerBotaoCarregarMais();
    }

    try {
        const produtosRef = collection(db, "produtos");
        let restricoes = [];

        // --- LÓGICA DE FILTROS ---
        // OBS: No Firebase, se usar 'where' e 'orderBy' juntos, precisa criar um Índice no console.
        
        if (filtroAtivo.busca) {
            // Busca por nome (Simulação de "Começa com")
            const termo = filtroAtivo.busca; 
            // Dica: Para busca funcionar bem, idealmente salve um campo 'nome_busca' tudo minusculo no banco
            restricoes.push(orderBy("nome"));
            restricoes.push(where("nome", ">=", termo));
            restricoes.push(where("nome", "<=", termo + '\uf8ff'));
        } 
        else if (filtroAtivo.marca && filtroAtivo.marca !== 'todas') {
            // CORREÇÃO: Removemos o .toLowerCase() forçado para bater com o banco se estiver Maiúsculo
            // Tenta filtrar. Se seu banco usa 'Caterpillar' e o filtro é 'caterpillar', não acha. 
            // O ideal é padronizar no banco. Aqui vamos tentar buscar exato.
            restricoes.push(where("marca", "==", filtroAtivo.marca)); 
        } 
        else if (filtroAtivo.cat && filtroAtivo.cat !== 'todas') {
            restricoes.push(where("categoria", "==", filtroAtivo.cat));
        }

        // Paginação
        restricoes.push(limit(ITENS_POR_PAGINA));
        
        if (!reset && ultimoDoc) {
            restricoes.push(startAfter(ultimoDoc));
        }

        // Monta e executa a Query
        const q = query(produtosRef, ...restricoes);
        const snapshot = await getDocs(q);

        if (reset) container.innerHTML = ''; // Remove o loader

        // Se não achou nada
        if (snapshot.empty) {
            temMais = false;
            if (reset) {
                container.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding: 40px; color: #666;">
                        <i class="fas fa-search" style="font-size: 30px; margin-bottom: 10px; opacity: 0.5;"></i>
                        <p>Nenhum produto encontrado para este filtro.</p>
                        <button onclick="filtrarLoja('todas', 'todas', null)" style="margin-top:10px; padding:5px 15px; cursor:pointer;">Limpar Filtros</button>
                    </div>`;
                if(qtdResultados) qtdResultados.innerText = "0 produtos encontrados";
            }
            carregando = false;
            return;
        }

        // Atualiza paginação
        ultimoDoc = snapshot.docs[snapshot.docs.length - 1];
        
        if(reset && qtdResultados) {
            qtdResultados.innerText = `${snapshot.size} produtos mostrados (carregue mais para ver outros)`;
        }

        // RENDERIZAÇÃO
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
        console.error("Erro na busca:", error);
        
        // Tratamento de erro específico de Índice do Firestore
        if(error.message.includes("index")) {
            container.innerHTML = `<p style="grid-column:1/-1; color:red; text-align:center;">Erro de Configuração: É necessário criar um índice no Firebase Console para esta combinação de filtros.<br><br>Abra o console do navegador (F12) para ver o link de criação automática.</p>`;
        } else {
            container.innerHTML = `<p style="grid-column:1/-1; text-align:center;">Erro ao carregar produtos. Verifique sua conexão.</p>`;
        }
    } finally {
        carregando = false;
    }
}

/* --- FUNÇÃO VISUAL: CRIAR CARD --- */
function criarCardProduto(p, container) {
    const card = document.createElement('div');
    card.classList.add('produto-card'); // Usando a classe CSS original da loja
    
    // Tratamento de Imagem
    const imgUrl = p.imagem || p.img || p.urlImagem || './assets/images/sem-foto.png';
    
    // Tratamento de Preço
    let precoDisplay = "Consulte";
    if (p.preco) {
        let valor = parseFloat(p.preco.toString().replace(',', '.'));
        if (!isNaN(valor)) {
            precoDisplay = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
    }

    card.innerHTML = `
        <div class="img-container">
            <img src="${imgUrl}" alt="${p.nome}">
        </div>
        <div class="produto-info">
            <span class="categoria-tag">${p.marca || 'Peça'}</span>
            <h3>${p.nome}</h3>
            <p class="codigo">Cód: ${p.codigo || 'N/A'}</p>
            <div class="preco-box">
                <span class="preco">${precoDisplay}</span>
            </div>
            <button class="botao-comprar btn-add-carrinho" data-id="${p.id}">
                <i class="fas fa-shopping-cart"></i> Comprar
            </button>
        </div>
    `;

    // Evento: Adicionar ao Carrinho
    const btn = card.querySelector('.btn-add-carrinho');
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Não abrir o detalhe do produto
        addCarrinhoLoja(p.id, p);
    });

    // Evento: Clicar no card leva aos detalhes (opcional)
    // Se você tiver uma página produto-detalhe.html, descomente abaixo:
    /*
    card.addEventListener('click', (e) => {
        if(!e.target.closest('.btn-add-carrinho')) {
            window.location.href = `produto.html?id=${p.id}`;
        }
    });
    */

    container.appendChild(card);
}

/* --- CONTROLE DO BOTÃO CARREGAR MAIS --- */
function adicionarBotaoCarregarMais(container) {
    removerBotaoCarregarMais();
    
    const div = document.createElement('div');
    div.id = "area-btn-carregar";
    div.style.gridColumn = "1/-1";
    div.style.textAlign = "center";
    div.style.marginTop = "20px";
    
    div.innerHTML = `<button id="btnCarregarMais" class="botao botao-secundario">Ver mais produtos</button>`;
    
    container.appendChild(div);

    document.getElementById('btnCarregarMais').addEventListener('click', () => {
        buscarProdutosNoFirebase(false); // False = não reseta, adiciona ao final
    });
}

function removerBotaoCarregarMais() {
    const area = document.getElementById('area-btn-carregar');
    if(area) area.remove();
}

/* --- FUNÇÃO: FILTRAR E ATUALIZAR ESTADO --- */
function filtrarLoja(marcaUrl, catUrl, buscaUrl) {
    console.log("Filtrando:", { marcaUrl, catUrl, buscaUrl });

    // Atualiza estado global
    filtroAtivo.marca = (marcaUrl && marcaUrl !== 'todas') ? marcaUrl : null;
    filtroAtivo.cat = (catUrl && catUrl !== 'todas') ? catUrl : null;
    filtroAtivo.busca = buscaUrl ? buscaUrl : null;

    // Atualiza Título da Página (UI)
    const titulo = document.getElementById('tituloResultadoLoja');
    if(titulo) {
        if(filtroAtivo.busca) titulo.innerText = `Resultados para: "${filtroAtivo.busca}"`;
        else if(filtroAtivo.marca) titulo.innerText = `Marca: ${filtroAtivo.marca.charAt(0).toUpperCase() + filtroAtivo.marca.slice(1)}`;
        else if(filtroAtivo.cat) titulo.innerText = `Categoria: ${filtroAtivo.cat.charAt(0).toUpperCase() + filtroAtivo.cat.slice(1)}`;
        else titulo.innerText = "Todos os Produtos";
    }

    // Reset visual dos filtros na sidebar
    document.querySelectorAll('.filtro-item').forEach(item => {
        item.classList.remove('ativo');
        // Verifica se é o filtro atual e marca
        if(item.dataset.marca === marcaUrl || item.dataset.cat === catUrl) {
            item.classList.add('ativo');
        }
    });

    // Chama a busca real
    buscarProdutosNoFirebase(true); 
}

/* --- LISTENERS: SIDEBAR E BUSCA --- */
function configurarSidebar() {
    const itens = document.querySelectorAll('.filtro-item');
    itens.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            const marca = item.dataset.marca;
            const cat = item.dataset.cat;
            
            // Atualiza URL sem recarregar (UX melhor)
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
            }
            
            window.history.pushState({}, '', url);
        });
    });
}

function configurarBuscaHeader() {
    const btn = document.getElementById('btnBuscaLoja');
    const input = document.getElementById('campoBuscaLoja');
    
    if(btn && input) {
        const realizarBusca = () => { 
            const termo = input.value.trim();
            if(termo) {
                // Limpa outros filtros
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

/* --- BANNER (Mantido) --- */
async function carregarBannerLoja() {
    try {
        const docRef = doc(db, "configuracoes", "banner_site");
        const docSnap = await getDoc(docRef);
        const imgBanner = document.getElementById("bannerPrincipal");
        if (docSnap.exists() && imgBanner) {
            imgBanner.src = docSnap.data().url || imgBanner.src;
        }
    } catch (e) {
        console.log("Banner padrão mantido.");
    }
}

/* --- CARRINHO (Mantido e Seguro) --- */
async function addCarrinhoLoja(id, produtoObj) {
    const user = auth.currentUser;
    // Se quiser obrigar login, descomente abaixo:
    /*
    if (!user) {
        document.getElementById('popupAvisoLogin').style.display = 'flex';
        return; 
    }
    */

    let carrinho = JSON.parse(localStorage.getItem('carrinhoDispemaq')) || [];
    
    // Formata preço
    let precoNum = 0;
    if(produtoObj.preco) {
        precoNum = parseFloat(produtoObj.preco.toString().replace(',', '.'));
    }

    const existe = carrinho.find(x => x.id === id);
    if(existe) {
        existe.qtd++;
    } else {
        carrinho.push({
            id: produtoObj.id,
            nome: produtoObj.nome,
            img: produtoObj.imagem || produtoObj.img || './assets/images/sem-foto.png',
            preco: precoNum, 
            qtd: 1
        });
    }
    
    localStorage.setItem('carrinhoDispemaq', JSON.stringify(carrinho));
    
    atualizarBadgeLoja();
    
    // Abre sidebar
    if(typeof toggleCarrinho === 'function') toggleCarrinho();
}

function atualizarBadgeLoja() {
    const carrinho = JSON.parse(localStorage.getItem('carrinhoDispemaq')) || [];
    const total = carrinho.reduce((acc, i) => acc + i.qtd, 0);
    const badge = document.getElementById('badgeCarrinhoLoja');
    
    if(badge) badge.innerText = total;
    
    renderizarItensCarrinhoLateral(carrinho);
}

function renderizarItensCarrinhoLateral(carrinho) {
    const div = document.getElementById('itensCarrinhoHtml'); 
    const totalEl = document.getElementById('totalCarrinhoLateral');
    if(!div) return;
    
    div.innerHTML = "";
    let totalValor = 0;

    if(carrinho.length === 0) {
        div.innerHTML = "<p style='padding:20px; text-align:center; color: #666;'>Seu carrinho está vazio.</p>";
    } else {
        carrinho.forEach(item => {
            const subtotal = item.qtd * item.preco;
            totalValor += subtotal;
            
            div.innerHTML += `
                <div class="item-carrinho-lateral">
                    <div class="info-item">
                        <strong>${item.qtd}x ${item.nome}</strong>
                        <span>${subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <button onclick="removerDoCarrinhoLocal('${item.id}')" class="btn-remove-item">&times;</button>
                </div>
            `;
        });
    }

    if(totalEl) totalEl.innerText = totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Global para ser acessível pelo HTML
window.removerDoCarrinhoLocal = function(id) {
    let carrinho = JSON.parse(localStorage.getItem('carrinhoDispemaq')) || [];
    carrinho = carrinho.filter(i => i.id !== id);
    localStorage.setItem('carrinhoDispemaq', JSON.stringify(carrinho));
    atualizarBadgeLoja();
}

window.atualizarBadgeLoja = atualizarBadgeLoja;