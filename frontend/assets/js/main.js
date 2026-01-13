import { db, collection, getDocs, doc, getDoc, auth, onAuthStateChanged, signOut } from './firebase-config.js';

/* ============================================================
   1. CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
   ============================================================ */
let carrinho = JSON.parse(localStorage.getItem('dispemaq_carrinho')) || [];
let marcaAtualSelecionada = ""; 

// --- NOVAS VARIÁVEIS PARA O HOVER (Delay) ---
let timeoutMenuCat = null;  // Timer para o menu de peças
let timeoutMenuMais = null; // Timer para o menu de "Ver Mais"

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

// --- MANTIVE A FUNÇÃO ORIGINAL, MAS O HOVER VAI CUIDAR DISSO AGORA ---
window.abrirMenuMarcas = function(event) {
    if(event) { event.preventDefault(); event.stopPropagation(); }
    const btn = document.getElementById("btnVerMais");
    const menu = document.getElementById("menuMaisMarcas");
    if (!btn || !menu) return;
    
    // Lógica manual de clique (caso use em mobile)
    if (menu.classList.contains("ativo")) {
        menu.classList.remove("ativo");
        btn.innerHTML = '<i class="fas fa-plus-circle"></i> Ver mais marcas';
    } else {
        const menuCat = document.getElementById('menuCategoriasFlutuante');
        if(menuCat) menuCat.style.display = 'none';
        const rect = btn.getBoundingClientRect(); 
        menu.style.top = (rect.bottom + window.scrollY + 5) + "px"; 
        let leftPos = rect.left + window.scrollX;
        if (leftPos + 220 > window.innerWidth) leftPos = window.innerWidth - 230;
        menu.style.left = leftPos + "px";
        menu.classList.add("ativo");
        btn.innerHTML = '<i class="fas fa-minus-circle"></i> Fechar';
    }
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
   4. INICIALIZAÇÃO E LÓGICA DE MENUS (HOVER - MOUSE)
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
    
    carregarProdutosDestaque();
    atualizarBadge();

    const menuCategorias = document.getElementById('menuCategoriasFlutuante');
    const tituloMenuCat = document.getElementById('tituloMarcaDropdown');
    const todosBotoesMarca = document.querySelectorAll('.item-marca, .marca-item-extra');

    // Funções auxiliares para abrir e fechar com delay
    function agendarFechamentoCategorias() {
        timeoutMenuCat = setTimeout(() => {
            if(menuCategorias) menuCategorias.style.display = 'none';
        }, 200); // 200ms de tolerância
    }

    // -------------------------------------------------------------
    // LÓGICA DO MENU "VER MAIS MARCAS" (HOVER)
    // -------------------------------------------------------------
    const btnVerMais = document.getElementById("btnVerMais");
    const menuMaisMarcas = document.getElementById("menuMaisMarcas");

    if (btnVerMais && menuMaisMarcas) {
        
        // Quando o mouse ENTRA no botão "Ver Mais"
        btnVerMais.addEventListener('mouseenter', function() {
            clearTimeout(timeoutMenuMais); // Cancela fechamento se houver
            
            const rect = btnVerMais.getBoundingClientRect(); 
            menuMaisMarcas.style.top = (rect.bottom + window.scrollY + 5) + "px"; 
            
            let leftPos = rect.left + window.scrollX;
            if (leftPos + 220 > window.innerWidth) leftPos = window.innerWidth - 230;
            menuMaisMarcas.style.left = leftPos + "px";

            menuMaisMarcas.classList.add("ativo");
            btnVerMais.innerHTML = '<i class="fas fa-minus-circle"></i> Fechar';
        });

        // Quando o mouse SAI do botão "Ver Mais"
        btnVerMais.addEventListener('mouseleave', function() {
            timeoutMenuMais = setTimeout(() => {
                menuMaisMarcas.classList.remove("ativo");
                btnVerMais.innerHTML = '<i class="fas fa-plus-circle"></i> Ver mais marcas';
            }, 200);
        });

        // Quando o mouse ENTRA no MENU "Ver Mais" (para ele não fechar)
        menuMaisMarcas.addEventListener('mouseenter', function() {
            clearTimeout(timeoutMenuMais);
        });

        // Quando o mouse SAI do MENU "Ver Mais"
        menuMaisMarcas.addEventListener('mouseleave', function() {
            timeoutMenuMais = setTimeout(() => {
                menuMaisMarcas.classList.remove("ativo");
                btnVerMais.innerHTML = '<i class="fas fa-plus-circle"></i> Ver mais marcas';
            }, 200);
        });
    }

    // -------------------------------------------------------------
    // LÓGICA DAS MARCAS (ABRIR CATEGORIAS NO HOVER)
    // -------------------------------------------------------------
    todosBotoesMarca.forEach(botao => {
        // MUDANÇA: 'mouseenter' em vez de 'click'
        botao.addEventListener('mouseenter', function(e) {
            
            // Cancela o fechamento agendado (se o usuário veio de outro botão)
            clearTimeout(timeoutMenuCat);

            // Se for um item dentro do menu "Ver Mais", impede que o menu pai feche
            if(this.classList.contains('marca-item-extra')) {
                clearTimeout(timeoutMenuMais);
            }

            // Limpa visual dos outros
            todosBotoesMarca.forEach(b => {
                b.classList.remove('selecionada');
                b.style.backgroundColor = ''; 
                b.style.color = '';
            });

            // Marca este
            this.classList.add('selecionada');
            this.style.backgroundColor = '#ff6600';
            this.style.color = 'white';

            // Dados
            const marcaNome = this.getAttribute('data-marca') || this.innerText.trim();
            const marcaNomeBonito = this.innerText.trim();
            marcaAtualSelecionada = marcaNome;

            if(tituloMenuCat) tituloMenuCat.innerText = "Peças para " + marcaNomeBonito;

            // Posiciona e Mostra
            if(menuCategorias) {
                const rect = this.getBoundingClientRect();
                const ehMenuExtra = this.classList.contains('marca-item-extra');
                let top, left;

                if (ehMenuExtra) {
                    // Lateral
                    top = rect.top + window.scrollY; 
                    left = rect.right + window.scrollX + 5; 
                } else {
                    // Baixo
                    top = rect.bottom + window.scrollY;
                    left = rect.left + window.scrollX;
                }

                // Ajuste de tela
                if (left + 280 > window.innerWidth) {
                    if (ehMenuExtra) left = rect.left + window.scrollX - 290; 
                    else left = window.innerWidth - 290;
                }
                if (left < 0) left = 10;

                menuCategorias.style.top = top + 'px';
                menuCategorias.style.left = left + 'px';
                menuCategorias.style.display = 'block';
            }
        });

        // Quando tira o mouse da marca -> agenda fechamento
        botao.addEventListener('mouseleave', function() {
            agendarFechamentoCategorias();
        });
    });

    // -------------------------------------------------------------
    // INTERAÇÃO COM O PRÓPRIO MENU DE CATEGORIAS
    // -------------------------------------------------------------
    if(menuCategorias) {
        // Se o mouse entrar no menu laranja, cancela o fechamento dele
        menuCategorias.addEventListener('mouseenter', function() {
            clearTimeout(timeoutMenuCat);
            // Também cancela o fechamento do menu "Ver Mais" se estivermos vindo dele
            clearTimeout(timeoutMenuMais);
        });

        // Se sair do menu laranja, fecha ele
        menuCategorias.addEventListener('mouseleave', function() {
            agendarFechamentoCategorias();
            
            // Se o menu "Ver Mais" estava aberto, agenda para fechar ele também
            if(menuMaisMarcas && menuMaisMarcas.classList.contains('ativo')) {
                 timeoutMenuMais = setTimeout(() => {
                    menuMaisMarcas.classList.remove("ativo");
                    if(btnVerMais) btnVerMais.innerHTML = '<i class="fas fa-plus-circle"></i> Ver mais marcas';
                }, 200);
            }
        });
    }

    // -------------------------------------------------------------
    // REDIRECIONAMENTO AO CLICAR NA CATEGORIA (Isso mantém click)
    // -------------------------------------------------------------
    const botoesCat = document.querySelectorAll('.item-cat-dropdown');
    botoesCat.forEach(btn => {
        btn.addEventListener('click', function() {
            const categoria = this.getAttribute('data-cat');
            let url = `loja.html?marca=${encodeURIComponent(marcaAtualSelecionada)}`;
            if(categoria !== 'todas') {
                url += `&cat=${encodeURIComponent(categoria)}`;
            }
            window.location.href = url;
        });
    });

    // -------------------------------------------------------------
    // LIMPEZA GERAL NO SCROLL
    // -------------------------------------------------------------
    window.addEventListener('scroll', function() {
        if(menuCategorias) menuCategorias.style.display = 'none';
        if(menuMaisMarcas) {
            menuMaisMarcas.classList.remove('ativo');
            if(btnVerMais) btnVerMais.innerHTML = '<i class="fas fa-plus-circle"></i> Ver mais marcas';
        }
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