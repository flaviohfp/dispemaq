/* =========================================
   LOJA.JS - LÓGICA DO CATÁLOGO (CORRIGIDO)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    const gradeProdutos = document.getElementById('gradeProdutos');
    
    // Só executa se estiver na página da loja
    if (!gradeProdutos) return;

    // 1. LEITURA DOS PARÂMETROS DA URL (A mágica acontece aqui)
    const urlParams = new URLSearchParams(window.location.search);
    const buscaUrl = urlParams.get('busca');
    const marcaUrl = urlParams.get('marca'); // NOVO: Pega a marca
    const catUrl = urlParams.get('cat');     // Pega a categoria

    // 2. DECIDE O QUE EXIBIR BASEADO NA URL
    if (marcaUrl && catUrl) {
        // CASO 1: Cliente escolheu Marca E Categoria no modal (ex: Volvo + Motor)
        filtrarMarcaECategoria(marcaUrl, catUrl);

    } else if (marcaUrl) {
        // CASO 2: Cliente clicou apenas na Marca (ex: Ver tudo da Caterpillar)
        filtrarPorMarca(marcaUrl);

    } else if (buscaUrl) {
        // CASO 3: Cliente usou a barra de busca
        document.getElementById('campoBusca').value = buscaUrl;
        filtrarPorBusca(buscaUrl);

    } else {
        // CASO 4: Acesso normal ou filtro só por categoria lateral
        renderizarProdutos(catUrl || 'todos');
        
        // Marca o botão da categoria como ativo na lateral
        if(catUrl) {
            atualizarBotoesAtivos(catUrl);
        }
    }

    // 3. EVENTOS DOS BOTÕES LATERAIS DE CATEGORIA
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const categoria = btn.dataset.categoria;
            atualizarBotoesAtivos(categoria);
            
            // Renderiza
            renderizarProdutos(categoria);
            
            // Atualiza a URL sem recarregar a página (UX Profissional)
            const novaUrl = categoria === 'todos' ? 'loja.html' : `loja.html?cat=${categoria}`;
            window.history.pushState({}, '', novaUrl);
            
            // Limpa título personalizado se houver
            atualizarTituloLoja('Todos os Produtos'); 
        });
    });
});

/* ===== FUNÇÕES DE FILTRAGEM ===== */

// Filtro Duplo: Marca + Categoria
function filtrarMarcaECategoria(marca, categoria) {
    const grade = document.getElementById('gradeProdutos');
    
    // Filtra comparando os dois dados
    const filtrados = produtos.filter(p => 
        p.marca.toLowerCase().includes(marca.toLowerCase()) && 
        p.categoria.toLowerCase() === categoria.toLowerCase()
    );

    atualizarTituloLoja(`${categoria.toUpperCase()} para ${marca.toUpperCase()}`);
    exibirResultado(filtrados, grade);
}

// Filtro Simples: Só Marca
function filtrarPorMarca(marca) {
    const grade = document.getElementById('gradeProdutos');
    
    const filtrados = produtos.filter(p => 
        p.marca.toLowerCase().includes(marca.toLowerCase())
    );

    atualizarTituloLoja(`Peças para ${marca.toUpperCase()}`);
    exibirResultado(filtrados, grade);
}

// Filtro de Busca
function filtrarPorBusca(termo) {
    const grade = document.getElementById('gradeProdutos');
    const termoLower = termo.toLowerCase();
    
    const produtosFiltrados = produtos.filter(p => 
        p.nome.toLowerCase().includes(termoLower) || 
        p.cod.toLowerCase().includes(termoLower) ||
        p.marca.toLowerCase().includes(termoLower)
    );

    atualizarTituloLoja(`Resultados para: "${termo}"`);
    exibirResultado(produtosFiltrados, grade);
}

// Renderização Padrão (Categoria ou Todos)
function renderizarProdutos(filtro) {
    const grade = document.getElementById('gradeProdutos');
    
    const produtosFiltrados = filtro === 'todos' 
        ? produtos 
        : produtos.filter(p => p.categoria === filtro);

    exibirResultado(produtosFiltrados, grade);
}

/* ===== FUNÇÕES VISUAIS E AUXILIARES ===== */

function exibirResultado(lista, container) {
    container.innerHTML = "";
    
    if (lista.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-search" style="font-size: 3rem; color: #ddd; margin-bottom: 20px;"></i>
                <h3 style="color: #666;">Nenhum produto encontrado.</h3>
                <p style="color: #999;">Tente usar termos diferentes ou limpar os filtros.</p>
                <a href="loja.html" style="display:inline-block; margin-top:20px; color:var(--azul-escuro); text-decoration:underline;">Ver todos os produtos</a>
            </div>
        `;
        return;
    }

    lista.forEach(p => {
        container.innerHTML += criarCardProduto(p);
    });
}

function criarCardProduto(p) {
    // Formata preço para Real Brasileiro
    const precoFormatado = p.preco.toFixed(2).replace('.', ',');
    
    return `
    <div class="produto-card">
        <a href="produto.html?id=${p.id}" style="text-decoration:none; color:inherit;">
            <div class="produto-imagem">
                <img src="${p.img}" alt="${p.nome}" loading="lazy">
            </div>
            <div class="produto-info">
                <span class="produto-cod">Cód: ${p.cod}</span>
                <h3>${p.nome}</h3>
                <div class="produto-marca-tag">${p.marca.toUpperCase()}</div>
                <div class="produto-preco">R$ ${precoFormatado}</div>
            </div>
        </a>
        <button class="btn-comprar-card" onclick="adicionarAoCarrinho(${p.id})">
            <i class="fas fa-shopping-cart"></i> Comprar
        </button>
    </div>
    `;
}

// Atualiza o título H2 da página (se existir o ID 'tituloLoja' no HTML)
function atualizarTituloLoja(texto) {
    const titulo = document.getElementById('tituloLoja');
    if (titulo) titulo.innerText = texto;
}

// Gerencia a classe 'ativo' nos botões laterais
function atualizarBotoesAtivos(categoriaAlvo) {
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('ativo'));
    
    // Tenta achar o botão correspondente (pode ser data-cat ou data-categoria)
    const btnAtivo = document.querySelector(`.filtro-btn[data-categoria="${categoriaAlvo}"]`) || 
                     document.querySelector(`.filtro-btn[data-cat="${categoriaAlvo}"]`);
                     
    if(btnAtivo) btnAtivo.classList.add('ativo');
}