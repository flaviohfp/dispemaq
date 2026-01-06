import { db, collection, getDocs, doc, getDoc, auth, onAuthStateChanged, signOut, query, limit } from './firebase-config.js';

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
   2. CARREGAR PRODUTOS E BANNERS
   ============================================================ */

// A) Carregar Produtos
async function carregarProdutosDestaque() {
    const container = document.getElementById('gradeDestaques');
    if (!container) return; 

    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Carregando destaques...</p></div>';

    try {
        const q = query(collection(db, "produtos"), limit(12));
        const querySnapshot = await getDocs(q);

        container.innerHTML = ''; 

        if (querySnapshot.empty) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Nenhum produto em destaque.</p>';
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
                            <img src="${imagem}" alt="${produto.nome}" loading="lazy">
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

        container.innerHTML += `
            <div style="grid-column: 1/-1; text-align: center; margin-top: 30px; margin-bottom: 20px;">
                <a href="loja.html" class="cta-button" style="text-decoration: none; padding: 12px 30px; border-radius: 5px;">
                    Ver Catálogo Completo <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        `;

    } catch (error) {
        console.error("Erro produtos:", error);
        container.innerHTML = '<p style="text-align:center;">Erro ao carregar produtos.</p>';
    }
}

// B) Carregar Banners
async function carregarBanners() {
    const slider = document.getElementById('bannerSlider');
    const indicadores = document.getElementById('bannerIndicadores');
    if(!slider) return;

    try {
        let bannersData = [];
        const docRef = doc(db, "configuracoes", "banner_site");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const dados = docSnap.data();
            if (dados.listaBanners && Array.isArray(dados.listaBanners) && dados.listaBanners.length > 0) {
                bannersData = dados.listaBanners;
            } else if (dados.url) {
                bannersData = [{ img: dados.url }];
            }
        } 
        
        if (bannersData.length === 0) {
            bannersData = [
                { img: 'https://placehold.co/1920x600/1e3a8a/FFF?text=Banner+Padrão' }
            ];
        }

        slider.innerHTML = '';
        if(indicadores) indicadores.innerHTML = '';

        bannersData.forEach((banner, index) => {
            const div = document.createElement('div');
            div.className = 'banner-item';
            div.innerHTML = `<img src="${banner.img || banner.imagem}" alt="Banner ${index + 1}">`;
            slider.appendChild(div);

            if(indicadores) {
                const bola = document.createElement('div');
                bola.className = `indicador ${index === 0 ? 'ativo' : ''}`;
                bola.onclick = () => window.irParaSlide(index);
                indicadores.appendChild(bola);
            }
        });

        bannerTotalSlides = bannersData.length;
        bannerSlideAtual = 0;

        if (window.intervaloBanner) clearInterval(window.intervaloBanner);
        if (bannerTotalSlides > 1) {
            window.intervaloBanner = setInterval(() => { window.mudarSlide(1); }, 5000);
        }

    } catch (error) { console.error("Erro banner:", error); }
}

/* ============================================================
   3. FUNÇÕES GLOBAIS (CARRINHO E UI)
   ============================================================ */

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
    if(totalEl) totalEl.innerText = 'R$ ' + totalPreco.toFixed(2).replace('.', ',');
}

// Helpers Globais
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

window.subirTopo = function() { window.scrollTo({ top: 0, behavior: "smooth" }); }

// Banner Controles
window.mostrarSlide = function(index) {
    const slider = document.getElementById('bannerSlider');
    if (!slider || bannerTotalSlides <= 1) return;
    if (index >= bannerTotalSlides) bannerSlideAtual = 0;
    else if (index < 0) bannerSlideAtual = bannerTotalSlides - 1;
    else bannerSlideAtual = index;
    slider.style.transform = `translateX(-${bannerSlideAtual * 100}%)`;
    document.querySelectorAll('.indicador').forEach((b, i) => {
        b.classList.toggle('ativo', i === bannerSlideAtual);
    });
}
window.mudarSlide = function(direcao) { window.mostrarSlide(bannerSlideAtual + direcao); }
window.irParaSlide = function(index) { window.mostrarSlide(index); }

/* ============================================================
   4. INICIALIZAÇÃO (DOM READY)
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
    
    // Inicia funções básicas
    carregarProdutosDestaque();
    carregarBanners(); 
    atualizarBadge();

    // =================================================================
    // >>> CORREÇÃO PARA OS BOTÕES DE MARCAS NA HOME <<<
    // =================================================================
    
    // 1. CLIQUE NO CARD DA MARCA (Redirecionar para Loja)
    const marcasCards = document.querySelectorAll('.card-marca');
    marcasCards.forEach(card => {
        // Garante que o cursor pareça clicável
        card.style.cursor = "pointer";
        
        card.addEventListener('click', function() {
            const marca = this.getAttribute('data-marca');
            if (marca) {
                console.log("Indo para loja, marca:", marca);
                window.location.href = `loja.html?marca=${encodeURIComponent(marca)}`;
            } else {
                console.warn("Card sem data-marca definido.");
            }
        });
    });

    // 2. BOTÃO "VER MAIS MARCAS" (Correção de ID)
    // Tenta pegar pelo ID que você usou no HTML novo (btnVerMaisMarcasHome) 
    // OU pelo ID antigo (btnMarcas) caso não tenha atualizado o HTML.
    const btnVerMais = document.getElementById("btnVerMaisMarcasHome") || document.getElementById("btnMarcas");
    const menuMaisMarcas = document.getElementById("marcasEscondidasHome") || document.getElementById("menuMarcas");
    
    if (btnVerMais && menuMaisMarcas) {
        btnVerMais.addEventListener("click", function(e) {
            e.preventDefault();
            
            // Verifica se está visível (block, flex ou grid)
            const estiloDisplay = window.getComputedStyle(menuMaisMarcas).display;
            const estaVisivel = estiloDisplay !== 'none';

            if (estaVisivel) {
                menuMaisMarcas.style.display = 'none';
                btnVerMais.innerHTML = 'Ver todas as marcas <i class="fas fa-chevron-down"></i>';
            } else {
                // Abre como grid (ou flex, dependendo do seu CSS original)
                menuMaisMarcas.style.display = 'grid'; 
                btnVerMais.innerHTML = 'Ver menos <i class="fas fa-chevron-up"></i>';
            }
        });
    }
    // =================================================================

    // --- MANTENDO O MENU FLUTUANTE (Para o Header/Navbar) ---
    const menuCategorias = document.getElementById('menuCategoriasFlutuante');
    const tituloMenuCat = document.getElementById('tituloMarcaDropdown');
    const todosBotoesMarca = document.querySelectorAll('.item-marca, .marca-item'); // Navbar items

    todosBotoesMarca.forEach(botao => {
        botao.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            todosBotoesMarca.forEach(b => {
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

    // Cliques dentro do Menu Flutuante
    const botoesCat = document.querySelectorAll('.item-cat-dropdown');
    botoesCat.forEach(btn => {
        btn.addEventListener('click', function() {
            const categoria = this.getAttribute('data-cat');
            let url = `loja.html?marca=${encodeURIComponent(marcaAtualSelecionada)}`;
            if(categoria !== 'todas') url += `&cat=${encodeURIComponent(categoria)}`;
            window.location.href = url;
        });
    });

    // Fechar menus ao clicar fora
    document.addEventListener('click', function(e) {
        if(menuCategorias && menuCategorias.style.display === 'block') {
            if (!menuCategorias.contains(e.target)) menuCategorias.style.display = 'none';
        }
    });

    // --- AUTH & ADMIN ---
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
            if (user.email === EMAIL_ADMIN && btnLinkAdmin) btnLinkAdmin.style.display = 'inline-flex';
            else if(btnLinkAdmin) btnLinkAdmin.style.display = 'none';
            
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

    // Mobile & Scroll
    const btnMenu = document.getElementById('botaoMenuMobile');
    const navMenu = document.getElementById('menuNavegacao');
    if (btnMenu) btnMenu.addEventListener('click', () => navMenu.classList.toggle('ativo'));

    window.addEventListener('scroll', () => {
        const btn = document.getElementById("btnTopo");
        if (btn) {
            if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) btn.classList.add("visivel");
            else btn.classList.remove("visivel");
        }
    });
});