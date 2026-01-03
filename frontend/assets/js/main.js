import { db, collection, getDocs, auth, onAuthStateChanged, signOut } from './firebase-config.js';

/* ============================================================
   1. CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
   ============================================================ */
let carrinho = JSON.parse(localStorage.getItem('dispemaq_carrinho')) || [];
let marcaAtualSelecionada = ""; 

// Variáveis do Banner
let bannerSlideAtual = 0;
let bannerTotalSlides = 0;
// Variável para controlar o timer do banner e não acumular velocidade
window.intervaloBanner = null; 

/* ============================================================
   2. CARREGAR PRODUTOS E BANNERS DO FIREBASE
   ============================================================ */

// A) Carregar Produtos (ATUALIZADO COM LINKS PARA DETALHES)
// A) Carregar Produtos (Versão corrigida: Clique na Imagem)
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

        querySnapshot.forEach((doc) => {
            const produto = doc.data();
            const id = doc.id;
            const imagem = produto.urlImagem || './assets/images/placeholder.jpg';
            const preco = parseFloat(produto.preco || 0);
            
            // LINK IMPORTANTE: Envia o ID pela URL
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

                        <span class="produto-codigo">Cód: ${produto.codigo || '--'}</span>
                        
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

 
// B) Carregar Banners (Mantida original)
async function carregarBanners() {
    const slider = document.getElementById('bannerSlider');
    const indicadores = document.getElementById('bannerIndicadores');
    if(!slider) return;

    try {
        const snapshot = await getDocs(collection(db, "banners"));
        let bannersData = [];

        // Verifica se tem banners no banco. 
        // Se NÃO tiver, cria 3 fictícios para o carrossel rodar (teste).
        if (!snapshot.empty) {
            snapshot.forEach(doc => bannersData.push(doc.data()));
        } else {
            console.log("Nenhum banner no Firebase. Usando banners de teste.");
            bannersData = [
                { imagem: 'https://placehold.co/1920x600/1e3a8a/FFF?text=Banner+1+-+Ofertas+da+Semana' },
                { imagem: 'https://placehold.co/1920x600/ff6600/FFF?text=Banner+2+-+Envio+para+todo+Brasil' },
                { imagem: 'https://placehold.co/1920x600/333333/FFF?text=Banner+3+-+Peças+Caterpillar' }
            ];
        }

        // Limpa o HTML atual
        slider.innerHTML = '';
        if(indicadores) indicadores.innerHTML = '';

        // Renderiza os Banners
        bannersData.forEach((banner, index) => {
            // Cria a div da imagem
            const div = document.createElement('div');
            div.className = 'banner-item';
            div.innerHTML = `<img src="${banner.imagem}" alt="Banner ${index}">`;
            slider.appendChild(div);

            // Cria a bolinha indicadora
            if(indicadores) {
                const bola = document.createElement('div');
                bola.className = `indicador ${index === 0 ? 'ativo' : ''}`;
                // Função de clique na bolinha
                bola.onclick = () => window.irParaSlide(index);
                indicadores.appendChild(bola);
            }
        });

        // Configura variáveis de controle
        bannerTotalSlides = bannersData.length;
        bannerSlideAtual = 0;

        // Inicia o Auto-Play (limpa anterior se existir)
        if (window.intervaloBanner) clearInterval(window.intervaloBanner);
        
        window.intervaloBanner = setInterval(() => {
            if(bannerTotalSlides > 1) window.mudarSlide(1);
        }, 5000); // Muda a cada 5 segundos

    } catch (error) {
        console.error("Erro banner:", error);
        // Fallback visual em caso de erro grave
        slider.innerHTML = '<div class="banner-item"><img src="https://placehold.co/1920x500?text=Erro+ao+carregar+banners" alt="Erro"></div>';
    }
}

/* ============================================================
   3. FUNÇÕES GLOBAIS (Disponíveis no HTML)
   ============================================================ */

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
    if(totalEl) totalEl.innerText = 'R$ ' + totalPreco.toFixed(2).replace('.', ',');
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

// --- NAVEGAÇÃO / SCROLL ---
window.subirTopo = function() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// --- BANNER (CONTROLES) ---
window.mostrarSlide = function(index) {
    const slider = document.getElementById('bannerSlider');
    if (!slider || bannerTotalSlides === 0) return;

    // Lógica circular (se passar do último, volta pro primeiro)
    if (index >= bannerTotalSlides) bannerSlideAtual = 0;
    else if (index < 0) bannerSlideAtual = bannerTotalSlides - 1;
    else bannerSlideAtual = index;

    // Move o container
    slider.style.transform = `translateX(-${bannerSlideAtual * 100}%)`;

    // Atualiza as bolinhas
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
   4. INICIALIZAÇÃO (DOM READY)
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
    
    // Inicializações
    carregarProdutosDestaque();
    carregarBanners(); 
    atualizarBadge();

    // --- A. MENU "VER MAIS MARCAS" ---
    const btnVerMais = document.getElementById("btnMarcas");
    const menuMaisMarcas = document.getElementById("menuMarcas");
    
    if (btnVerMais && menuMaisMarcas) {
        btnVerMais.addEventListener("click", function(e) {
            e.stopPropagation();
            menuMaisMarcas.classList.toggle("ativo");
            
            // Fecha menu de categorias para não sobrepor
            const menuCat = document.getElementById('menuCategoriasFlutuante');
            if(menuCat) menuCat.style.display = 'none';

            if (menuMaisMarcas.classList.contains("ativo")) {
                btnVerMais.innerHTML = '<i class="fas fa-minus-circle"></i> Ver menos';
            } else {
                btnVerMais.innerHTML = '<i class="fas fa-plus-circle"></i> Ver mais marcas';
            }
        });
    }

    // --- B. MENU DE CATEGORIAS FLUTUANTE ---
    const menuCategorias = document.getElementById('menuCategoriasFlutuante');
    const tituloMenuCat = document.getElementById('tituloMarcaDropdown');
    const todosBotoesMarca = document.querySelectorAll('.item-marca, .marca-item');

    // 1. Clique na Marca
    todosBotoesMarca.forEach(botao => {
        botao.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            // Reset visual
            todosBotoesMarca.forEach(b => {
                b.classList.remove('selecionada');
                b.style.backgroundColor = '';
                b.style.color = '';
            });

            // Ativa visual
            this.classList.add('selecionada');
            this.style.backgroundColor = '#ff6600';
            this.style.color = 'white';

            // Dados da marca
            const marcaNome = this.getAttribute('data-marca') || this.innerText.trim();
            const marcaNomeBonito = this.innerText.trim();
            marcaAtualSelecionada = marcaNome;

            if(tituloMenuCat) tituloMenuCat.innerText = "Peças para " + marcaNomeBonito;

            // Posiciona o Menu Flutuante
            if(menuCategorias) {
                const rect = this.getBoundingClientRect();
                const top = rect.bottom + window.scrollY;
                let left = rect.left + window.scrollX;

                // Ajuste se sair da tela (mobile/telas pequenas)
                if (left + 280 > window.innerWidth) {
                    left = window.innerWidth - 290;
                }
                if (left < 0) left = 10;

                menuCategorias.style.top = top + 'px';
                menuCategorias.style.left = left + 'px';
                menuCategorias.style.display = 'block';
            }
        });
    });

    // 2. Clique na Categoria (Redirecionar)
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

    // 3. Fechar Menus ao clicar fora
    document.addEventListener('click', function(e) {
        // Fecha categorias
        if(menuCategorias && menuCategorias.style.display === 'block') {
            if (!menuCategorias.contains(e.target)) {
                menuCategorias.style.display = 'none';
            }
        }
        // Fecha "Mais Marcas"
        if(menuMaisMarcas && menuMaisMarcas.classList.contains('ativo')) {
            if (!menuMaisMarcas.contains(e.target) && e.target !== btnVerMais) {
                menuMaisMarcas.classList.remove('ativo');
                btnVerMais.innerHTML = '<i class="fas fa-plus-circle"></i> Ver mais marcas';
            }
        }
    });

    // --- C. LOGIN / LOGOUT ---
    const btnAuth = document.getElementById('btnAuth');
    const txtAuth = document.getElementById('txtAuth');
    
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
            const popup = document.getElementById('popupAvisoLogin');
            if(popup) popup.style.display = 'none';
        } else {
            if(txtAuth) txtAuth.innerText = "Entrar";
            if(btnAuth) {
                btnAuth.href = "login.html";
                btnAuth.onclick = null;
            }
            const popup = document.getElementById('popupAvisoLogin');
            if (popup && !sessionStorage.getItem('popupFechado')) {
                popup.style.display = 'flex';
            }
        }
    });

    // --- D. MENU MOBILE ---
    const btnMenu = document.getElementById('botaoMenuMobile');
    const navMenu = document.getElementById('menuNavegacao');
    if (btnMenu) btnMenu.addEventListener('click', () => navMenu.classList.toggle('ativo'));

    // --- E. SCROLL TO TOP (Botão subir) ---
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