import { db, collection, getDocs, doc, getDoc, auth, onAuthStateChanged, signOut } from './firebase-config.js';

/* ============================================================
   1. CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
   ============================================================ */
// Variáveis do Carrinho e Menus
let carrinho = [];
try {
    carrinho = JSON.parse(localStorage.getItem('dispemaq_carrinho')) || [];
} catch (e) {
    console.warn("Erro ao ler o carrinho do localStorage", e);
}

let marcaAtualSelecionada = ""; 
let timeoutMenuCat = null;  
let timeoutMenuMais = null; 
const EMAIL_ADMIN = "admin@dispemaq.com"; 

// Variáveis do Carrossel de Banners (vindas da index)
let currentIndex = 0;
let bannersData = [];
let intervaloCarrossel;

// Utilitário para formatar moeda no padrão BRL (R$)
const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

/* ============================================================
   2. FUNÇÕES DA HOME (BANNERS, MENUS DINÂMICOS E VITRINES INDEX)
   ============================================================ */

async function carregarBanners() {
    const track = document.getElementById("banner-track");
    if (!track) return;
  
    try {
        const docRef = doc(db, "configuracoes", "banner_site");
        const docSnap = await getDoc(docRef);
  
        if (docSnap.exists() && docSnap.data().listaBanners) {
            bannersData = docSnap.data().listaBanners;
  
            if (bannersData.length === 0) {
                track.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; color:#888;">Sem banners cadastrados</div>';
                return;
            }
  
            track.innerHTML = "";
            bannersData.forEach((banner) => {
                const img = document.createElement("img");
                img.src = banner.img || banner.imagem;
                img.style.width = "100%";
                img.style.height = "100%";
                img.style.objectFit = "cover";
                img.style.flexShrink = "0";
                track.appendChild(img);
            });
  
            iniciarControles();
        } else {
            track.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; color:#888;">Nenhum banner configurado</div>';
        }
    } catch (error) {
        console.error("Erro ao carregar banners:", error);
    }
}
  
function iniciarControles() {
    const track = document.getElementById("banner-track");
    const btnPrev = document.getElementById("btnPrev");
    const btnNext = document.getElementById("btnNext");
    const total = bannersData.length;
  
    const updateSlide = () => {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
    };
  
    if (btnNext)
        btnNext.addEventListener("click", () => {
            currentIndex = (currentIndex + 1) % total;
            updateSlide();
            resetTimer();
        });
  
    if (btnPrev)
        btnPrev.addEventListener("click", () => {
            currentIndex = (currentIndex - 1 + total) % total;
            updateSlide();
            resetTimer();
        });
  
    const startTimer = () => {
        intervaloCarrossel = setInterval(() => {
            currentIndex = (currentIndex + 1) % total;
            updateSlide();
        }, 4000);
    };
  
    const resetTimer = () => {
        clearInterval(intervaloCarrossel);
        startTimer();
    };
  
    startTimer();
}

async function carregarMenusDinamicos() {
    const barraMarcas = document.getElementById("barraMarcasContainer");
    const menuMaisMarcas = document.getElementById("menuMaisMarcas");
    const listaCategorias = document.getElementById("listaCategoriasContainer");
    const faixaLaranja = document.getElementById("faixaLaranjaCount");
    const spanCount = document.getElementById("countMarcas");
  
    try {
        const snapMarcas = await getDocs(collection(db, "marcas"));
        let marcas = [];
        snapMarcas.forEach((doc) => marcas.push(doc.data().nome));
        marcas.sort((a, b) => a.localeCompare(b));
  
        const snapCat = await getDocs(collection(db, "categorias"));
        let categorias = [];
        snapCat.forEach((doc) => categorias.push(doc.data().nome));
        categorias.sort((a, b) => a.localeCompare(b));
  
        if (marcas.length > 0) {
            if (faixaLaranja) faixaLaranja.style.display = "block";
            if (spanCount) spanCount.innerText = marcas.length;
        }
  
        if (barraMarcas && menuMaisMarcas) {
            barraMarcas.innerHTML = "";
            menuMaisMarcas.innerHTML = "";
  
            marcas.forEach((marca, index) => {
                const nomeExibicao = marca.toUpperCase();
                const valorUrl = encodeURIComponent(marca);
  
                if (index < 8) {
                    barraMarcas.innerHTML += `
                        <button class="item-marca" onclick="window.location.href='loja.html?marca=${valorUrl}'">
                            ${nomeExibicao}
                        </button>
                    `;
                } else {
                    menuMaisMarcas.innerHTML += `
                        <button class="marca-item-extra" onclick="window.location.href='loja.html?marca=${valorUrl}'">
                            ${nomeExibicao}
                        </button>
                    `;
                }
            });
  
            if (marcas.length > 8) {
                barraMarcas.innerHTML += `
                    <div class="dropdown-marcas">
                        <button id="btnVerMais" class="botao-marcas" onclick="abrirMenuMarcas(event)">
                            <i class="fas fa-plus-circle"></i> MARCAS
                        </button>
                    </div>
                `;
            }
        }
  
        if (listaCategorias) {
            listaCategorias.innerHTML = "";
            categorias.forEach((cat) => {
                listaCategorias.innerHTML += `
                    <button class="item-cat-dropdown" onclick="window.location.href='loja.html?categoria=${encodeURIComponent(cat)}'">
                        <i class="fas fa-chevron-right"></i> ${cat}
                    </button>
                `;
            });
  
            listaCategorias.innerHTML += `
                <button class="item-cat-dropdown destaque" onclick="window.location.href='loja.html'">
                     <strong>Ver Tudo na Loja</strong>
                </button>
            `;
        }
    } catch (error) {
        console.error("Erro ao carregar menus:", error);
        if (barraMarcas)
            barraMarcas.innerHTML = "<span style='color:#fff; padding:10px;'>Erro ao carregar marcas.</span>";
    }
}

async function carregarVitrines() {
    const tiposVitrines = [
        { idHTML: "lancamentos", chaves: ["lancamentos", "lançamentos", "lancamento"] },
        { idHTML: "destaques", chaves: ["destaques", "destaque", "destaque_semana", "destaques da semana"] },
        { idHTML: "ofertas", chaves: ["ofertas", "oferta"] },
        { idHTML: "interesses", chaves: ["interesses", "interessar", "você também pode estar interessado", "voce tambem pode estar interessado"] },
        { idHTML: "mais-vendidos", chaves: ["mais-vendidos", "mais_vendidos", "mais vendidos do mês", "mais vendidos do mes"] },
    ];
  
    try {
        const produtosRef = collection(db, "produtos");
        const querySnapshot = await getDocs(produtosRef);
  
        const todosProdutos = [];
        querySnapshot.forEach((doc) => {
            todosProdutos.push({ id: doc.id, ...doc.data() });
        });
  
        tiposVitrines.forEach((vitrine) => {
            const secaoVitrine = document.getElementById(`secao-${vitrine.idHTML}`);
            const trackVitrine = document.getElementById(`vitrine-${vitrine.idHTML}`);
  
            if (secaoVitrine && trackVitrine) {
                const produtosDestaVitrine = todosProdutos.filter((prod) => {
                    if (!prod.vitrines) return false;
                    const vitrinesDoProduto = Array.isArray(prod.vitrines) ? prod.vitrines : [prod.vitrines];
                    return vitrinesDoProduto.some((v) => vitrine.chaves.includes(String(v).toLowerCase().trim()));
                });
  
                if (produtosDestaVitrine.length > 0) {
                    secaoVitrine.style.display = "block";
                    trackVitrine.innerHTML = "";
                    produtosDestaVitrine.forEach((prod) => {
                        criarCardProduto(prod, trackVitrine);
                    });
                }
            }
        });
    } catch (error) {
        console.error("Erro ao carregar vitrines:", error);
    }
}

function criarCardProduto(p, container) {
    if (!container) return;
  
    const card = document.createElement("div");
    card.classList.add("produto-card");
    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
        window.location.href = `produto.html?id=${p.id}`;
    });
  
    const imgUrl = p.imagem || p.img || p.urlImagem || "./assets/images/sem-foto.png";
    let precoDisplay = "Consulte";
  
    if (p.preco) {
        let valor = p.preco;
        if (typeof valor === "string") {
            valor = parseFloat(valor.replace("R$", "").replace(/\./g, "").replace(",", ".").trim());
        }
        if (!isNaN(valor) && valor > 0) {
            precoDisplay = formatarMoeda(valor);
        } else {
            precoDisplay = p.preco;
        }
    }
  
    card.innerHTML = `
        <div class="img-container">
            <img src="${imgUrl}" alt="${p.nome}" onerror="this.src='./assets/images/sem-foto.png'">
        </div>
        <div class="produto-info">
            <span class="categoria-tag">${p.marca || p.categoria || "Geral"}</span>
            <h3 title="${p.nome}">${p.nome}</h3>
            <p class="codigo">Cód: ${p.codigo || "--"}</p>
            <div class="preco-box">
                <span class="preco">${precoDisplay}</span>
            </div>
            <button class="botao-comprar btn-add-carrinho" data-id="${p.id}" data-nome="${p.nome}" data-preco="${p.preco || 0}" data-img="${imgUrl}">
                <i class="fas fa-shopping-cart"></i> Comprar
            </button>
        </div>
    `;
  
    const btn = card.querySelector(".btn-add-carrinho");
    if (btn) {
        btn.addEventListener("click", (e) => {
            e.stopPropagation(); 
            window.adicionarAoCarrinho(btn);
        });
    }
  
    container.appendChild(card);
}

/* ============================================================
   3. CARREGAR PRODUTOS DESTAQUE (LÓGICA ANTERIOR MANTIDA)
   ============================================================ */
async function carregarProdutosDestaque() {
    const container = document.getElementById('gradeDestaques');
    const tracksVitrines = document.querySelectorAll('.carrossel-track');
    
    if (container) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 20px;">Carregando produtos...</p>';
    }

    try {
        const querySnapshot = await getDocs(collection(db, "produtos"));
        
        if (container) {
            container.innerHTML = ''; 
            if (querySnapshot.empty) {
                container.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Nenhum produto cadastrado.</p>';
            }
        }

        // Limpa as vitrines gerais antes de popular (caso existam)
        tracksVitrines.forEach(track => {
            if(!track.id.includes('vitrine-')) { // Evita limpar as vitrines específicas do index que já foram carregadas
                track.innerHTML = '';
            }
        });

        let contadorGrade = 0;

        querySnapshot.forEach((docSnap) => {
            const produto = docSnap.data();
            const id = docSnap.id; 
            
            const imagem = produto.img || produto.urlImagem || './assets/images/placeholder.jpg'; 
            const preco = parseFloat(produto.preco || 0);
            const precoPix = preco * 0.95;
            const linkDetalhes = `produto.html?id=${id}`;
            
            const htmlProduto = `
                <div class="card-produto" style="cursor: pointer;" onclick="window.location.href='${linkDetalhes}'">
                    <div class="produto-imagem">
                        ${produto.promocao ? '<span class="badge-desconto">Oferta</span>' : ''}
                        <img src="${imagem}" alt="${produto.nome}" loading="lazy">
                    </div>
                    <div class="produto-info">
                        <span class="produto-categoria">${produto.categoria || 'Peças'}</span>
                        <h3 class="produto-nome" title="${produto.nome}">${produto.nome}</h3>
                        <span class="produto-codigo">Cód: ${produto.cod || produto.codigo || '--'}</span>
                        <div class="produto-precos">
                            <span class="preco-atual">${formatarMoeda(preco)}</span>
                            <span class="preco-pix"><i class="fas fa-barcode"></i> ${formatarMoeda(precoPix)} no PIX</span>
                        </div>
                        <div class="produto-acoes">
                            <button class="botao-adicionar" 
                                onclick="event.stopPropagation(); window.adicionarAoCarrinho(this)"
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
            
            if (container && contadorGrade < 8) {
                container.innerHTML += htmlProduto;
                contadorGrade++;
            }

            let vitrinesDoProduto = produto.vitrines || produto.vitrine || [];
            if (typeof vitrinesDoProduto === 'string') {
                vitrinesDoProduto = vitrinesDoProduto.split(',');
            }

            if (Array.isArray(vitrinesDoProduto)) {
                vitrinesDoProduto.forEach(nomeVitrine => {
                    if (!nomeVitrine) return;
                    
                    const idVitrineLimpo = nomeVitrine.trim().toLowerCase();
                    const trackCorreta = document.getElementById(`track-${idVitrineLimpo}`);
                    
                    if (trackCorreta) {
                        trackCorreta.innerHTML += htmlProduto;
                    }
                });
            }
        });

    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        if (container) {
            container.innerHTML = '<p style="text-align:center;">Erro ao carregar produtos.</p>';
        }
    }
}

/* ============================================================
   4. FUNÇÕES EXPOSTAS AO HTML (WINDOW GLOBALS)
   ============================================================ */
window.abrirMenuMarcas = function (event) {
    event.stopPropagation();
    const menu = document.getElementById("menuMaisMarcas");
    const btn = event.currentTarget;
  
    if (menu.classList.contains("ativo")) {
        menu.classList.remove("ativo");
    } else {
        const rect = btn.getBoundingClientRect();
        menu.style.top = rect.bottom + window.scrollY + 5 + "px";
        menu.style.left = rect.left + window.scrollX - 100 + "px";
        menu.classList.add("ativo");
    }
};

// Fechar menu de marcas ao clicar fora (vindo da index)
document.addEventListener("click", function (e) {
    const menu = document.getElementById("menuMaisMarcas");
    const btn = document.getElementById("btnVerMais");
    if (menu && menu.classList.contains("ativo") && e.target !== menu && (!btn || !btn.contains(e.target))) {
        menu.classList.remove("ativo");
    }
});

window.adicionarAoCarrinho = function(el) {
    let precoFormatado = el.getAttribute('data-preco');
    if (typeof precoFormatado === "string") {
        precoFormatado = parseFloat(precoFormatado.replace("R$", "").replace(/\./g, "").replace(",", ".").trim());
    }

    const produto = {
        id: el.getAttribute('data-id'),
        nome: el.getAttribute('data-nome'),
        preco: precoFormatado || 0,
        img: el.getAttribute('data-img'),
        qtd: 1
    };
    
    const existente = carrinho.find(i => i.id === produto.id);
    if (existente) existente.qtd++;
    else carrinho.push(produto);
    
    atualizarBadge();
    renderizarCarrinho();
    abrirCarrinhoLateral();
};

window.alterarQuantidade = function(id, acao) {
    const item = carrinho.find(i => i.id === id);
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
    carrinho = carrinho.filter(i => i.id !== id);
    atualizarBadge();
    renderizarCarrinho();
};

window.toggleCarrinho = function(e) {
    if (e) e.preventDefault();
    const car = document.getElementById("carrinhoLateral");
    if (car && car.classList.contains("aberto")) {
        fecharCarrinhoLateral();
    } else {
        renderizarCarrinho();
        abrirCarrinhoLateral();
    }
};

window.subirTopo = function() {
    window.scrollTo({ top: 0, behavior: "smooth" });
};

window.scrollVitrine = function(botao, direcao) {
    const container = botao.parentElement;
    const track = container.querySelector('.carrossel-track');
    if (!track) return;

    const tamanhoRolagem = track.clientWidth > 600 ? 600 : track.clientWidth;
    
    if (direcao === 'left') {
        track.scrollBy({ left: -tamanhoRolagem, behavior: 'smooth' });
    } else if (direcao === 'right') {
        track.scrollBy({ left: tamanhoRolagem, behavior: 'smooth' });
    }
};

/* ============================================================
   5. FUNÇÕES INTERNAS DE CARRINHO
   ============================================================ */
function abrirCarrinhoLateral() {
    document.getElementById("carrinhoLateral")?.classList.add("aberto");
    document.getElementById("overlay")?.classList.add("ativo");
}

function fecharCarrinhoLateral() {
    document.getElementById("carrinhoLateral")?.classList.remove("aberto");
    document.getElementById("overlay")?.classList.remove("ativo");
}

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
                    <div style="width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; background: #f9f9f9; border-radius: 5px; overflow:hidden;">
                         <img src="${item.img}" style="width:100%; height:100%; object-fit:contain;" loading="lazy"> 
                    </div>
                    <div style="flex: 1;">
                        <h4 style="font-size: 0.85rem; margin: 0 0 5px 0; color: #333;">${item.nome}</h4>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: bold; color: #ff6600;">${formatarMoeda(item.preco * item.qtd)}</span>
                            <div style="border: 1px solid #ddd; border-radius: 4px; display:flex; align-items:center;">
                                <button onclick="window.alterarQuantidade('${item.id}', 'diminuir')" style="border:none; background:none; padding: 2px 8px; cursor:pointer;">-</button>
                                <span style="font-size: 0.8rem; padding: 2px 5px; font-weight:bold;">${item.qtd}</span>
                                <button onclick="window.alterarQuantidade('${item.id}', 'aumentar')" style="border:none; background:none; padding: 2px 8px; cursor:pointer;">+</button>
                            </div>
                        </div>
                    </div>
                    <button onclick="window.removerItem('${item.id}')" style="border:none; background:none; color: #dc3545; cursor:pointer; font-size:16px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });
    }
    if(totalEl) {
        totalEl.innerText = formatarMoeda(totalPreco);
    }
}

/* ============================================================
   6. INICIALIZAÇÃO E LÓGICA DE EVENTOS (DOM)
   ============================================================ */
document.addEventListener('DOMContentLoaded', async function() {
    
    // Funções anteriores
    carregarProdutosDestaque();
    atualizarBadge();

    // Funções vindas da index
    await carregarBanners();
    await carregarMenusDinamicos();
    await carregarVitrines();

    // SISTEMA DE BUSCA
    const btnBuscar = document.getElementById('botaoBuscar');
    const campoBusca = document.getElementById('campoBusca');
    
    function realizarBusca() {
        if (campoBusca && campoBusca.value.trim() !== "") {
            window.location.href = `loja.html?busca=${encodeURIComponent(campoBusca.value.trim())}`;
        }
    }

    if (btnBuscar) btnBuscar.addEventListener('click', realizarBusca);
    if (campoBusca) {
        campoBusca.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') realizarBusca();
        });
    }

    /* --- EVENTOS DO MENU FLUTUANTE --- */
    document.addEventListener('mouseover', function(e) {
        const btnVerMais = e.target.closest('#btnVerMais');
        const menuMaisMarcas = document.getElementById("menuMaisMarcas");
        const btnMarca = e.target.closest('.item-marca, .marca-item-extra');
        const menuCategorias = document.getElementById('menuCategoriasFlutuante');
        
        const isInsideMenuCat = e.target.closest('#menuCategoriasFlutuante');
        const isInsideMenuMais = e.target.closest('#menuMaisMarcas');

        if (isInsideMenuMais) {
            clearTimeout(timeoutMenuMais);
        } else if (btnVerMais && menuMaisMarcas) {
            clearTimeout(timeoutMenuMais);
            const rect = btnVerMais.getBoundingClientRect(); 
            
            menuMaisMarcas.style.display = 'block'; 
            let leftPos = rect.left + window.scrollX;
            if (leftPos + menuMaisMarcas.offsetWidth > window.innerWidth) {
                leftPos = window.innerWidth - menuMaisMarcas.offsetWidth - 10;
            }
            
            menuMaisMarcas.style.top = (rect.bottom + window.scrollY + 5) + "px"; 
            menuMaisMarcas.style.left = leftPos + "px";
            menuMaisMarcas.classList.add("ativo");
        }

        if (isInsideMenuCat) {
            clearTimeout(timeoutMenuCat); 
            clearTimeout(timeoutMenuMais); 
        } else if (btnMarca && menuCategorias) {
            clearTimeout(timeoutMenuCat);
            if (btnMarca.classList.contains('marca-item-extra')) {
                clearTimeout(timeoutMenuMais);
            }

            const novaMarca = btnMarca.innerText.trim();
            if (marcaAtualSelecionada !== novaMarca) {
                marcaAtualSelecionada = novaMarca;
                const tituloMenuCat = document.getElementById('tituloMarcaDropdown');
                if(tituloMenuCat) tituloMenuCat.innerText = "Categorias " + marcaAtualSelecionada;
            }

            menuCategorias.style.display = 'block';
            menuCategorias.classList.add('ativo');

            const rect = btnMarca.getBoundingClientRect();
            const ehMenuExtra = btnMarca.classList.contains('marca-item-extra');
            let top, left;

            if (ehMenuExtra) {
                top = rect.top + window.scrollY; 
                left = rect.right + window.scrollX; 
            } else {
                top = rect.bottom + window.scrollY;
                left = rect.left + window.scrollX;
            }

            if (left + menuCategorias.offsetWidth > window.innerWidth) {
                if (ehMenuExtra) left = rect.left + window.scrollX - menuCategorias.offsetWidth - 5; 
                else left = window.innerWidth - menuCategorias.offsetWidth - 15;
            }
            if (left < 0) left = 10;

            menuCategorias.style.top = top + 'px';
            menuCategorias.style.left = left + 'px';
        }
    });

    document.addEventListener('mouseout', function(e) {
        const destino = e.relatedTarget;
        const saiuDeMarcaOuMenuCat = e.target.closest('.item-marca, .marca-item-extra') || e.target.closest('#menuCategoriasFlutuante');
        const saiuDeVerMaisOuMenuMais = e.target.closest('#btnVerMais') || e.target.closest('#menuMaisMarcas');

        if (saiuDeMarcaOuMenuCat) {
            if (destino && (destino.closest('.item-marca, .marca-item-extra') || destino.closest('#menuCategoriasFlutuante'))) {
                return;
            }
            timeoutMenuCat = setTimeout(() => {
                const menu = document.getElementById('menuCategoriasFlutuante');
                if(menu) {
                    menu.style.display = 'none';
                    menu.classList.remove('ativo');
                }
            }, 250);
        }

        if (saiuDeVerMaisOuMenuMais) {
            if (destino && (destino.closest('#menuMaisMarcas') || destino.closest('#btnVerMais') || destino.closest('#menuCategoriasFlutuante'))) {
                return;
            }
            timeoutMenuMais = setTimeout(() => {
                const menu = document.getElementById("menuMaisMarcas");
                if(menu) {
                    menu.classList.remove("ativo");
                    menu.style.display = 'none';
                }
            }, 250);
        }
    });

    /* --- REDIRECIONAMENTO CORRETO DAS CATEGORIAS (USANDO URLSearchParams) --- */
    document.addEventListener('click', function(e) {
        const btnCat = e.target.closest('.item-cat-dropdown');
        if (btnCat) {
            e.preventDefault();
            const nomeCategoria = btnCat.innerText.replace('Ver Tudo na Loja', '').trim();
            const params = new URLSearchParams();
            
            if (!btnCat.classList.contains('destaque')) {
                params.append('categoria', nomeCategoria);
            }
            
            if (marcaAtualSelecionada) {
                params.append('marca', marcaAtualSelecionada);
            }
            
            const queryString = params.toString();
            window.location.href = queryString ? `loja.html?${queryString}` : 'loja.html';
        }
    });

    /* --- SCROLL E TOPO --- */
    window.addEventListener('scroll', function() {
        const menuCategorias = document.getElementById('menuCategoriasFlutuante');
        const menuMaisMarcas = document.getElementById('menuMaisMarcas');
        if(menuCategorias) {
            menuCategorias.style.display = 'none';
            menuCategorias.classList.remove('ativo');
        }
        if(menuMaisMarcas) {
            menuMaisMarcas.style.display = 'none';
            menuMaisMarcas.classList.remove('ativo');
        }
        
        const btnTopo = document.getElementById("btnTopo");
        if (btnTopo) {
            if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
                btnTopo.classList.add("visivel");
            } else {
                btnTopo.classList.remove("visivel");
            }
        }
    });

    /* --- AUTH ADMIN / LOGIN --- */
    const txtAuth = document.getElementById('txtAuth');
    const btnLinkAdmin = document.getElementById('btnLinkAdmin'); 
    
    if (typeof onAuthStateChanged === 'function') {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                if(txtAuth) txtAuth.innerHTML = "<strong>Minha</strong><br>Conta";
                if (user.email === EMAIL_ADMIN && btnLinkAdmin) {
                    btnLinkAdmin.style.display = 'inline-flex';
                } else if(btnLinkAdmin) {
                    btnLinkAdmin.style.display = 'none';
                }
                const popup = document.getElementById('popupAvisoLogin');
                if(popup) popup.style.display = 'none';
            } else {
                if(txtAuth) txtAuth.innerHTML = "<strong>Entre</strong> ou<br><strong>Cadastre-se</strong>";
                if(btnLinkAdmin) btnLinkAdmin.style.display = 'none';
            }
        });
    }

    /* --- MOBILE --- */
    const btnMenu = document.getElementById('botaoMenuMobile');
    const navMenu = document.getElementById('menuNavegacao');
    if (btnMenu && navMenu) {
        btnMenu.addEventListener('click', () => navMenu.classList.toggle('ativo'));
    }
});