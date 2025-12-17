/* ===== SISTEMA DE MARCAS E FILTROS ===== */
let marcaSelecionada = null;
let categoriaSelecionada = null;

// Controle do dropdown +MARCAS
const btnMarcas = document.getElementById("btnMarcas");
const menuMarcas = document.getElementById("menuMarcas");

if (btnMarcas && menuMarcas) {
    btnMarcas.addEventListener("click", (e) => {
        e.stopPropagation();
        const aberto = menuMarcas.style.display === "block";
        menuMarcas.style.display = aberto ? "none" : "block";
        btnMarcas.querySelector(".setinha").textContent = aberto ? "▼" : "▲";
    });

    // Fecha o menu ao clicar fora
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".dropdown-marcas")) {
            menuMarcas.style.display = "none";
            if (btnMarcas.querySelector(".setinha")) {
                btnMarcas.querySelector(".setinha").textContent = "▼";
            }
        }
    });

    // Adiciona funcionalidade aos itens do dropdown
    document.querySelectorAll('.marca-item').forEach(item => {
        item.addEventListener('click', function() {
            const marca = this.textContent.trim().toLowerCase().replace(/\s+/g, '-');
            marcaSelecionada = marca;
            
            // Atualiza o título do menu
            document.getElementById('nomeMarcaSelecionada').innerHTML = `
                <i class="fas fa-filter"></i> ${this.textContent.trim()} - Selecione a categoria
            `;
            
            // Fecha o dropdown
            menuMarcas.style.display = "none";
            btnMarcas.querySelector(".setinha").textContent = "▼";
            
            // Abre o menu de categorias
            document.getElementById('menuCategoriasMarca').classList.add('aberto');
            document.getElementById('overlayCategorias').classList.add('ativo');
            document.body.style.overflow = 'hidden';
        });
    });
}

// Abrir menu de categorias ao clicar em uma marca principal
document.querySelectorAll('.item-marca:not(.dropdown-marcas *)').forEach(botao => {
    botao.addEventListener('click', function() {
        const marca = this.dataset.marca;
        marcaSelecionada = marca;
        
        // Remove ativa de todos e adiciona no clicado
        document.querySelectorAll('.item-marca').forEach(b => b.classList.remove('ativa'));
        this.classList.add('ativa');
        
        // Atualiza o título do menu
        const nomeMarca = this.textContent.trim();
        document.getElementById('nomeMarcaSelecionada').innerHTML = `
            <i class="fas fa-filter"></i> ${nomeMarca} - Selecione a categoria
        `;
        
        // Abre o menu de categorias
        document.getElementById('menuCategoriasMarca').classList.add('aberto');
        document.getElementById('overlayCategorias').classList.add('ativo');
        document.body.style.overflow = 'hidden';
    });
});

// Fechar menu de categorias
function fecharMenuCategorias() {
    document.getElementById('menuCategoriasMarca').classList.remove('aberto');
    document.getElementById('overlayCategorias').classList.remove('ativo');
    document.body.style.overflow = '';
}

document.getElementById('fecharMenuCategorias').addEventListener('click', fecharMenuCategorias);
document.getElementById('overlayCategorias').addEventListener('click', fecharMenuCategorias);

// Filtrar por marca e categoria
function filtrarPorMarcaCategoria(categoria) {
    categoriaSelecionada = categoria;
    
    // Fecha o menu
    fecharMenuCategorias();
    
    // Remove marcas ativas
    document.querySelectorAll('.item-marca').forEach(b => b.classList.remove('ativa'));
    
    // Rola até a loja
    document.querySelector('#loja').scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Aguarda um pouco e filtra os produtos
    setTimeout(() => {
        filtrarProdutosPorMarcaECategoria(marcaSelecionada, categoria);
        mostrarNotificacao(`Exibindo ${categoria} da marca ${marcaSelecionada || 'todas'}`, 'sucesso');
    }, 600);
}

// Função para filtrar produtos por marca e categoria
function filtrarProdutosPorMarcaECategoria(marca, categoria) {
    const grade = document.getElementById('gradeProdutos');
    
    // Mapear categorias do menu para categorias dos produtos
    const mapaCategorias = {
        'motor': ['motores', 'filtros'],
        'combustivel': ['motores', 'filtros'],
        'transmissao': ['transmissao'],
        'direcao': ['freios'],
        'eletrico': ['eletrica'],
        'hidraulico': ['hidraulica'],
        'chassi': ['transmissao'],
        'cabine': ['eletrica'],
        'ar-condicionado': ['filtros'],
        'fps': ['hidraulica'],
        'rodante': ['transmissao']
    };
    
    const categoriasPermitidas = mapaCategorias[categoria] || [];
    
    const produtosFiltrados = produtos.filter(p => 
        categoriasPermitidas.includes(p.categoria)
    );
    
    if (produtosFiltrados.length === 0) {
        grade.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-inbox" style="font-size: 4rem; color: var(--cinza-medio); opacity: 0.3; margin-bottom: 20px; display: block;"></i>
                <h3>Nenhum produto encontrado</h3>
                <p style="color: var(--cinza-medio); margin: 10px 0 20px;">Não encontramos produtos nesta categoria para a marca selecionada.</p>
                <button onclick="renderizarProdutos('todos')" class="botao botao-primario">Ver todos os produtos</button>
            </div>
        `;
    } else {
        grade.innerHTML = produtosFiltrados.map(produto => {
            const precoComDesconto = produto.preco * 0.9;
            
            return `
                <div class="card-produto">
                    <div class="produto-imagem">
                        <i class="fas fa-cog"></i>
                        ${produto.desconto > 0 ? `<span class="badge-desconto">-${produto.desconto}%</span>` : ''}
                        ${produto.estoque < 10 ? '<span class="badge-estoque-baixo">Últimas unidades</span>' : ''}
                    </div>
                    <div class="produto-info">
                        <div class="produto-categoria">${produto.categoria}</div>
                        <h3 class="produto-nome">${produto.nome}</h3>
                        <p class="produto-codigo">Cód: ${produto.codigo}</p>
                        <div class="produto-precos">
                            ${produto.precoAntigo ? `<span class="preco-antigo">De R$ ${produto.precoAntigo.toFixed(2)}</span>` : ''}
                            <span class="preco-atual">R$ ${produto.preco.toFixed(2)}</span>
                            <div class="preco-pix">
                                <i class="fab fa-pix"></i>
                                R$ ${precoComDesconto.toFixed(2)} no PIX
                            </div>
                        </div>
                        <div class="produto-acoes">
                            <button class="botao-adicionar" onclick="adicionarAoCarrinho(${produto.id})">
                                <i class="fas fa-cart-plus"></i> Adicionar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Atualiza os filtros visualmente
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('ativo'));
}

/* ===== BANCO DE DADOS DE PRODUTOS ===== */
const produtos = [
    // Filtros
    { id: 1, nome: 'Filtro de Óleo Motor Diesel', categoria: 'filtros', codigo: 'FO-2840', preco: 89.90, precoAntigo: 119.90, estoque: 45, desconto: 25 },
    { id: 2, nome: 'Filtro de Ar Primário', categoria: 'filtros', codigo: 'FA-1523', preco: 156.00, precoAntigo: null, estoque: 32, desconto: 0 },
    { id: 3, nome: 'Filtro de Combustível Separador', categoria: 'filtros', codigo: 'FC-3341', preco: 198.50, precoAntigo: 245.00, estoque: 28, desconto: 19 },
    { id: 4, nome: 'Filtro Hidráulico de Retorno', categoria: 'filtros', codigo: 'FH-5612', preco: 213.00, precoAntigo: null, estoque: 5, desconto: 0 },
    
    // Motores
    { id: 5, nome: 'Jogo de Anéis Pistão Motor MWM', categoria: 'motores', codigo: 'AN-7842', preco: 445.00, precoAntigo: 520.00, estoque: 18, desconto: 14 },
    { id: 6, nome: 'Bronzina de Biela 0.25mm', categoria: 'motores', codigo: 'BB-2134', preco: 234.90, precoAntigo: null, estoque: 41, desconto: 0 },
    { id: 7, nome: 'Kit de Reparo Bomba Injetora', categoria: 'motores', codigo: 'BI-9876', preco: 678.00, precoAntigo: 780.00, estoque: 12, desconto: 13 },
    { id: 8, nome: 'Turbo Compressor Garrett', categoria: 'motores', codigo: 'TC-4421', preco: 2890.00, precoAntigo: 3200.00, estoque: 8, desconto: 10 },
    
    // Hidráulica
    { id: 9, nome: 'Bomba Hidráulica Dupla', categoria: 'hidraulica', codigo: 'BH-3345', preco: 1567.00, precoAntigo: 1890.00, estoque: 15, desconto: 17 },
    { id: 10, nome: 'Cilindro Hidráulico 80x40x800', categoria: 'hidraulica', codigo: 'CH-7712', preco: 892.50, precoAntigo: null, estoque: 22, desconto: 0 },
    { id: 11, nome: 'Válvula Direcional 4/3 Vias', categoria: 'hidraulica', codigo: 'VD-5523', preco: 456.00, precoAntigo: 540.00, estoque: 3, desconto: 16 },
    { id: 12, nome: 'Mangueira Hidráulica SAE100 R2', categoria: 'hidraulica', codigo: 'MH-8891', preco: 45.00, precoAntigo: null, estoque: 150, desconto: 0 },
    
    // Freios
    { id: 13, nome: 'Cilindro Mestre de Freio', categoria: 'freios', codigo: 'CF-1123', preco: 387.00, precoAntigo: 450.00, estoque: 19, desconto: 14 },
    { id: 14, nome: 'Lona de Freio Traseira', categoria: 'freios', codigo: 'LF-6634', preco: 234.50, precoAntigo: null, estoque: 56, desconto: 0 },
    { id: 15, nome: 'Disco de Freio Ventilado', categoria: 'freios', codigo: 'DF-4412', preco: 567.00, precoAntigo: 620.00, estoque: 24, desconto: 9 },
    { id: 16, nome: 'Kit Reparo Cilindro Roda', categoria: 'freios', codigo: 'KR-9981', preco: 89.90, precoAntigo: null, estoque: 73, desconto: 0 },
    
    // Elétrica
    { id: 17, nome: 'Alternador 24V 90A', categoria: 'eletrica', codigo: 'AL-3356', preco: 789.00, precoAntigo: 920.00, estoque: 14, desconto: 14 },
    { id: 18, nome: 'Motor de Partida 24V', categoria: 'eletrica', codigo: 'MP-7723', preco: 1234.00, precoAntigo: 1450.00, estoque: 9, desconto: 15 },
    { id: 19, nome: 'Sensor de Temperatura Motor', categoria: 'eletrica', codigo: 'ST-5567', preco: 145.00, precoAntigo: null, estoque: 62, desconto: 0 },
    { id: 20, nome: 'Chicote Elétrico Principal', categoria: 'eletrica', codigo: 'CE-8834', preco: 567.50, precoAntigo: 680.00, estoque: 4, desconto: 17 },
    
    // Transmissão
    { id: 21, nome: 'Embreagem Completa 14"', categoria: 'transmissao', codigo: 'EM-2245', preco: 1456.00, precoAntigo: 1680.00, estoque: 11, desconto: 13 },
    { id: 22, nome: 'Rolamento Piloto Transmissão', categoria: 'transmissao', codigo: 'RP-6678', preco: 178.00, precoAntigo: null, estoque: 38, desconto: 0 },
    { id: 23, nome: 'Eixo Cardan Completo', categoria: 'transmissao', codigo: 'EC-9912', preco: 2345.00, precoAntigo: 2700.00, estoque: 6, desconto: 13 },
    { id: 24, nome: 'Sincronizador 3ª/4ª Marcha', categoria: 'transmissao', codigo: 'SI-4456', preco: 567.00, precoAntigo: 650.00, estoque: 21, desconto: 13 },
];

/* ===== SISTEMA DE CARRINHO ===== */
let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];

// Função para salvar carrinho
function salvarCarrinho() {
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    atualizarBadgeCarrinho();
    renderizarCarrinho();
}

// Atualizar badge do carrinho
function atualizarBadgeCarrinho() {
    const badge = document.getElementById('badgeCarrinho');
    const totalItens = carrinho.reduce((total, item) => total + item.quantidade, 0);
    badge.textContent = totalItens;
    badge.style.display = totalItens > 0 ? 'flex' : 'none';
}

// Adicionar ao carrinho
function adicionarAoCarrinho(idProduto) {
    const produto = produtos.find(p => p.id === idProduto);
    if (!produto) return;

    const itemExistente = carrinho.find(item => item.id === idProduto);
    
    if (itemExistente) {
        itemExistente.quantidade++;
    } else {
        carrinho.push({
            id: produto.id,
            nome: produto.nome,
            preco: produto.preco,
            quantidade: 1
        });
    }

    salvarCarrinho();
    mostrarNotificacao('Produto adicionado ao carrinho!');
    abrirCarrinhoLateral();
}

// Remover do carrinho
function removerDoCarrinho(idProduto) {
    carrinho = carrinho.filter(item => item.id !== idProduto);
    salvarCarrinho();
    mostrarNotificacao('Produto removido do carrinho');
}

// Alterar quantidade
function alterarQuantidade(idProduto, operacao) {
    const item = carrinho.find(i => i.id === idProduto);
    if (!item) return;

    if (operacao === 'aumentar') {
        item.quantidade++;
    } else if (operacao === 'diminuir') {
        if (item.quantidade > 1) {
            item.quantidade--;
        } else {
            removerDoCarrinho(idProduto);
            return;
        }
    }

    salvarCarrinho();
}

// Renderizar carrinho
function renderizarCarrinho() {
    const conteudo = document.getElementById('carrinhoConteudo');
    const totalElement = document.getElementById('carrinhoTotal');

    if (carrinho.length === 0) {
        conteudo.innerHTML = `
            <div class="carrinho-vazio">
                <i class="fas fa-shopping-cart"></i>
                <p>Seu carrinho está vazio</p>
            </div>
        `;
        totalElement.textContent = 'R$ 0,00';
        return;
    }

    const total = carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);

    conteudo.innerHTML = carrinho.map(item => `
        <div class="item-carrinho">
            <div class="item-carrinho-imagem">
                <i class="fas fa-cog"></i>
            </div>
            <div class="item-carrinho-info">
                <div class="item-carrinho-nome">${item.nome}</div>
                <div class="item-carrinho-preco">R$ ${item.preco.toFixed(2)}</div>
                <div class="item-carrinho-quantidade">
                    <button class="btn-quantidade" onclick="alterarQuantidade(${item.id}, 'diminuir')">-</button>
                    <span>${item.quantidade}</span>
                    <button class="btn-quantidade" onclick="alterarQuantidade(${item.id}, 'aumentar')">+</button>
                    <button class="btn-remover" onclick="removerDoCarrinho(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    totalElement.textContent = `R$ ${total.toFixed(2)}`;
}

// Abrir/Fechar carrinho lateral
function abrirCarrinhoLateral() {
    document.getElementById('carrinhoLateral').classList.add('aberto');
    document.getElementById('carrinhoOverlay').classList.add('ativo');
    document.body.style.overflow = 'hidden';
}

function fecharCarrinhoLateral() {
    document.getElementById('carrinhoLateral').classList.remove('aberto');
    document.getElementById('carrinhoOverlay').classList.remove('ativo');
    document.body.style.overflow = '';
}

// Event listeners do carrinho
document.getElementById('abrirCarrinho').addEventListener('click', abrirCarrinhoLateral);
document.getElementById('fecharCarrinho').addEventListener('click', fecharCarrinhoLateral);
document.getElementById('carrinhoOverlay').addEventListener('click', fecharCarrinhoLateral);

// Finalizar compra
document.getElementById('finalizarCompra').addEventListener('click', () => {
    if (carrinho.length === 0) {
        mostrarNotificacao('Seu carrinho está vazio!', 'erro');
        return;
    }

    const mensagem = `*Novo Pedido - Dispemaq*\n\n` +
        carrinho.map(item => 
            `• ${item.nome}\n  Qtd: ${item.quantidade} | R$ ${(item.preco * item.quantidade).toFixed(2)}`
        ).join('\n\n') +
        `\n\n*Total: R$ ${carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0).toFixed(2)}*`;

    const url = `https://api.whatsapp.com/send/?phone=5549984276503&text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
});

/* ===== RENDERIZAR PRODUTOS ===== */
let categoriaAtiva = 'todos';

function renderizarProdutos(categoria = 'todos') {
    const grade = document.getElementById('gradeProdutos');
    const produtosFiltrados = categoria === 'todos' 
        ? produtos 
        : produtos.filter(p => p.categoria === categoria);

    grade.innerHTML = produtosFiltrados.map(produto => {
        const precoComDesconto = produto.preco * 0.9; // 10% desc no PIX
        
        return `
            <div class="card-produto">
                <div class="produto-imagem">
                    <i class="fas fa-cog"></i>
                    ${produto.desconto > 0 ? `<span class="badge-desconto">-${produto.desconto}%</span>` : ''}
                    ${produto.estoque < 10 ? '<span class="badge-estoque-baixo">Últimas unidades</span>' : ''}
                </div>
                <div class="produto-info">
                    <div class="produto-categoria">${produto.categoria}</div>
                    <h3 class="produto-nome">${produto.nome}</h3>
                    <p class="produto-codigo">Cód: ${produto.codigo}</p>
                    <div class="produto-precos">
                        ${produto.precoAntigo ? `<span class="preco-antigo">De R$ ${produto.precoAntigo.toFixed(2)}</span>` : ''}
                        <span class="preco-atual">R$ ${produto.preco.toFixed(2)}</span>
                        <div class="preco-pix">
                            <i class="fab fa-pix"></i>
                            R$ ${precoComDesconto.toFixed(2)} no PIX
                        </div>
                    </div>
                    <div class="produto-acoes">
                        <button class="botao-adicionar" onclick="adicionarAoCarrinho(${produto.id})">
                            <i class="fas fa-cart-plus"></i> Adicionar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Filtros de categoria
document.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('ativo'));
        btn.classList.add('ativo');
        const categoria = btn.dataset.categoria;
        renderizarProdutos(categoria);
    });
});

// Função para filtrar por categoria (usada nos cards de categoria)
function filtrarPorCategoria(categoria) {
    document.querySelector(`[data-categoria="${categoria}"]`).click();
    document.querySelector('#loja').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ===== BUSCA DE PRODUTOS ===== */
const campoBusca = document.getElementById('campoBusca');
const botaoBuscar = document.getElementById('botaoBuscar');

function realizarBusca() {
    const termo = campoBusca.value.trim().toLowerCase();
    if (!termo) return;

    const grade = document.getElementById('gradeProdutos');
    const resultados = produtos.filter(p => 
        p.nome.toLowerCase().includes(termo) ||
        p.codigo.toLowerCase().includes(termo) ||
        p.categoria.toLowerCase().includes(termo)
    );

    if (resultados.length === 0) {
        grade.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-search" style="font-size: 4rem; color: var(--cinza-medio); opacity: 0.3; margin-bottom: 20px; display: block;"></i>
                <h3>Nenhum produto encontrado</h3>
                <p style="color: var(--cinza-medio); margin-top: 10px;">Tente buscar por outro termo ou entre em contato conosco</p>
            </div>
        `;
    } else {
        renderizarProdutos('todos');
        document.querySelector('#loja').scrollIntoView({ behavior: 'smooth' });
    }
}

botaoBuscar.addEventListener('click', realizarBusca);
campoBusca.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') realizarBusca();
});

/* ===== NOTIFICAÇÕES ===== */
function mostrarNotificacao(mensagem, tipo = 'sucesso') {
    const notificacao = document.createElement('div');
    notificacao.className = `notificacao notificacao-${tipo}`;
    notificacao.innerHTML = `
        <i class="fas fa-${tipo === 'sucesso' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${mensagem}</span>
    `;
    
    // Adicionar estilos
    notificacao.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${tipo === 'sucesso' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(notificacao);

    setTimeout(() => {
        notificacao.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notificacao.remove(), 300);
    }, 3000);
}

// Adicionar animações ao CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

/* ===== MENU MOBILE ===== */
const botaoMenu = document.getElementById('botaoMenuMobile');
const menuNav = document.getElementById('menuNavegacao');

botaoMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    menuNav.classList.toggle('ativo');
    botaoMenu.classList.toggle('ativo');
});

document.querySelectorAll('.lista-menu a').forEach(link => {
    link.addEventListener('click', () => {
        menuNav.classList.remove('ativo');
        botaoMenu.classList.remove('ativo');
    });
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.cabecalho-principal')) {
        menuNav.classList.remove('ativo');
        botaoMenu.classList.remove('ativo');
    }
});

/* ===== ROLAGEM SUAVE ===== */
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href.length > 1) {
            e.preventDefault();
            const elemento = document.querySelector(href);
            if (elemento) {
                const posicao = elemento.offsetTop - 80;
                window.scrollTo({
                    top: posicao,
                    behavior: 'smooth'
                });
            }
        }
    });
});

/* ===== BOTÃO VOLTAR AO TOPO ===== */
const botaoTopo = document.getElementById('botaoTopo');

window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        botaoTopo.classList.add('visivel');
    } else {
        botaoTopo.classList.remove('visivel');
    }
});

botaoTopo.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ===== MODALS ===== */
function abrirModal(idModal) {
    const modal = document.getElementById(idModal);
    if (modal) {
        modal.classList.add('ativo');
        document.body.style.overflow = 'hidden';
    }
}

function fecharModal(idModal) {
    const modal = document.getElementById(idModal);
    if (modal) {
        modal.classList.remove('ativo');
        document.body.style.overflow = '';
    }
}

document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('ativo');
            document.body.style.overflow = '';
        }
    });
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.ativo').forEach(modal => {
            modal.classList.remove('ativo');
            document.body.style.overflow = '';
        });
        fecharCarrinhoLateral();
    }
});

/* ===== ANIMAÇÕES ===== */
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
});

const elementosAnimados = document.querySelectorAll(
    '.card-categoria, .item-beneficio, .card-flutuante'
);

elementosAnimados.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

/* ===== HEADER FIXO COM EFEITO ===== */
let ultimaRolagem = 0;
const cabecalho = document.querySelector('.cabecalho-principal');

window.addEventListener('scroll', () => {
    const rolagemAtual = window.pageYOffset;
    
    if (rolagemAtual > ultimaRolagem && rolagemAtual > 100) {
        cabecalho.style.transform = 'translateY(-100%)';
    } else {
        cabecalho.style.transform = 'translateY(0)';
    }
    
    ultimaRolagem = rolagemAtual;
});

/* ===== INICIALIZAÇÃO ===== */
document.addEventListener('DOMContentLoaded', () => {
    renderizarProdutos();
    atualizarBadgeCarrinho();
    renderizarCarrinho();
    
    console.log('%c🛒 Dispemaq - Loja Online', 'color: #1e3a8a; font-size: 20px; font-weight: bold;');
    console.log('%c✨ Sistema de e-commerce completo', 'color: #f59e0b; font-size: 14px;');
    console.log('%c📞 Contato: +55 49 98427-6503', 'color: #10b981; font-size: 14px;');
});

window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    setTimeout(() => document.body.style.opacity = '1', 100);
});