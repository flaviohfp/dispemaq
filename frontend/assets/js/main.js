import { db, collection, getDocs, auth, onAuthStateChanged, signOut } from './firebase-config.js';

/* ============================================================
   1. CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
   ============================================================ */
let carrinho = JSON.parse(localStorage.getItem('dispemaq_carrinho')) || [];
let marcaAtualSelecionada = ""; // Guarda qual marca o usuário clicou

/* ============================================================
   2. CARREGAR PRODUTOS DO FIREBASE
   ============================================================ */
async function carregarProdutosDestaque() {
    const container = document.getElementById('gradeDestaques');
    if (!container) return; 

    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 20px;">Carregando destaques...</p>';

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
            
            const htmlProduto = `
                <div class="card-produto">
                    <div class="produto-imagem">
                        ${produto.promocao ? '<span class="badge-desconto">Oferta</span>' : ''}
                        <img src="${imagem}" alt="${produto.nome}">
                    </div>
                    <div class="produto-info">
                        <span class="produto-categoria">${produto.categoria || 'Peças'}</span>
                        <h3 class="produto-nome">${produto.nome}</h3>
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
                            <button class="botao-detalhes"><i class="fas fa-eye"></i></button>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += htmlProduto;
        });

    } catch (error) {
        console.error("Erro:", error);
        container.innerHTML = '<p style="text-align:center;">Erro ao carregar produtos.</p>';
    }
}

/* ============================================================
   3. LÓGICA DO CARRINHO (Disponível globalmente)
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

// Funções globais (window) para o HTML acessar
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

/* ============================================================
   4. INICIALIZAÇÃO E LÓGICA DE MENUS (DOM READY)
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
    
    // Inicializações
    carregarProdutosDestaque();
    atualizarBadge();

    // --- A. MENU "VER MAIS MARCAS" ---
    const btnVerMais = document.getElementById("btnMarcas");
    const menuMaisMarcas = document.getElementById("menuMarcas");
    
    if (btnVerMais && menuMaisMarcas) {
        btnVerMais.addEventListener("click", function(e) {
            e.stopPropagation(); // Não deixa fechar na hora
            menuMaisMarcas.classList.toggle("ativo");
            
            // Fecha o menu de categorias se estiver aberto pra não dar bagunça
            const menuCat = document.getElementById('menuCategoriasFlutuante');
            if(menuCat) menuCat.style.display = 'none';

            // Atualiza texto do botão
            if (menuMaisMarcas.classList.contains("ativo")) {
                btnVerMais.innerHTML = '<i class="fas fa-minus-circle"></i> Ver menos';
            } else {
                btnVerMais.innerHTML = '<i class="fas fa-plus-circle"></i> Ver mais marcas';
            }
        });
    }

    // --- B. SISTEMA DE FILTRAGEM (O QUE VOCÊ PEDIU) ---
    const menuCategorias = document.getElementById('menuCategoriasFlutuante');
    const tituloMenuCat = document.getElementById('tituloMarcaDropdown');
    const todosBotoesMarca = document.querySelectorAll('.item-marca, .marca-item');

    // 1. Ao clicar na marca (Faixa laranja ou Menu Extra)
    todosBotoesMarca.forEach(botao => {
        botao.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // Importante para não fechar logo em seguida

            // Reset visual
            todosBotoesMarca.forEach(b => {
                b.classList.remove('selecionada');
                b.style.backgroundColor = '';
                b.style.color = '';
            });

            // Ativa visual da marca clicada
            this.classList.add('selecionada');
            this.style.backgroundColor = '#ff6600';
            this.style.color = 'white';

            // Guarda a marca
            const marcaNome = this.getAttribute('data-marca') || this.innerText.trim();
            const marcaNomeBonito = this.innerText.trim();
            marcaAtualSelecionada = marcaNome;

            // Prepara o menu de categorias
            if(tituloMenuCat) tituloMenuCat.innerText = "Peças para " + marcaNomeBonito;

            // POSICIONA E MOSTRA O MENU (FLUTUANTE)
            if(menuCategorias) {
                const rect = this.getBoundingClientRect(); // Pega onde o botão está
                const top = rect.bottom + window.scrollY; // Logo abaixo dele
                let left = rect.left + window.scrollX;

                // Se sair da tela na direita, ajusta
                if (left + 280 > window.innerWidth) {
                    left = window.innerWidth - 290;
                }

                menuCategorias.style.top = top + 'px';
                menuCategorias.style.left = left + 'px';
                menuCategorias.style.display = 'block'; // <<< AQUI QUE ELE APARECE
            }
        });
    });

    // 2. Ao clicar em uma Categoria (Motor, Hidráulica, etc)
    const botoesCat = document.querySelectorAll('.item-cat-dropdown');
    botoesCat.forEach(btn => {
        btn.addEventListener('click', function() {
            const categoria = this.getAttribute('data-cat');
            
            // Redireciona para a página da loja com os filtros
            // Ex: loja.html?marca=caterpillar&cat=motor
            let url = `loja.html?marca=${encodeURIComponent(marcaAtualSelecionada)}`;
            if(categoria !== 'todas') {
                url += `&cat=${encodeURIComponent(categoria)}`;
            }
            window.location.href = url;
        });
    });

    // 3. Fechar tudo ao clicar fora
    document.addEventListener('click', function(e) {
        // Fecha menu de categorias
        if(menuCategorias && menuCategorias.style.display === 'block') {
            if (!menuCategorias.contains(e.target)) {
                menuCategorias.style.display = 'none';
            }
        }
        // Fecha menu de mais marcas
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
            // Popup de aviso
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
});