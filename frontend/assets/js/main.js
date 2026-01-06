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
   2. CARREGAR PRODUTOS (COM LIMITAÇÃO) E BANNERS
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
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Nenhum produto em destaque no momento.</p>';
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
                                onclick="window.adicionarAoCarrinho(this)"
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
        console.error("Erro ao carregar produtos:", error);
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
                { img: 'https://placehold.co/1920x600/1e3a8a/FFF?text=Banner+1' },
                { img: 'https://placehold.co/1920x600/ff6600/FFF?text=Banner+2' }
            ];
        }

        slider.innerHTML = '';
        if(indicadores) indicadores.innerHTML = '';

        bannersData.forEach((banner, index) => {
            const imgSrc = banner.img || banner.imagem;
            const div = document.createElement('div');
            div.className = 'banner-item';
            div.innerHTML = `<img src="${imgSrc}" alt="Banner ${index + 1}">`;
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
            window.intervaloBanner = setInterval(() => {
                window.mudarSlide(1);
            }, 5000);
        }
    } catch (error) {
        console.error("Erro banner:", error);
    }
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
                                <button onclick="window.alterarQuantidade('${item.id}', 'diminuir')" style="border:none; background:none; padding: 2px 8px; cursor:pointer;">-</button>
                                <span style="font-size: 0.8rem; padding: 2px 5px;">${item.qtd}</span>
                                <button onclick="window.alterarQuantidade('${item.id}', 'aumentar')" style="border:none; background:none; padding: 2px 8px; cursor:pointer;">+</button>
                            </div>
                        </div>
                    </div>
                    <button onclick="window.removerItem('${item.id}')" style="border:none; background:none; color: red; cursor:pointer;"><i class="fas fa-trash"></i></button>
                </div>
            `;
        });
    }
    if(totalEl) {
        totalEl.innerText = 'R$ ' + totalPreco.toFixed(2).replace('.', ',');
    }
}

// === EXPORTANDO FUNÇÕES PARA O WINDOW PARA O HTML ACESSAR ===

window.adicionarAoCarrinho = function(el) {
    // Se o elemento vir do onclick(this), ele é o botão.
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
    
    // Força abertura do carrinho
    const car = document.getElementById("carrinhoLateral");
    const over = document.getElementById("overlay");
    if(car) car.classList.add("aberto");
    if(over) over.classList.add("ativo");
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
    
    if (car) {
        if(car.classList.contains("aberto")) {
            car.classList.remove("aberto");
            if(over) over.classList.remove("ativo");
        } else {
            renderizarCarrinho();
            car.classList.add("aberto");
            if(over) over.classList.add("ativo");
        }
    } else {
        console.error("Elemento carrinhoLateral não encontrado no HTML");
    }
};

window.subirTopo = function() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// --- BANNER CONTROLES ---
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
window.mudarSlide = (d) => window.mostrarSlide(bannerSlideAtual + d);
window.irParaSlide = (i) => window.mostrarSlide(i);


/* ============================================================
   4. INICIALIZAÇÃO (DOM READY)
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
    
    // Inicia funções
    carregarProdutosDestaque();
    carregarBanners(); 
    atualizarBadge();

    // 1. Lógica do Botão "Ver Mais Marcas"
    const btnVerMais = document.getElementById("btnMarcas");
    const menuMaisMarcas = document.getElementById("menuMarcas");
    
    if (btnVerMais && menuMaisMarcas) {
        btnVerMais.addEventListener("click", function(e) {
            e.preventDefault(); 
            e.stopPropagation();
            
            // Alterna a classe que mostra/esconde (conforme seu CSS)
            menuMaisMarcas.classList.toggle("ativo");
            
            // Esconde o menu flutuante de categorias para não atrapalhar
            const menuCat = document.getElementById('menuCategoriasFlutuante');
            if(menuCat) menuCat.style.display = 'none';

            // Muda o texto do botão
            const icone = menuMaisMarcas.classList.contains("ativo") ? "minus" : "plus";
            const texto = menuMaisMarcas.classList.contains("ativo") ? "Ver menos" : "Ver mais marcas";
            btnVerMais.innerHTML = `<i class="fas fa-${icone}-circle"></i> ${texto}`;
        });
    }

    // 2. Lógica de Clicar na Marca -> Abrir Menu Flutuante
    const menuCategorias = document.getElementById('menuCategoriasFlutuante');
    const tituloMenuCat = document.getElementById('tituloMarcaDropdown');
    // Pegamos todos os botões, inclusive os que estão dentro do menu oculto
    const todosBotoesMarca = document.querySelectorAll('.item-marca, .marca-item');

    todosBotoesMarca.forEach(botao => {
        botao.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            // Remove seleção visual dos outros
            todosBotoesMarca.forEach(b => {
                b.classList.remove('selecionada');
                b.style.backgroundColor = '';
                b.style.color = '';
            });

            // Adiciona seleção neste
            this.classList.add('selecionada');
            // Mantendo seu estilo inline, mas o ideal seria via CSS
            this.style.backgroundColor = '#ff6600';
            this.style.color = 'white';

            // Pega dados da marca
            const marcaNome = this.getAttribute('data-marca') || this.innerText.trim();
            const marcaNomeBonito = this.innerText.trim();
            marcaAtualSelecionada = marcaNome;

            if(tituloMenuCat) tituloMenuCat.innerText = "Peças para " + marcaNomeBonito;

            // Posicionamento do Menu Flutuante
            if(menuCategorias) {
                // Calcula posição baseado no botão clicado
                const rect = this.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

                const top = rect.bottom + scrollTop;
                let left = rect.left + scrollLeft;

                // Ajuste para não sair da tela na direita
                if (left + 280 > window.innerWidth) {
                    left = window.innerWidth - 290;
                }
                if (left < 0) left = 10; // Ajuste esquerda

                menuCategorias.style.top = top + 'px';
                menuCategorias.style.left = left + 'px';
                
                // Força a exibição (block) e classe ativo se usar CSS
                menuCategorias.style.display = 'block';
                menuCategorias.classList.add('ativo');

                // Opcional: Mostrar overlay escuro se existir
                const overlay = document.getElementById('overlay');
                if(overlay) overlay.classList.add('ativo');
            }
        });
    });

    // 3. Clique nas Categorias (Dentro do Flutuante) -> Ir para Loja
    const botoesCat = document.querySelectorAll('.item-cat-dropdown');
    botoesCat.forEach(btn => {
        btn.addEventListener('click', function() {
            const categoria = this.getAttribute('data-cat');
            
            // Monta URL de busca
            let url = `loja.html?marca=${encodeURIComponent(marcaAtualSelecionada)}`;
            if(categoria && categoria !== 'todas') {
                url += `&cat=${encodeURIComponent(categoria)}`;
            }
            window.location.href = url;
        });
    });

    // 4. Fechar Menus ao Clicar Fora
    document.addEventListener('click', function(e) {
        // Fechar Menu Categorias
        if(menuCategorias && (menuCategorias.style.display === 'block' || menuCategorias.classList.contains('ativo'))) {
            // Se o clique não foi no menu nem nos botões de marca
            const clicouNoMenu = menuCategorias.contains(e.target);
            const clicouEmMarca = e.target.closest('.item-marca') || e.target.closest('.marca-item');
            
            if (!clicouNoMenu && !clicouEmMarca) {
                menuCategorias.style.display = 'none';
                menuCategorias.classList.remove('ativo');
                // Remove destaque dos botões
                todosBotoesMarca.forEach(b => {
                    b.style.backgroundColor = '';
                    b.style.color = '';
                });
                
                // Se o carrinho não estiver aberto, fecha overlay
                const car = document.getElementById("carrinhoLateral");
                const overlay = document.getElementById("overlay");
                if (overlay && (!car || !car.classList.contains("aberto"))) {
                    overlay.classList.remove("ativo");
                }
            }
        }

        // Fechar Menu Mais Marcas (se clicar fora dele)
        if(menuMaisMarcas && menuMaisMarcas.classList.contains('ativo')) {
            if (!menuMaisMarcas.contains(e.target) && e.target !== btnVerMais && !btnVerMais.contains(e.target)) {
                // Não fecha automático se clicar dentro, apenas fora
                // (Opcional: se quiser fechar ao clicar fora, descomente abaixo)
                // menuMaisMarcas.classList.remove('ativo');
                // btnVerMais.innerHTML = '<i class="fas fa-plus-circle"></i> Ver mais marcas';
            }
        }
    });
    
    // Fechar Overlay fecha tudo
    const overlay = document.getElementById('overlay');
    if(overlay) {
        overlay.addEventListener('click', function() {
            // Fecha carrinho
            const car = document.getElementById("carrinhoLateral");
            if(car) car.classList.remove("aberto");
            
            // Fecha menu categorias
            if(menuCategorias) {
                menuCategorias.style.display = 'none';
                menuCategorias.classList.remove('ativo');
            }
            
            overlay.classList.remove("ativo");
        });
    }

    // --- LOGIN / LOGOUT ---
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