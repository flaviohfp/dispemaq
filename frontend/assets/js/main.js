import { db, collection, getDocs, doc, getDoc, auth, onAuthStateChanged, signOut } from './firebase-config.js';

/* ============================================================
   1. CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
   ============================================================ */
let carrinho = JSON.parse(localStorage.getItem('dispemaq_carrinho')) || [];
let marcaAtualSelecionada = ""; 

// Variáveis do Banner
let bannerSlideAtual = 0;
let bannerTotalSlides = 0;
window.intervaloBanner = null; 

// Email do Admin
const EMAIL_ADMIN = "admin@dispemaq.com"; 

/* ============================================================
   2. CARREGAR PRODUTOS E BANNERS DO FIREBASE
   ============================================================ */

// A) Carregar Produtos
async function carregarProdutosDestaque() {
    const container = document.getElementById('gradeDestaques');
    if (!container) return; 

    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 20px;">Carregando produtos...</p>';

    try {
        const querySnapshot = await getDocs(collection(db, "produtos"));
        container.innerHTML = ''; 

        if (querySnapshot.empty) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Nenhum produto cadastrado.</p>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const produto = docSnap.data();
            const id = docSnap.id; 
            
            const imagem = produto.img || produto.urlImagem || './assets/images/placeholder.jpg'; 
            const preco = parseFloat(produto.preco || 0);
            const linkDetalhes = `produto.html?id=${id}`;
            
            const htmlProduto = `
                <div class="card-produto">
                    <div class="produto-imagem">
                        ${produto.promocao ? '<span class="badge-desconto">Oferta</span>' : ''}
                        <a href="${linkDetalhes}" style="display:block; width:100%; height:100%;">
                            <img src="${imagem}" alt="${produto.nome}" style="cursor:pointer;">
                        </a>
                    </div>
                    <div class="produto-info">
                        <span class="produto-categoria">${produto.categoria || 'Peças'}</span>
                        <a href="${linkDetalhes}" style="text-decoration:none; color:inherit;">
                            <h3 class="produto-nome">${produto.nome}</h3>
                        </a>
                        <span class="produto-codigo">Cód: ${produto.cod || produto.codigo || '--'}</span>
                        <div class="produto-precos">
                            <span class="preco-atual">R$ ${preco.toFixed(2).replace('.', ',')}</span>
                            <span class="preco-pix"><i class="fas fa-barcode"></i> R$ ${(preco * 0.95).toFixed(2).replace('.', ',')} no PIX</span>
                        </div>
                        <div class="produto-acoes">
                            <button class="botao-adicionar" 
                                onclick="adicionarAoCarrinho(this)"
                                data-id="${id}"
                                data-nome="${produto.nome}"
                                data-preco="${preco}"
                                data-img="${imagem}">
                                <i class="fas fa-shopping-cart"></i> Comprar
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += htmlProduto;
        });

    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        container.innerHTML = '<p style="text-align:center;">Erro ao carregar produtos.</p>';
    }
}

// B) Carregar Banners
async function carregarBanners() {
    const slider = document.getElementById('bannerSlider');
    const indicadores = document.getElementById('bannerIndicadores');
    // Se não tiver slider (pode ser outra página), sai da função para não dar erro
    if(!slider && !document.getElementById('banner-track')) return;

    // Nota: O HTML novo usa banner-track e lógica interna no HTML, 
    // mas mantivemos a função aqui caso precise usar slider antigo ou lógica mista.
}

/* ============================================================
   3. FUNÇÕES GLOBAIS (CARRINHO, UI E MENU MARCAS)
   ============================================================ */

// --- FUNÇÃO CORRIGIDA PARA O MENU DE MARCAS ---
// Esta função é chamada pelo onclick do HTML novo
window.abrirMenuMarcas = function(event) {
    if(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const btn = document.getElementById("btnVerMais");
    const menu = document.getElementById("menuMaisMarcas");

    if (!btn || !menu) return;

    // Se já estiver aberto, fecha
    if (menu.classList.contains("ativo")) {
        menu.classList.remove("ativo");
        btn.innerHTML = '<i class="fas fa-plus-circle"></i> Ver mais marcas';
        return;
    }

    // Fecha o outro menu (de categorias) se estiver aberto para não encavalar
    const menuCat = document.getElementById('menuCategoriasFlutuante');
    if(menuCat) menuCat.style.display = 'none';

    // CÁLCULO DE POSIÇÃO (Faz o menu flutuar no lugar certo)
    const rect = btn.getBoundingClientRect(); 
    
    // Configura a posição do menu baseado no scroll da página + posição do botão
    // Alinhado à esquerda do botão, descendo
    menu.style.top = (rect.bottom + window.scrollY + 5) + "px"; 
    // Tenta alinhar a esquerda, se passar da tela, ajusta
    let leftPos = rect.left + window.scrollX;
    if (leftPos + 220 > window.innerWidth) {
        leftPos = window.innerWidth - 230; // Ajuste para não cortar na direita
    }
    menu.style.left = leftPos + "px";

    // Abre o menu
    menu.classList.add("ativo");
    btn.innerHTML = '<i class="fas fa-minus-circle"></i> Fechar';
}

// --- CARRINHO ---
function atualizarBadge() {
    const badges = document.querySelectorAll('.badge-carrinho'); 
    const total = carrinho.reduce((acc, item) => acc + item.qtd, 0);
    badges.forEach(b => {
        b.innerText = total;
        b.style.display = total > 0 ? 'flex' : 'none';
    });
    localStorage.setItem('dispemaq_carrinho', JSON.stringify(carrinho));
}

function renderizarCarrinho() {
    const container = document.querySelector('.carrinho-conteudo');
    const totalEl = document.querySelector('.carrinho-total strong');
    if (!container) return;
    
    container.innerHTML = '';
    let totalPreco = 0;

    if (carrinho.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:#999;">Seu carrinho está vazio.</div>';
    } else {
        carrinho.forEach(item => {
            totalPreco += item.preco * item.qtd;
            container.innerHTML += `
                <div class="item-carrinho" style="display: flex; gap: 10px; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                    <div style="width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; background: #f9f9f9;">
                         <img src="${item.img}" style="max-width:100%; max-height:100%;"> 
                    </div>
                    <div style="flex: 1;">
                        <h4 style="font-size: 0.85rem; margin: 0 0 5px 0;">${item.nome}</h4>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: bold; color: #1e3a8a;">R$ ${(item.preco * item.qtd).toFixed(2).replace('.',',')}</span>
                            <div style="border: 1px solid #ddd; border-radius: 4px; display:flex;">
                                <button onclick="alterarQuantidade('${item.id}', 'diminuir')" style="border:none; background:none; padding: 2px 8px; cursor:pointer;">-</button>
                                <span style="font-size: 0.8rem; padding: 2px 5px;">${item.qtd}</span>
                                <button onclick="alterarQuantidade('${item.id}', 'aumentar')" style="border:none; background:none; padding: 2px 8px; cursor:pointer;">+</button>
                            </div>
                        </div>
                    </div>
                    <button onclick="removerItem('${item.id}')" style="border:none; background:none; color: red; cursor:pointer;"><i class="fas fa-trash"></i></button>
                </div>
            `;
        });
    }
    if(totalEl) {
        totalEl.innerText = 'R$ ' + totalPreco.toFixed(2).replace('.', ',');
    }
}

// Funções Globais (window)
window.adicionarAoCarrinho = function(el) {
    const produto = {
        id: el.getAttribute('data-id'),
        nome: el.getAttribute('data-nome'),
        preco: parseFloat(el.getAttribute('data-preco')),
        img: el.getAttribute('data-img'),
        qtd: 1
    };

    const existente = carrinho.find(i => i.id === produto.id);
    if (existente) existente.qtd++;
    else carrinho.push(produto);

    atualizarBadge();
    renderizarCarrinho();
    document.getElementById("carrinhoLateral").classList.add("aberto");
    document.getElementById("overlay").classList.add("ativo");
};

window.alterarQuantidade = function(id, acao) {
    const item = carrinho.find(i => i.id == id);
    if (!item) return;
    if (acao === 'aumentar') item.qtd++;
    if (acao === 'diminuir') {
        item.qtd--;
        if (item.qtd <= 0) return window.removerItem(id);
    }
    atualizarBadge();
    renderizarCarrinho();
};

window.removerItem = function(id) {
    carrinho = carrinho.filter(i => i.id != id);
    atualizarBadge();
    renderizarCarrinho();
};

window.toggleCarrinho = function(e) {
    if(e) e.preventDefault();
    const car = document.getElementById("carrinhoLateral");
    const over = document.getElementById("overlay");
    if(car.classList.contains("aberto")) {
        car.classList.remove("aberto");
        over.classList.remove("ativo");
    } else {
        renderizarCarrinho();
        car.classList.add("aberto");
        over.classList.add("ativo");
    }
};

window.subirTopo = function() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ============================================================
   4. INICIALIZAÇÃO (DOM READY)
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
    
    // Inicia funções principais
    carregarProdutosDestaque();
    // carregarBanners() é chamado no HTML do carrossel, mas deixei aqui caso precise
    atualizarBadge();

    // --- LOGICA DE CLICK NOS ITENS DO MENU FLUTUANTE ---
    // (Para os botões dentro do menu "Ver Mais")
    const botoesMenuExtra = document.querySelectorAll('.marca-item-extra');
    botoesMenuExtra.forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Aqui você define o que acontece ao clicar numa marca do menu extra
            // Por enquanto, vou simular que seleciona a marca igual aos botões principais
            const marca = this.getAttribute('data-marca') || this.innerText;
            alert("Você clicou na marca: " + marca + ". Aqui você pode redirecionar para a loja.");
            // Exemplo: window.location.href = `loja.html?marca=${marca}`;
        });
    });

    // --- MENU DE CATEGORIAS (PEÇAS) ---
    const menuCategorias = document.getElementById('menuCategoriasFlutuante');
    const tituloMenuCat = document.getElementById('tituloMarcaDropdown');
    const todosBotoesMarcaPrincipal = document.querySelectorAll('.item-marca'); // Apenas os da barra laranja

    todosBotoesMarcaPrincipal.forEach(botao => {
        botao.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            // Fecha o menu "Ver Mais Marcas" se estiver aberto
            const menuMais = document.getElementById("menuMaisMarcas");
            const btnMais = document.getElementById("btnVerMais");
            if(menuMais && menuMais.classList.contains('ativo')){
                menuMais.classList.remove('ativo');
                btnMais.innerHTML = '<i class="fas fa-plus-circle"></i> Ver mais marcas';
            }

            // Reseta estilos
            todosBotoesMarcaPrincipal.forEach(b => {
                b.classList.remove('selecionada');
                b.style.backgroundColor = '';
                b.style.color = '';
            });

            this.classList.add('selecionada');
            this.style.backgroundColor = '#ff6600';
            this.style.color = 'white';

            const marcaNome = this.getAttribute('data-marca') || this.innerText.trim();
            const marcaNomeBonito = this.innerText.trim();
            marcaAtualSelecionada = marcaNome;

            if(tituloMenuCat) tituloMenuCat.innerText = "Peças para " + marcaNomeBonito;

            if(menuCategorias) {
                const rect = this.getBoundingClientRect();
                const top = rect.bottom + window.scrollY;
                let left = rect.left + window.scrollX;

                if (left + 280 > window.innerWidth) left = window.innerWidth - 290;
                if (left < 0) left = 10;

                menuCategorias.style.top = top + 'px';
                menuCategorias.style.left = left + 'px';
                menuCategorias.style.display = 'block';
            }
        });
    });

    // Redirecionamento das Categorias
    const botoesCat = document.querySelectorAll('.item-cat-dropdown');
    botoesCat.forEach(btn => {
        btn.addEventListener('click', function() {
            const categoria = this.getAttribute('data-cat');
            let url = `loja.html?marca=${encodeURIComponent(marcaAtualSelecionada)}`;
            if(categoria !== 'todas') url += `&cat=${encodeURIComponent(categoria)}`;
            window.location.href = url;
        });
    });

    // --- FECHAR MENUS AO CLICAR FORA ---
    document.addEventListener('click', function(e) {
        // Fecha Categorias
        if(menuCategorias && menuCategorias.style.display === 'block') {
            if (!menuCategorias.contains(e.target)) menuCategorias.style.display = 'none';
        }

        // Fecha Menu Mais Marcas (Novo)
        const menuMais = document.getElementById("menuMaisMarcas");
        const btnMais = document.getElementById("btnVerMais");
        if(menuMais && menuMais.classList.contains('ativo')) {
            // Se o clique NÃO foi no menu E NÃO foi no botão
            if (!menuMais.contains(e.target) && !btnMais.contains(e.target)) {
                menuMais.classList.remove('ativo');
                if(btnMais) btnMais.innerHTML = '<i class="fas fa-plus-circle"></i> Ver mais marcas';
            }
        }
    });
    
    // Fecha ao rolar a tela (opcional, para evitar menu voando)
    window.addEventListener('scroll', function() {
        const menuMais = document.getElementById("menuMaisMarcas");
        const btnMais = document.getElementById("btnVerMais");
        if(menuMais && menuMais.classList.contains('ativo')) {
             menuMais.classList.remove('ativo');
             if(btnMais) btnMais.innerHTML = '<i class="fas fa-plus-circle"></i> Ver mais marcas';
        }
    });

    // --- LOGIN / LOGOUT / ADMIN BTN ---
    const btnAuth = document.getElementById('btnAuth');
    const txtAuth = document.getElementById('txtAuth');
    const btnLinkAdmin = document.getElementById('btnLinkAdmin'); 
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // -- LOGADO --
            if(txtAuth) txtAuth.innerText = "Sair";
            
            if(btnAuth) {
                btnAuth.href = "#";
                btnAuth.onclick = (e) => {
                    e.preventDefault();
                    if(confirm("Sair da conta?")) signOut(auth).then(() => window.location.reload());
                };
            }

            // MOSTRAR BOTÃO ADMIN
            if (user.email === EMAIL_ADMIN) {
                if(btnLinkAdmin) btnLinkAdmin.style.display = 'inline-flex';
            } else {
                if(btnLinkAdmin) btnLinkAdmin.style.display = 'none';
            }

            const popup = document.getElementById('popupAvisoLogin');
            if(popup) popup.style.display = 'none';

        } else {
            // -- DESLOGADO --
            if(txtAuth) txtAuth.innerText = "Entrar";
            if(btnAuth) {
                btnAuth.href = "login.html";
                btnAuth.onclick = null;
            }
            if(btnLinkAdmin) btnLinkAdmin.style.display = 'none';
        }
    });

    // --- MENU MOBILE ---
    const btnMenu = document.getElementById('botaoMenuMobile');
    const navMenu = document.getElementById('menuNavegacao');
    if (btnMenu) btnMenu.addEventListener('click', () => navMenu.classList.toggle('ativo'));

    // --- BOTÃO TOPO ---
    window.addEventListener('scroll', () => {
        const btn = document.getElementById("btnTopo");
        if (btn) {
            if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
                btn.classList.add("visivel");
            } else {
                btn.classList.remove("visivel");
            }
        }
    });
});