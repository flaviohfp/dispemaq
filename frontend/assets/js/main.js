import { db, collection, getDocs, auth, onAuthStateChanged, signOut } from './firebase-config.js';

/* ============================================================
   1. CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
   ============================================================ */
// O carrinho começa lendo o que está salvo no navegador (LocalStorage)
let carrinho = JSON.parse(localStorage.getItem('dispemaq_carrinho')) || [];

/* ============================================================
   2. CARREGAR PRODUTOS DO FIREBASE (REAL)
   Essa função vai no banco de dados, pega o que o cliente cadastrou
   e desenha na tela inicial.
   ============================================================ */
async function carregarProdutosDestaque() {
    const container = document.getElementById('gradeDestaques');
    
    // Se não tiver essa div na página (ex: login.html), para por aqui
    if (!container) return; 

    // Mostra um "Carregando..." enquanto busca
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Carregando produtos...</p>';

    try {
        // Busca a coleção 'produtos' no Firebase
        const querySnapshot = await getDocs(collection(db, "produtos"));
        
        container.innerHTML = ''; // Limpa o carregando

        if (querySnapshot.empty) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Nenhum produto cadastrado ainda.</p>';
            return;
        }

        // Para cada produto encontrado no banco...
        querySnapshot.forEach((doc) => {
            const produto = doc.data();
            const id = doc.id; // ID único do Firebase
            
            // Define imagem padrão se o cliente esqueceu de colocar
            const imagem = produto.urlImagem || './assets/images/placeholder.jpg';
            const precoFormatado = parseFloat(produto.preco).toFixed(2).replace('.', ',');
            const precoPix = (parseFloat(produto.preco) * 0.95).toFixed(2).replace('.', ',');

            // Cria o HTML do Card
            const htmlProduto = `
                <div class="card-produto">
                    <div class="produto-imagem">
                        ${produto.promocao ? '<span class="badge-desconto">Oferta</span>' : ''}
                        <img src="${imagem}" alt="${produto.nome}" style="max-width:80%; max-height:80%;">
                    </div>
                    <div class="produto-info">
                        <span class="produto-categoria">${produto.categoria || 'Peças'}</span>
                        <h3 class="produto-nome">${produto.nome}</h3>
                        <span class="produto-codigo">Cód: ${produto.codigo || '---'}</span>
                        
                        <div class="produto-precos">
                            <span class="preco-atual">R$ ${precoFormatado}</span>
                            <span class="preco-pix"><i class="fas fa-barcode"></i> R$ ${precoPix} no PIX</span>
                        </div>
                        
                        <div class="produto-acoes">
                            <button class="botao-adicionar" 
                                onclick="adicionarAoCarrinho(this)"
                                data-id="${id}"
                                data-nome="${produto.nome}"
                                data-preco="${produto.preco}"
                                data-img="${imagem}">
                                <i class="fas fa-shopping-cart"></i> Comprar
                            </button>
                            <button class="botao-detalhes">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Adiciona na tela
            container.innerHTML += htmlProduto;
        });

    } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        container.innerHTML = '<p>Erro ao carregar produtos.</p>';
    }
}


/* ============================================================
   3. FUNÇÕES DO CARRINHO (Lógica Atualizada)
   ============================================================ */

function atualizarBadge() {
    const badges = document.querySelectorAll('.badge-carrinho, #badgeCarrinho'); 
    const totalItens = carrinho.reduce((acc, item) => acc + item.qtd, 0);
    
    badges.forEach(b => {
        b.innerText = totalItens;
        b.style.display = totalItens > 0 ? 'flex' : 'none';
    });
    localStorage.setItem('dispemaq_carrinho', JSON.stringify(carrinho));
}

// Essa função agora recebe o PRÓPRIO BOTÃO clicado (el)
window.adicionarAoCarrinho = function(el) {
    // Pega os dados direto do HTML do botão
    const id = el.getAttribute('data-id');
    const nome = el.getAttribute('data-nome');
    const preco = parseFloat(el.getAttribute('data-preco'));
    const img = el.getAttribute('data-img');

    // Verifica se já tem no carrinho
    const itemExistente = carrinho.find(item => item.id === id);
    if (itemExistente) {
        itemExistente.qtd++;
    } else {
        carrinho.push({
            id: id,
            nome: nome,
            preco: preco,
            img: img,
            qtd: 1
        });
    }

    atualizarBadge();
    renderizarCarrinho();
    abrirCarrinhoLateral();
}

// Alterar quantidade (+ ou -)
window.alterarQuantidade = function(id, acao) {
    // Como o ID do Firebase é string, a comparação é normal
    const item = carrinho.find(item => item.id == id);
    if (!item) return;

    if (acao === 'aumentar') {
        item.qtd++;
    } else if (acao === 'diminuir') {
        item.qtd--;
        if (item.qtd <= 0) {
            window.removerItem(id);
            return;
        }
    }
    atualizarBadge();
    renderizarCarrinho();
};

window.removerItem = function(id) {
    carrinho = carrinho.filter(item => item.id != id);
    atualizarBadge();
    renderizarCarrinho();
};

// Renderiza (desenha) o carrinho lateral
function renderizarCarrinho() {
    const container = document.querySelector('.carrinho-conteudo');
    const totalEl = document.querySelector('.carrinho-total strong');
    
    if (!container) return;
    
    container.innerHTML = '';
    let totalPreco = 0;

    if (carrinho.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:#666;"><i class="fas fa-shopping-basket" style="font-size:2rem; margin-bottom:10px;"></i><br>Seu carrinho está vazio.</div>';
    } else {
        carrinho.forEach(item => {
            totalPreco += item.preco * item.qtd;
            container.innerHTML += `
                <div class="item-carrinho" style="display: flex; gap: 10px; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                    <div style="width: 50px; height: 50px; border: 1px solid #eee; display: flex; align-items: center; justify-content: center; border-radius: 4px;">
                         <img src="${item.img}" style="max-width:100%; max-height:100%;"> 
                    </div>
                    <div style="flex: 1;">
                        <h4 style="font-size: 0.85rem; margin-bottom: 5px; color: #333; line-height:1.2;">${item.nome}</h4>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #1e3a8a; font-weight: bold;">R$ ${(item.preco * item.qtd).toFixed(2).replace('.',',')}</span>
                            
                            <div style="display: flex; align-items: center; gap: 5px; border: 1px solid #ddd; border-radius: 4px; padding: 0 5px;">
                                <button onclick="alterarQuantidade('${item.id}', 'diminuir')" style="background:none; border:none; cursor:pointer; color: #f59e0b;">-</button>
                                <span style="font-size: 0.8rem;">${item.qtd}</span>
                                <button onclick="alterarQuantidade('${item.id}', 'aumentar')" style="background:none; border:none; cursor:pointer; color: #f59e0b;">+</button>
                            </div>
                        </div>
                    </div>
                    <button onclick="removerItem('${item.id}')" style="background:none; border:none; color: #ff0000; cursor:pointer; align-self: flex-start;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });
    }

    if (totalEl) totalEl.innerText = 'R$ ' + totalPreco.toFixed(2).replace('.', ',');
}

// Funções de Abrir/Fechar Carrinho
window.toggleCarrinho = function(e) {
    if (e) e.preventDefault();
    const carrinhoEl = document.getElementById("carrinhoLateral");
    const overlay = document.getElementById("overlay");
    
    if (carrinhoEl.classList.contains('aberto')) {
        carrinhoEl.classList.remove('aberto');
        overlay.classList.remove('ativo');
    } else {
        renderizarCarrinho(); 
        carrinhoEl.classList.add('aberto');
        overlay.classList.add('ativo');
    }
};

function abrirCarrinhoLateral() {
    const carrinhoEl = document.getElementById("carrinhoLateral");
    const overlay = document.getElementById("overlay");
    if(carrinhoEl && overlay) {
        carrinhoEl.classList.add('aberto');
        overlay.classList.add('ativo');
    }
}


/* ============================================================
   4. INICIALIZAÇÃO GERAL (AO ABRIR O SITE)
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Busca os produtos reais no Firebase
    carregarProdutosDestaque();

    // 2. Atualiza badge do carrinho
    atualizarBadge();
    
    // 3. Verifica Login (Para botão entrar/sair)
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
        } else {
            if(txtAuth) txtAuth.innerText = "Entrar";
            if(btnAuth) {
                btnAuth.href = "login.html";
                btnAuth.onclick = null;
            }
        }
    });

    // 4. Lógica do Menu "Ver Mais Marcas"
    const btnMarcas = document.getElementById("btnMarcas");
    const menuMarcas = document.getElementById("menuMarcas");
    if (btnMarcas && menuMarcas) {
        btnMarcas.addEventListener("click", function() {
            menuMarcas.classList.toggle("ativo");
            if (menuMarcas.classList.contains("ativo")) {
                btnMarcas.innerHTML = '<i class="fas fa-minus-circle"></i> Ver menos';
            } else {
                btnMarcas.innerHTML = '<i class="fas fa-plus-circle"></i> Ver mais marcas';
            }
        });
    }

    // 5. Menu Mobile e Botão Topo
    const btnMenu = document.getElementById('botaoMenuMobile');
    const navMenu = document.getElementById('menuNavegacao');
    if (btnMenu) btnMenu.addEventListener('click', () => navMenu.classList.toggle('ativo'));
    
    const btnTopo = document.getElementById("btnTopo");
    if(btnTopo) {
        window.addEventListener("scroll", function() {
            if (window.scrollY > 300) btnTopo.classList.add("visivel");
            else btnTopo.classList.remove("visivel");
        });
    }

    // Fechar ao clicar fora (Overlay)
    const overlay = document.getElementById("overlay");
    if(overlay) {
        overlay.addEventListener("click", function() {
            document.getElementById("carrinhoLateral").classList.remove("aberto");
            this.classList.remove("ativo");
        });
    }
});