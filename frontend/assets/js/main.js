import { db, collection, getDocs, doc, getDoc, auth, onAuthStateChanged, signOut } from './firebase-config.js';

/* ============================================================
   1. CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
   ============================================================ */
let carrinho = JSON.parse(localStorage.getItem('dispemaq_carrinho')) || [];
let marcaAtualSelecionada = ""; 

// Timers para o hover dinâmico
let timeoutMenuCat = null;  
let timeoutMenuMais = null; 

const EMAIL_ADMIN = "admin@dispemaq.com"; 

/* ============================================================
   2. CARREGAR PRODUTOS DESTAQUE E VITRINES (BLINDADO)
   ============================================================ */
async function carregarProdutosDestaque() {
    const container = document.getElementById('gradeDestaques');
    
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

        const tracksVitrines = document.querySelectorAll('.carrossel-track');
        tracksVitrines.forEach(track => track.innerHTML = '');

        let contadorGrade = 0;

        querySnapshot.forEach((docSnap) => {
            const produto = docSnap.data();
            const id = docSnap.id; 
            
            const imagem = produto.img || produto.urlImagem || './assets/images/placeholder.jpg'; 
            const preco = parseFloat(produto.preco || 0);
            const linkDetalhes = `produto.html?id=${id}`;
            
            const htmlProduto = `
                <div class="card-produto" style="cursor: pointer;" onclick="window.location.href='${linkDetalhes}'">
                    <div class="produto-imagem">
                        ${produto.promocao ? '<span class="badge-desconto">Oferta</span>' : ''}
                        <img src="${imagem}" alt="${produto.nome}">
                    </div>
                    <div class="produto-info">
                        <span class="produto-categoria">${produto.categoria || 'Peças'}</span>
                        <h3 class="produto-nome">${produto.nome}</h3>
                        <span class="produto-codigo">Cód: ${produto.cod || produto.codigo || '--'}</span>
                        <div class="produto-precos">
                            <span class="preco-atual">R$ ${preco.toFixed(2).replace('.', ',')}</span>
                            <span class="preco-pix"><i class="fas fa-barcode"></i> R$ ${(preco * 0.95).toFixed(2).replace('.', ',')} no PIX</span>
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

        tracksVitrines.forEach(track => {
            if (track.innerHTML.trim() === '') {
                track.innerHTML = '<div style="width: 100%; text-align: center; padding: 30px; color: #aaa; font-size: 0.95rem;">Nenhum produto nesta vitrine no momento.</div>';
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
   3. FUNÇÕES DO CARRINHO
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
                    <div style="width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; background: #f9f9f9; border-radius: 5px; overflow:hidden;">
                         <img src="${item.img}" style="width:100%; height:100%; object-fit:contain;"> 
                    </div>
                    <div style="flex: 1;">
                        <h4 style="font-size: 0.85rem; margin: 0 0 5px 0; color: #333;">${item.nome}</h4>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: bold; color: #ff6600;">R$ ${(item.preco * item.qtd).toFixed(2).replace('.',',')}</span>
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
   4. INICIALIZAÇÃO E LÓGICA DE EVENTOS DINÂMICOS
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
    
    carregarProdutosDestaque();
    atualizarBadge();

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

    /* ----------------------------------------------------------------
       MENU FLUTUANTE (CATEGORIAS E MARCAS) - LÓGICA CORRIGIDA 100%
       ---------------------------------------------------------------- */
    document.addEventListener('mouseover', function(e) {
        const btnVerMais = e.target.closest('#btnVerMais');
        const menuMaisMarcas = document.getElementById("menuMaisMarcas");
        const btnMarca = e.target.closest('.item-marca, .marca-item-extra');
        const menuCategorias = document.getElementById('menuCategoriasFlutuante');
        
        const isInsideMenuCat = e.target.closest('#menuCategoriasFlutuante');
        const isInsideMenuMais = e.target.closest('#menuMaisMarcas');

        // LÓGICA: BOTÃO "VER MAIS MARCAS"
        if (isInsideMenuMais) {
            clearTimeout(timeoutMenuMais);
        } else if (btnVerMais && menuMaisMarcas) {
            clearTimeout(timeoutMenuMais);
            const rect = btnVerMais.getBoundingClientRect(); 
            
            menuMaisMarcas.style.display = 'block'; // Mostra antes de calcular tamanho
            let leftPos = rect.left + window.scrollX;
            if (leftPos + menuMaisMarcas.offsetWidth > window.innerWidth) {
                leftPos = window.innerWidth - menuMaisMarcas.offsetWidth - 10;
            }
            
            menuMaisMarcas.style.top = (rect.bottom + window.scrollY + 5) + "px"; 
            menuMaisMarcas.style.left = leftPos + "px";
            menuMaisMarcas.classList.add("ativo");
        }

        // LÓGICA: BOTÃO DA "MARCA" ABRE AS CATEGORIAS
        if (isInsideMenuCat) {
            clearTimeout(timeoutMenuCat); // Se o mouse tá dentro do menu, não fecha
            clearTimeout(timeoutMenuMais); // Se for uma marca extra, mantém o menu pai aberto
        } else if (btnMarca && menuCategorias) {
            clearTimeout(timeoutMenuCat);
            
            if (btnMarca.classList.contains('marca-item-extra')) {
                clearTimeout(timeoutMenuMais);
            }

            const novaMarca = btnMarca.innerText.trim();
            // Só muda o texto se for uma marca diferente da atual
            if (marcaAtualSelecionada !== novaMarca) {
                marcaAtualSelecionada = novaMarca;
                const tituloMenuCat = document.getElementById('tituloMarcaDropdown');
                if(tituloMenuCat) tituloMenuCat.innerText = "Categorias " + marcaAtualSelecionada;
            }

            // Exibir o menu ANTES de calcular a posição para não dar erro de largura 0
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

            // Evita que o menu passe da largura da tela direita
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
        const destino = e.relatedTarget; // Pra onde o mouse está indo?
        
        const saiuDeMarcaOuMenuCat = e.target.closest('.item-marca, .marca-item-extra') || e.target.closest('#menuCategoriasFlutuante');
        const saiuDeVerMaisOuMenuMais = e.target.closest('#btnVerMais') || e.target.closest('#menuMaisMarcas');

        // FECHAR MENU CATEGORIAS
        if (saiuDeMarcaOuMenuCat) {
            // Se o mouse tá indo pra DENTRO de um botão de marca ou pra DENTRO do próprio menu, não fazemos nada.
            if (destino && (destino.closest('.item-marca, .marca-item-extra') || destino.closest('#menuCategoriasFlutuante'))) {
                return;
            }
            
            timeoutMenuCat = setTimeout(() => {
                const menu = document.getElementById('menuCategoriasFlutuante');
                if(menu) {
                    menu.style.display = 'none';
                    menu.classList.remove('ativo');
                }
            }, 250); // Tolerância
        }

        // FECHAR MENU MAIS MARCAS
        if (saiuDeVerMaisOuMenuMais) {
            // Se ele foi pro menu flutuante de categorias, mantemos o menu de "Mais Marcas" aberto
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

    // -------------------------------------------------------------
    // REDIRECIONAMENTO CORRETO DAS CATEGORIAS (LOJA.HTML)
    // -------------------------------------------------------------
    document.addEventListener('click', function(e) {
        const btnCat = e.target.closest('.item-cat-dropdown');
        if (btnCat) {
            e.preventDefault();
            const nomeCategoria = btnCat.innerText.replace('Ver Tudo na Loja', '').trim();
            
            let url = 'loja.html';
            
            if (btnCat.classList.contains('destaque')) {
                if (marcaAtualSelecionada) url += `?marca=${encodeURIComponent(marcaAtualSelecionada)}`;
            } else {
                url += `?categoria=${encodeURIComponent(nomeCategoria)}`;
                if (marcaAtualSelecionada) {
                    url += `&marca=${encodeURIComponent(marcaAtualSelecionada)}`;
                }
            }
            window.location.href = url;
        }
    });

    // -------------------------------------------------------------
    // FECHAR MENUS NO SCROLL
    // -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // LOGIN / ADMIN AUTH
    // -------------------------------------------------------------
    const txtAuth = document.getElementById('txtAuth');
    const btnLinkAdmin = document.getElementById('btnLinkAdmin'); 
    
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

    // -------------------------------------------------------------
    // MOBILE
    // -------------------------------------------------------------
    const btnMenu = document.getElementById('botaoMenuMobile');
    const navMenu = document.getElementById('menuNavegacao');
    if (btnMenu && navMenu) {
        btnMenu.addEventListener('click', () => navMenu.classList.toggle('ativo'));
    }
});

/* ============================================================
   5. CARROSSEL DAS VITRINES (DESTAQUES, OFERTAS, ETC)
   ============================================================ */
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