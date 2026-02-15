/* =========================================
   LOJA.JS (Versão Final - Integração Completa)
   ========================================= */

import { db, auth } from './firebase-config.js';
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
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Loja iniciada...");

    // 1. Carrega componentes visuais estáticos
    carregarBannerLoja();
    atualizarBadgeLoja();

    // 2. CONSTRÓI O MENU LATERAL (Busca do Firebase)
    await carregarSidebarDinamica();

    // 3. Lê filtros da URL (Vindo da Home ou refresh)
    const params = new URLSearchParams(window.location.search);
    const marca = params.get('marca');
    const cat = params.get('categoria') || params.get('cat'); 
    const busca = params.get('busca');

    // 4. Configura busca do header
    configurarBuscaHeader();

    // 5. Inicia a busca de produtos
    filtrarLoja(marca, cat, busca);
});

/* --- 1. FUNÇÃO: GERAR SIDEBAR DINÂMICA --- */
async function carregarSidebarDinamica() {
    const sidebarContainer = document.getElementById('sidebar-dinamica-container'); 
    
    if (!sidebarContainer) {
        console.warn("Elemento 'sidebar-dinamica-container' não encontrado.");
        return;
    }

    sidebarContainer.innerHTML = '<p style="padding:10px; color:#666;"><i class="fas fa-spinner fa-spin"></i> Carregando filtros...</p>';

    try {
        let html = '';

        // A. Botão "Ver Todos"
        html += `
            <div class="grupo-filtro">
                <h4>Catálogo</h4>
                <ul>
                    <li><a href="#" class="filtro-item" data-cat="todas">Ver Todos os Produtos</a></li>
                </ul>
            </div>
        `;

        // B. Busca Marcas no Firebase
        const qMarcas = query(collection(db, "marcas"), orderBy("nome"));
        const snapMarcas = await getDocs(qMarcas);

        if (!snapMarcas.empty) {
            html += `<div class="grupo-filtro"><h4>Marcas</h4><ul>`;
            snapMarcas.forEach(doc => {
                const d = doc.data();
                const nome = d.nome || d.marca; 
                if(nome) {
                    html += `<li><a href="#" class="filtro-item" data-marca="${nome}">${nome}</a></li>`;
                }
            });
            html += `</ul></div>`;
        }

        // C. Busca Categorias no Firebase
        const qCats = query(collection(db, "categorias"), orderBy("nome"));
        const snapCats = await getDocs(qCats);

        if (!snapCats.empty) {
            html += `<div class="grupo-filtro"><h4>Categorias</h4><ul>`;
            snapCats.forEach(doc => {
                const d = doc.data();
                const nome = d.nome || d.categoria;
                if(nome) {
                    html += `<li><a href="#" class="filtro-item" data-cat="${nome}">${nome}</a></li>`;
                }
            });
            html += `</ul></div>`;
        }

        // Injeta o HTML na página
        sidebarContainer.innerHTML = html;

        // Ativa os cliques nos novos botões
        configurarCliquesSidebar();

    } catch (error) {
        console.error("Erro ao carregar sidebar:", error);
        sidebarContainer.innerHTML = '<p style="padding:10px; color:red;">Erro ao carregar os filtros.</p>';
    }
}

/* --- 2. CLICK HANDLERS DA SIDEBAR --- */
function configurarCliquesSidebar() {
    const itens = document.querySelectorAll('.filtro-item');
    itens.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            const marca = item.dataset.marca;
            const cat = item.dataset.cat;
            
            const url = new URL(window.location);
            
            if(marca) { 
                if(marca === 'todas') {
                    url.searchParams.delete('marca');
                    url.searchParams.delete('cat');
                    url.searchParams.delete('busca');
                    filtrarLoja(null, null, null);
                } else {
                    url.searchParams.set('marca', marca); 
                    url.searchParams.delete('cat'); 
                    url.searchParams.delete('busca'); 
                    filtrarLoja(marca, null, null);
                }
            } else if(cat) { 
                if(cat === 'todas') {
                    url.searchParams.delete('marca');
                    url.searchParams.delete('cat');
                    url.searchParams.delete('busca');
                    filtrarLoja(null, null, null);
                } else {
                    url.searchParams.set('cat', cat); 
                    url.searchParams.delete('marca'); 
                    url.searchParams.delete('busca');
                    filtrarLoja(null, cat, null);
                }
            }
            
            window.history.pushState({}, '', url);
        });
    });
}

/* --- 3. BUSCA E RENDERIZAÇÃO DE PRODUTOS --- */
async function buscarProdutosNoFirebase(reset = false) {
    if (carregando) return;
    if (!temMais && !reset) return;

    carregando = true;
    const container = document.getElementById('gradeProdutosLoja');
    const qtdResultados = document.getElementById('qtdResultados');
    
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
        if (!db) throw new Error("Banco de dados não inicializado.");

        const produtosRef = collection(db, "produtos");
        let restricoes = [];

        // --- APLICAÇÃO DE FILTROS NA QUERY ---
        if (filtroAtivo.busca) {
            const termo = filtroAtivo.busca; 
            restricoes.push(orderBy("nome"));
            restricoes.push(where("nome", ">=", termo));
            restricoes.push(where("nome", "<=", termo + '\uf8ff'));
        } 
        else if (filtroAtivo.marca && filtroAtivo.marca !== 'todas') {
            restricoes.push(where("marca", "==", filtroAtivo.marca)); 
        } 
        else if (filtroAtivo.cat && filtroAtivo.cat !== 'todas') {
            restricoes.push(where("categoria", "==", filtroAtivo.cat));
        }

        restricoes.push(limit(ITENS_POR_PAGINA));
        
        if (!reset && ultimoDoc) {
            restricoes.push(startAfter(ultimoDoc));
        }

        const q = query(produtosRef, ...restricoes);
        const snapshot = await getDocs(q);

        if (reset && container) container.innerHTML = '';

        if (snapshot.empty) {
            temMais = false;
            if (reset && container) {
                container.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding: 40px; color: #666;">
                        <i class="fas fa-search" style="font-size: 40px; margin-bottom: 15px; opacity: 0.3;"></i>
                        <h3>Nenhum produto encontrado</h3>
                        <p>Tente ajustar os filtros.</p>
                        <button onclick="window.location.href='loja.html'" class="botao botao-primario" style="margin-top:15px;">Limpar Filtros</button>
                    </div>`;
                if(qtdResultados) qtdResultados.innerText = "0 produtos";
            }
            return;
        }

        ultimoDoc = snapshot.docs[snapshot.docs.length - 1];
        
        if(reset && qtdResultados) {
            qtdResultados.innerText = `${snapshot.size}${snapshot.size === ITENS_POR_PAGINA ? '+' : ''} produtos encontrados`;
        }

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
        console.error("Erro LOJA:", error);
        if(reset && container) {
            container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px;"><p>Erro ao carregar produtos. Verifique sua conexão.</p></div>`;
        }
        if(error.message.includes("index")) console.warn("ALERTA: Clique no link do console para criar o índice no Firebase.");
    } finally {
        carregando = false;
    }
}

/* --- 4. RENDERIZAÇÃO DO CARD --- */
function criarCardProduto(p, container) {
    if(!container) return;

    const card = document.createElement('div');
    card.classList.add('produto-card');
    
    const imgUrl = p.imagem || p.img || p.urlImagem || './assets/images/sem-foto.png';
    let precoDisplay = "Consulte";
    
    if (p.preco) {
        let valor = p.preco;
        if(typeof valor === 'string') {
             valor = parseFloat(valor.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
        }
        if (!isNaN(valor) && valor > 0) {
            precoDisplay = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        } else {
            precoDisplay = p.preco;
        }
    }

    card.innerHTML = `
        <div class="img-container">
            <img src="${imgUrl}" alt="${p.nome}" onerror="this.src='./assets/images/sem-foto.png'">
        </div>
        <div class="produto-info">
            <span class="categoria-tag">${p.marca || p.categoria || 'Geral'}</span>
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

    const btn = card.querySelector('.btn-add-carrinho');
    if(btn) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            addCarrinhoLoja(p.id, p);
        });
    }

    container.appendChild(card);
}

function adicionarBotaoCarregarMais(container) {
    removerBotaoCarregarMais();
    const div = document.createElement('div');
    div.id = "area-btn-carregar";
    div.style.gridColumn = "1/-1";
    div.style.textAlign = "center";
    div.style.marginTop = "30px";
    div.innerHTML = `<button id="btnCarregarMais" class="botao botao-secundario">Carregar mais produtos</button>`;
    container.appendChild(div);
    document.getElementById('btnCarregarMais').addEventListener('click', () => buscarProdutosNoFirebase(false));
}

function removerBotaoCarregarMais() {
    const area = document.getElementById('area-btn-carregar');
    if(area) area.remove();
}

/* --- 5. LÓGICA DE CONTROLE DE FILTROS --- */
function filtrarLoja(marcaUrl, catUrl, buscaUrl) {
    filtroAtivo.marca = (marcaUrl && marcaUrl !== 'todas') ? marcaUrl : null;
    filtroAtivo.cat = (catUrl && catUrl !== 'todas') ? catUrl : null;
    filtroAtivo.busca = buscaUrl ? buscaUrl : null;

    const titulo = document.getElementById('tituloResultadoLoja');
    if(titulo) {
        if(filtroAtivo.busca) titulo.innerText = `Busca: "${filtroAtivo.busca}"`;
        else if(filtroAtivo.marca) titulo.innerText = `Marca: ${formatarTexto(filtroAtivo.marca)}`;
        else if(filtroAtivo.cat) titulo.innerText = `Categoria: ${formatarTexto(filtroAtivo.cat)}`;
        else titulo.innerText = "Catálogo Completo";
    }

    document.querySelectorAll('.filtro-item').forEach(item => {
        item.classList.remove('ativo'); 
        if(filtroAtivo.marca && item.dataset.marca === filtroAtivo.marca) item.classList.add('ativo');
        if(filtroAtivo.cat && item.dataset.cat === filtroAtivo.cat) item.classList.add('ativo');
        if(!filtroAtivo.marca && !filtroAtivo.cat && !filtroAtivo.busca && item.dataset.cat === 'todas') item.classList.add('ativo');
    });

    buscarProdutosNoFirebase(true); 
}

function formatarTexto(str) {
    if(!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
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
        // O Enter já está sendo tratado no HTML via onkeypress, mas mantemos aqui por garantia
        input.addEventListener('keypress', (e) => { if(e.key === 'Enter') acaoBusca(); });
    }
}

/* --- 6. EXTRAS (Banner, Carrinho) --- */
async function carregarBannerLoja() {
    try {
        const docSnap = await getDoc(doc(db, "configuracoes", "banner_site"));
        const imgBanner = document.getElementById("bannerPrincipal");
        if (docSnap.exists() && imgBanner && docSnap.data().url) {
            imgBanner.src = docSnap.data().url;
            imgBanner.style.display = 'block';
        }
    } catch (e) { 
        console.log("Banner padrão mantido."); 
    }
}

/* --- FUNÇÕES DO CARRINHO (INTEGRAÇÃO) --- */
function addCarrinhoLoja(id, produtoObj) {
    let carrinho = JSON.parse(localStorage.getItem('carrinhoDispemaq')) || [];
    
    let precoNum = 0;
    if (produtoObj.preco) {
        if(typeof produtoObj.preco === 'number') {
            precoNum = produtoObj.preco;
        } else {
            let pClean = produtoObj.preco.toString().replace('R$', '').trim();
            if(pClean.includes(',') && pClean.includes('.')) {
                pClean = pClean.replace(/\./g, '').replace(',', '.'); 
            } else if(pClean.includes(',')) {
                pClean = pClean.replace(',', '.');
            }
            precoNum = parseFloat(pClean) || 0;
        }
    }

    const index = carrinho.findIndex(x => x.id === id);
    if(index > -1) {
        carrinho[index].qtd += 1;
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
    
    if(typeof window.toggleCarrinho === 'function') {
        window.toggleCarrinho(); 
    } else {
        alert("Produto adicionado ao carrinho!");
    }
}

function atualizarBadgeLoja() {
    const carrinho = JSON.parse(localStorage.getItem('carrinhoDispemaq')) || [];
    const total = carrinho.reduce((acc, item) => acc + item.qtd, 0);
    const badge = document.getElementById('badgeCarrinhoLoja');
    if(badge) {
        badge.innerText = total;
        badge.style.display = total > 0 ? 'flex' : 'none';
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
        div.innerHTML = "<p style='padding:20px; text-align:center; color:#666;'>Seu carrinho está vazio.</p>";
    } else {
        carrinho.forEach(item => {
            totalValor += item.qtd * item.preco;
            // Se o preço for 0, exibe "Sob Consulta" no carrinho
            let textoPreco = item.preco > 0 
                ? `R$ ${item.preco.toFixed(2).replace('.', ',')}` 
                : "Sob Consulta";

            div.innerHTML += `
                <div class="item-carrinho-lateral" style="display:flex; align-items:center; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
                    <img src="${item.img}" style="width:50px; height:50px; object-fit:cover; border-radius:4px; border: 1px solid #eee;">
                    <div style="flex:1; margin-left:10px;">
                        <b style="font-size:0.9rem;">${item.nome}</b><br>
                        <small style="color:#666;">${item.qtd}x ${textoPreco}</small>
                    </div>
                    <button onclick="window.removerDoCarrinhoLocal('${item.id}')" style="color:red; border:none; background:none; cursor:pointer; font-size:1.1rem; padding:5px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>`;
        });
    }
    
    if(totalEl) {
        totalEl.innerText = totalValor > 0 
            ? totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
            : "Consulte via Whats";
    }
}

// --- FUNÇÕES EXPORTADAS PARA O WINDOW (Uso no HTML) ---

// Função do botão lixeira
window.removerDoCarrinhoLocal = function(id) {
    let c = JSON.parse(localStorage.getItem('carrinhoDispemaq')) || [];
    c = c.filter(i => i.id !== id);
    localStorage.setItem('carrinhoDispemaq', JSON.stringify(c));
    atualizarBadgeLoja();
};

// Função de finalizar compra enviando os dados pro WhatsApp
window.finalizarCompraWhatsApp = function() {
    const carrinho = JSON.parse(localStorage.getItem('carrinhoDispemaq')) || [];
    if (carrinho.length === 0) {
        alert("Seu carrinho está vazio. Adicione produtos antes de finalizar!");
        return;
    }

    let mensagem = "Olá Dispemaq! Gostaria de finalizar o pedido dos seguintes itens:\n\n";
    let valorTotal = 0;
    let temItemSobConsulta = false;

    carrinho.forEach(item => {
        if(item.preco > 0) {
            mensagem += `✅ *${item.qtd}x* ${item.nome} (R$ ${item.preco.toFixed(2).replace('.', ',')})\n`;
            valorTotal += (item.qtd * item.preco);
        } else {
            mensagem += `✅ *${item.qtd}x* ${item.nome} (Sob Consulta)\n`;
            temItemSobConsulta = true;
        }
    });

    mensagem += `\n*Valor Aproximado:* ${valorTotal > 0 ? valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'A combinar'}\n`;
    
    if(temItemSobConsulta) {
        mensagem += `*(Alguns itens necessitam de cotação com o vendedor)*\n`;
    }

    mensagem += `\nAguardo retorno para combinarmos o frete e pagamento!`;

    const numeroZap = "554984276503";
    const linkZap = `https://wa.me/${numeroZap}?text=${encodeURIComponent(mensagem)}`;
    
    window.open(linkZap, '_blank');
};

// Deixa o atualizarBadge acessível caso precise forçar atualização de outro script
window.atualizarBadgeLoja = atualizarBadgeLoja;