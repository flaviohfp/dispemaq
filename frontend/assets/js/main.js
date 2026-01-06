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
   2. CARREGAR PRODUTOS E BANNERS (SEU CÓDIGO MANTIDO)
   ============================================================ */

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
            
            // CORREÇÃO: Note que o onclick chama window.adicionarAoCarrinho agora
            const htmlProduto = `
                <div class="card-produto">
                    <div class="produto-imagem">
                        ${produto.promocao ? '<span class="badge-desconto">Oferta</span>' : ''}
                        <a href="produto.html?id=${id}" style="display:block; width:100%; height:100%;">
                            <img src="${imagem}" alt="${produto.nome}" loading="lazy">
                        </a>
                    </div>
                    <div class="produto-info">
                        <span class="produto-categoria">${produto.categoria || 'Peças'}</span>
                        <a href="produto.html?id=${id}" style="text-decoration:none; color:inherit;">
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
   3. FUNÇÕES GLOBAIS (CARRINHO E UI) - CORRIGIDO "window."
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

// !!! AQUI ESTÁ A CORREÇÃO PRINCIPAL DO CARRINHO !!!
// Adicionamos "window." para o HTML conseguir enxergar essas funções
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
    // Força abrir carrinho e overlay
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
    
    if(car.classList.contains("aberto")) {
        car.classList.remove("aberto");
        if(over) over.classList.remove("ativo");
    } else {
        renderizarCarrinho();
        car.classList.add("aberto");
        if(over) over.classList.add("ativo");
    }
};

window.subirTopo = function() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Funções de controle do banner no window também
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

window.mudarSlide = function(direcao) {
    window.mostrarSlide(bannerSlideAtual + direcao);
}

window.irParaSlide = function(index) {
    window.mostrarSlide(index);
}

/* ============================================================
   4. INICIALIZAÇÃO (DOM READY) - CORREÇÃO DOS MENUS
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
    
    carregarProdutosDestaque();
    carregarBanners(); 
    atualizarBadge();

    // --- CORREÇÃO: LÓGICA DO MENU MAIS MARCAS ---
    const btnVerMais = document.getElementById("btnMarcas");
    const menuMaisMarcas = document.getElementById("menuMarcas");
    
    if (btnVerMais && menuMaisMarcas) {
        btnVerMais.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation(); // Impede clique fantasma
            
            // Alterna a classe .ativo
            menuMaisMarcas.classList.toggle("ativo");
            
            // Força o estilo DISPLAY via JS para garantir que abre
            if (menuMaisMarcas.classList.contains("ativo")) {
                menuMaisMarcas.style.display = "flex"; 
                btnVerMais.innerHTML = '<i class="fas fa-minus-circle"></i> Ver menos';
            } else {
                menuMaisMarcas.style.display = "none";
                btnVerMais.innerHTML = '<i class="fas fa-plus-circle"></i> Ver mais marcas';
            }

            // Esconde o menu flutuante se estiver aberto
            const menuCat = document.getElementById('menuCategoriasFlutuante');
            if(menuCat) menuCat.style.display = 'none';
        });
    }

    // --- CORREÇÃO: LÓGICA DO MENU DE CATEGORIAS FLUTUANTE ---
    const menuCategorias = document.getElementById('menuCategoriasFlutuante');
    const tituloMenuCat = document.getElementById('tituloMarcaDropdown');
    const overlay = document.getElementById("overlay");
    
    // Selecionamos TODOS os botões de marca (os visíveis e os dentro do menu extra)
    const todosBotoesMarca = document.querySelectorAll('.item-marca, .marca-item');

    todosBotoesMarca.forEach(botao => {
        botao.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            // 1. Reset visual
            todosBotoesMarca.forEach(b => {
                b.classList.remove('selecionada');
                b.style.backgroundColor = ''; 
                b.style.color = '';
            });

            // 2. Destaca o clicado
            this.classList.add('selecionada');
            this.style.backgroundColor = '#ff6600';
            this.style.color = 'white';

            // 3. Pega o nome da marca
            const marcaNome = this.getAttribute('data-marca') || this.innerText.trim();
            const marcaNomeBonito = this.innerText.trim();
            marcaAtualSelecionada = marcaNome;

            if(tituloMenuCat) tituloMenuCat.innerText = "Peças para " + marcaNomeBonito;

            // 4. Posiciona o Menu Flutuante
            if(menuCategorias) {
                const rect = this.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                
                // Calcula Topo e Esquerda
                const top = rect.bottom + scrollTop;
                let left = rect.left + scrollLeft;

                // Evita estourar a tela na direita
                if (left + 280 > window.innerWidth) left = window.innerWidth - 290;
                if (left < 0) left = 10;

                menuCategorias.style.top = top + 'px';
                menuCategorias.style.left = left + 'px';
                
                // FORÇA EXIBIÇÃO
                menuCategorias.style.display = 'block';
                menuCategorias.classList.add('ativo');

                // Abre overlay escuro (opcional, se quiser)
                if(overlay) overlay.classList.add('ativo');
            }
        });
    });

    // --- CLIQUE DENTRO DO MENU FLUTUANTE (CATEGORIAS) ---
    const botoesCat = document.querySelectorAll('.item-cat-dropdown');
    botoesCat.forEach(btn => {
        btn.addEventListener('click', function(e) {
            const categoria = this.getAttribute('data-cat');
            
            // Se tiver link href no HTML, deixe o navegador seguir. 
            // Se não, fazemos redirecionamento via JS:
            if (!this.href || this.href === '#' || this.href.includes('javascript')) {
                let url = `loja.html?marca=${encodeURIComponent(marcaAtualSelecionada)}`;
                if(categoria !== 'todas') url += `&cat=${encodeURIComponent(categoria)}`;
                window.location.href = url;
            }
        });
    });

    // --- FECHAR AO CLICAR FORA ---
    document.addEventListener('click', function(e) {
        // Fechar Menu Flutuante
        if(menuCategorias && menuCategorias.style.display === 'block') {
            const clicouNoMenu = menuCategorias.contains(e.target);
            const clicouEmMarca = e.target.closest('.item-marca') || e.target.closest('.marca-item');
            
            if (!clicouNoMenu && !clicouEmMarca) {
                menuCategorias.style.display = 'none';
                menuCategorias.classList.remove('ativo');
                // Remove cor dos botões
                todosBotoesMarca.forEach(b => {
                    b.style.backgroundColor = '';
                    b.style.color = '';
                });
            }
        }

        // Fechar Overlay fecha tudo
        if (e.target.id === 'overlay') {
            if(menuCategorias) menuCategorias.style.display = 'none';
            const car = document.getElementById("carrinhoLateral");
            if(car) car.classList.remove("aberto");
            overlay.classList.remove("ativo");
        }
    });

    // --- AUTH E OUTROS (MANTIDOS) ---
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
        } else {
            if(txtAuth) txtAuth.innerText = "Entrar";
            if(btnAuth) { btnAuth.href = "login.html"; btnAuth.onclick = null; }
            if(btnLinkAdmin) btnLinkAdmin.style.display = 'none';
        }
    });

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