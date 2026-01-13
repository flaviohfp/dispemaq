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
    if(!slider && !document.getElementById('banner-track')) return;
}

/* ============================================================
   3. FUNÇÕES GLOBAIS (UI, MENUS, CARRINHO)
   ============================================================ */

// --- ABRIR MENU "VER MAIS MARCAS" ---
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

    // Fecha o menu de categorias se estiver aberto
    const menuCat = document.getElementById('menuCategoriasFlutuante');
    if(menuCat) menuCat.style.display = 'none';

    // Posiciona o menu abaixo do botão
    const rect = btn.getBoundingClientRect(); 
    menu.style.top = (rect.bottom + window.scrollY + 5) + "px"; 
    
    let leftPos = rect.left + window.scrollX;
    // Ajuste para não sair da tela à direita
    if (leftPos + 220 > window.innerWidth) {
        leftPos = window.innerWidth - 230;
    }
    menu.style.left = leftPos + "px";

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
   4. INICIALIZAÇÃO E LÓGICA DE MENUS (DOM READY)
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
    
    carregarProdutosDestaque();
    atualizarBadge();

    // -------------------------------------------------------------
    // LÓGICA UNIFICADA PARA ABRIR O MENU DE CATEGORIAS
    // -------------------------------------------------------------
    const menuCategorias = document.getElementById('menuCategoriasFlutuante');
    const tituloMenuCat = document.getElementById('tituloMarcaDropdown');
    
    // Seleciona TODOS os botões que representam marcas (Principal + Extra)
    const todosBotoesMarca = document.querySelectorAll('.item-marca, .marca-item-extra');

    todosBotoesMarca.forEach(botao => {
        botao.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); 

            // Verifica se o clique veio do menu "Ver Mais" (vertical)
            const ehMenuExtra = this.classList.contains('marca-item-extra');
            const menuMais = document.getElementById("menuMaisMarcas");
            const btnMais = document.getElementById("btnVerMais");

            // SE for clique na barra laranja principal, fecha o menu "Ver Mais" se estiver aberto
            // SE for clique dentro do menu "Ver Mais", MANTÉM ele aberto (para ficar lado a lado)
            if (!ehMenuExtra) {
                if(menuMais && menuMais.classList.contains('ativo')){
                    menuMais.classList.remove('ativo');
                    if(btnMais) btnMais.innerHTML = '<i class="fas fa-plus-circle"></i> Ver mais marcas';
                }
            }

            // Limpa seleção visual de todos
            todosBotoesMarca.forEach(b => {
                b.classList.remove('selecionada');
                b.style.backgroundColor = ''; 
                b.style.color = '';
            });

            // Marca o atual visualmente
            this.classList.add('selecionada');
            this.style.backgroundColor = '#ff6600';
            this.style.color = 'white';

            // Dados da Marca
            const marcaNome = this.getAttribute('data-marca') || this.innerText.trim();
            const marcaNomeBonito = this.innerText.trim();
            marcaAtualSelecionada = marcaNome;

            if(tituloMenuCat) tituloMenuCat.innerText = "Peças para " + marcaNomeBonito;

            // POSICIONAMENTO DO MENU DE CATEGORIAS
            if(menuCategorias) {
                const rect = this.getBoundingClientRect();
                
                let top, left;

                if (ehMenuExtra) {
                    // --- LÓGICA PARA MENU LATERAL (Abre ao lado direito) ---
                    // O topo alinha com o topo do item clicado
                    top = rect.top + window.scrollY; 
                    // A esquerda alinha com a direita do item clicado (+ 5px de margem)
                    left = rect.right + window.scrollX + 5; 
                } else {
                    // --- LÓGICA PARA BARRA PRINCIPAL (Abre embaixo) ---
                    top = rect.bottom + window.scrollY;
                    left = rect.left + window.scrollX;
                }

                // Ajuste para não estourar a tela na direita (Mobile ou telas pequenas)
                // Se a posição left + largura do menu (aprox 280px) for maior que a tela...
                if (left + 280 > window.innerWidth) {
                    if (ehMenuExtra) {
                        // Se for menu extra e não couber na direita, joga para a ESQUERDA do menu de marcas
                        left = rect.left + window.scrollX - 290; 
                    } else {
                        // Se for barra principal, alinha à direita da tela
                        left = window.innerWidth - 290;
                    }
                }
                
                // Proteção para não sair na esquerda da tela
                if (left < 0) left = 10;

                menuCategorias.style.top = top + 'px';
                menuCategorias.style.left = left + 'px';
                menuCategorias.style.display = 'block';
            }
        });
    });

    // -------------------------------------------------------------
    // REDIRECIONAMENTO AO CLICAR NA CATEGORIA
    // -------------------------------------------------------------
    const botoesCat = document.querySelectorAll('.item-cat-dropdown');
    botoesCat.forEach(btn => {
        btn.addEventListener('click', function() {
            const categoria = this.getAttribute('data-cat');
            
            // Monta a URL com a marca selecionada anteriormente e a categoria clicada
            let url = `loja.html?marca=${encodeURIComponent(marcaAtualSelecionada)}`;
            
            if(categoria !== 'todas') {
                url += `&cat=${encodeURIComponent(categoria)}`;
            }
            
            window.location.href = url;
        });
    });

    // -------------------------------------------------------------
    // FECHAR MENUS AO CLICAR FORA
    // -------------------------------------------------------------
    document.addEventListener('click', function(e) {
        // Fecha Categorias se clicar fora dele
        if(menuCategorias && menuCategorias.style.display === 'block') {
            if (!menuCategorias.contains(e.target)) menuCategorias.style.display = 'none';
        }

        // Fecha Menu Mais Marcas se clicar fora dele E fora do botão que abre ele
        const menuMais = document.getElementById("menuMaisMarcas");
        const btnMais = document.getElementById("btnVerMais");
        
        if(menuMais && menuMais.classList.contains('ativo')) {
            // Importante: Se clicou no menu de categorias, NÃO fecha o menu de marcas
            const clicouNoMenuCat = menuCategorias && menuCategorias.contains(e.target);
            
            if (!menuMais.contains(e.target) && !btnMais.contains(e.target) && !clicouNoMenuCat) {
                menuMais.classList.remove('ativo');
                if(btnMais) btnMais.innerHTML = '<i class="fas fa-plus-circle"></i> Ver mais marcas';
            }
        }
    });

    window.addEventListener('scroll', function() {
        if(menuCategorias) menuCategorias.style.display = 'none';
    });

    // -------------------------------------------------------------
    // LOGIN / ADMIN
    // -------------------------------------------------------------
    const btnAuth = document.getElementById('btnAuth');
    const txtAuth = document.getElementById('txtAuth');
    const btnLinkAdmin = document.getElementById('btnLinkAdmin'); 
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            if(txtAuth) txtAuth.innerText = "Sair";
            if(btnAuth) {
                btnAuth.href = "#";
                btnAuth.onclick = (e) => {
                    e.preventDefault();
                    if(confirm("Sair da conta?")) signOut(auth).then(() => window.location.reload());
                };
            }
            if (user.email === EMAIL_ADMIN && btnLinkAdmin) {
                btnLinkAdmin.style.display = 'inline-flex';
            } else if(btnLinkAdmin) {
                btnLinkAdmin.style.display = 'none';
            }
            const popup = document.getElementById('popupAvisoLogin');
            if(popup) popup.style.display = 'none';
        } else {
            if(txtAuth) txtAuth.innerText = "Entrar";
            if(btnAuth) {
                btnAuth.href = "login.html";
                btnAuth.onclick = null;
            }
            if(btnLinkAdmin) btnLinkAdmin.style.display = 'none';
        }
    });

    // -------------------------------------------------------------
    // MOBILE & UI EXTRAS
    // -------------------------------------------------------------
    const btnMenu = document.getElementById('botaoMenuMobile');
    const navMenu = document.getElementById('menuNavegacao');
    if (btnMenu) btnMenu.addEventListener('click', () => navMenu.classList.toggle('ativo'));

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