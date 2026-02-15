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
   2. CARREGAR PRODUTOS DESTAQUE
   ============================================================ */
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

        // Para os destaques, vamos pegar apenas os 8 primeiros ou produtos com "promocao"
        let contador = 0;

        querySnapshot.forEach((docSnap) => {
            if (contador >= 8) return; // Limita a 8 na home
            
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
            contador++;
        });

    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        container.innerHTML = '<p style="text-align:center;">Erro ao carregar produtos.</p>';
    }
}

/* ============================================================
   3. FUNÇÕES DO CARRINHO (Acessíveis Globalmente)
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
                                <button onclick="alterarQuantidade('${item.id}', 'diminuir')" style="border:none; background:none; padding: 2px 8px; cursor:pointer;">-</button>
                                <span style="font-size: 0.8rem; padding: 2px 5px; font-weight:bold;">${item.qtd}</span>
                                <button onclick="alterarQuantidade('${item.id}', 'aumentar')" style="border:none; background:none; padding: 2px 8px; cursor:pointer;">+</button>
                            </div>
                        </div>
                    </div>
                    <button onclick="removerItem('${item.id}')" style="border:none; background:none; color: #dc3545; cursor:pointer; font-size:16px;">
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

    // -------------------------------------------------------------
    // SISTEMA DE BUSCA (Search Bar)
    // -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // DELEGAÇÃO DE EVENTOS PARA OS MENUS (Pois são gerados dinamicamente)
    // -------------------------------------------------------------
    document.addEventListener('mouseover', function(e) {
        const btnVerMais = e.target.closest('#btnVerMais');
        const menuMaisMarcas = document.getElementById("menuMaisMarcas");
        const btnMarca = e.target.closest('.item-marca, .marca-item-extra');
        const menuCategorias = document.getElementById('menuCategoriasFlutuante');
        const isInsideMenuCat = e.target.closest('#menuCategoriasFlutuante');
        const isInsideMenuMais = e.target.closest('#menuMaisMarcas');

        // Hover no Botão de Ver Mais ou dentro do próprio menu
        if (btnVerMais || isInsideMenuMais) {
            clearTimeout(timeoutMenuMais);
            if(btnVerMais && menuMaisMarcas) {
                const rect = btnVerMais.getBoundingClientRect(); 
                menuMaisMarcas.style.top = (rect.bottom + window.scrollY + 5) + "px"; 
                let leftPos = rect.left + window.scrollX;
                if (leftPos + 220 > window.innerWidth) leftPos = window.innerWidth - 230;
                menuMaisMarcas.style.left = leftPos + "px";
                menuMaisMarcas.classList.add("ativo");
            }
        }

        // Hover nas Marcas
        if (btnMarca && menuCategorias) {
            clearTimeout(timeoutMenuCat);
            if (btnMarca.classList.contains('marca-item-extra')) {
                clearTimeout(timeoutMenuMais);
            }

            // Pega o nome da marca para o título das categorias
            marcaAtualSelecionada = btnMarca.innerText.trim();
            const tituloMenuCat = document.getElementById('tituloMarcaDropdown');
            if(tituloMenuCat) tituloMenuCat.innerText = "Categorias para " + marcaAtualSelecionada;

            // Posicionamento do menu de categorias
            const rect = btnMarca.getBoundingClientRect();
            const ehMenuExtra = btnMarca.classList.contains('marca-item-extra');
            let top, left;

            if (ehMenuExtra) {
                top = rect.top + window.scrollY; 
                left = rect.right + window.scrollX + 5; 
            } else {
                top = rect.bottom + window.scrollY;
                left = rect.left + window.scrollX;
            }

            if (left + 280 > window.innerWidth) {
                if (ehMenuExtra) left = rect.left + window.scrollX - 290; 
                else left = window.innerWidth - 290;
            }
            if (left < 0) left = 10;

            menuCategorias.style.top = top + 'px';
            menuCategorias.style.left = left + 'px';
            menuCategorias.style.display = 'block';
        }

        // Hover dentro do menu de categorias
        if (isInsideMenuCat) {
            clearTimeout(timeoutMenuCat);
            clearTimeout(timeoutMenuMais);
        }
    });

    document.addEventListener('mouseout', function(e) {
        const btnVerMais = e.target.closest('#btnVerMais');
        const isInsideMenuMais = e.target.closest('#menuMaisMarcas');
        const btnMarca = e.target.closest('.item-marca, .marca-item-extra');
        const isInsideMenuCat = e.target.closest('#menuCategoriasFlutuante');

        if (btnVerMais || isInsideMenuMais) {
            timeoutMenuMais = setTimeout(() => {
                const menu = document.getElementById("menuMaisMarcas");
                if(menu) menu.classList.remove("ativo");
            }, 200);
        }

        if (btnMarca || isInsideMenuCat) {
            timeoutMenuCat = setTimeout(() => {
                const menu = document.getElementById('menuCategoriasFlutuante');
                if(menu) menu.style.display = 'none';
            }, 200);
        }
    });

    // -------------------------------------------------------------
    // REDIRECIONAMENTO CORRETO DAS CATEGORIAS (Juntando Marca + Categoria)
    // -------------------------------------------------------------
    document.addEventListener('click', function(e) {
        const btnCat = e.target.closest('.item-cat-dropdown');
        if (btnCat) {
            e.preventDefault();
            const nomeCategoria = btnCat.innerText.replace('Ver Tudo na Loja', '').trim();
            
            let url = 'loja.html';
            
            // Se clicou em "Ver tudo", manda pra loja pura ou da marca
            if (btnCat.classList.contains('destaque')) {
                if (marcaAtualSelecionada) url += `?marca=${encodeURIComponent(marcaAtualSelecionada)}`;
            } else {
                // Se clicou numa categoria específica
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
        if(menuCategorias) menuCategorias.style.display = 'none';
        if(menuMaisMarcas) menuMaisMarcas.classList.remove('ativo');
        
        // Botão de Subir ao Topo
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