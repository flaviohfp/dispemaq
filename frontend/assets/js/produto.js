document.addEventListener('DOMContentLoaded', () => {
    // 1. Pega os produtos do LocalStorage (Criados no Admin)
    const storedProducts = JSON.parse(localStorage.getItem('meusProdutos')) || [];

    // 2. Descobre qual produto abrir através da URL (ex: produto.html?id=123)
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    // Elementos da tela
    const contentDiv = document.getElementById('product-content');
    const errorDiv = document.getElementById('error-message');

    // 3. Validação: Temos produtos e temos um ID na URL?
    if (!productId || storedProducts.length === 0) {
        // Se entrou direto na página sem clicar em nada, mostra o primeiro produto como "exemplo"
        // Ou mostra erro se a lista estiver totalmente vazia
        if (storedProducts.length > 0) {
            renderProduct(storedProducts[0]); // Carrega o primeiro da lista
            renderRelated(storedProducts, storedProducts[0].id);
        } else {
            contentDiv.style.display = 'none';
            errorDiv.style.display = 'block';
            errorDiv.innerHTML = 'Nenhum produto cadastrado no sistema. <br><br> <a href="admin.html">Ir para o Painel Admin</a>';
        }
        return;
    }

    // 4. Busca o produto específico pelo ID
    // O ID no localStorage pode ser string ou number, comparamos como string pra garantir
    const product = storedProducts.find(p => p.id == productId);

    if (product) {
        renderProduct(product);
        renderRelated(storedProducts, product.id);
    } else {
        contentDiv.style.display = 'none';
        errorDiv.style.display = 'block';
        errorDiv.innerText = 'Produto não encontrado no estoque.';
    }
});

// --- FUNÇÕES DE RENDERIZAÇÃO ---

function renderProduct(product) {
    // Formata Preço
    const priceNum = parseFloat(product.preco);
    const priceFormatted = priceNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const parcelaVal = (priceNum / 12).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Injeta nos campos HTML
    document.getElementById('bread-name').innerText = product.nome;
    document.getElementById('prod-id').innerText = product.id;
    document.getElementById('prod-name').innerText = product.nome;
    document.getElementById('prod-desc').innerText = product.descricao || "Produto original com garantia de fábrica. Compatível com diversos modelos.";
    
    // Imagem (Usa placeholder se não tiver link)
    const imgUrl = product.imagem && product.imagem.length > 5 ? product.imagem : 'https://via.placeholder.com/400?text=Sem+Foto';
    document.getElementById('prod-img').src = imgUrl;

    document.getElementById('prod-price').innerText = priceFormatted;
    document.getElementById('prod-installments').innerText = `em até 12x de ${parcelaVal}`;

    // Guarda o ID atual num atributo global para o botão comprar usar
    document.getElementById('product-content').setAttribute('data-current-id', product.id);
}

function renderRelated(allProducts, currentId) {
    const grid = document.getElementById('related-grid');
    const noRelatedMsg = document.getElementById('no-related');
    
    grid.innerHTML = "";

    // Filtra: todos menos o atual
    const related = allProducts.filter(p => p.id != currentId);

    if (related.length === 0) {
        noRelatedMsg.style.display = 'block';
        return;
    }

    // Pega no máximo 4 produtos para mostrar
    related.slice(0, 4).forEach(p => {
        const priceNum = parseFloat(p.preco);
        const card = document.createElement('div');
        card.className = 'card-item';
        
        // Ao clicar no relacionado, recarrega a página com o novo ID
        card.onclick = () => {
            window.location.href = `produto.html?id=${p.id}`;
        };

        const imgUrl = p.imagem && p.imagem.length > 5 ? p.imagem : 'https://via.placeholder.com/200?text=AutoParts';

        card.innerHTML = `
            <img src="${imgUrl}" class="card-img" alt="${p.nome}">
            <div class="card-title">${p.nome}</div>
            <div class="card-price">R$ ${priceNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        `;

        grid.appendChild(card);
    });
}

// --- FUNÇÕES DE INTERAÇÃO ---

function updateQty(change) {
    const input = document.getElementById('qty-input');
    let val = parseInt(input.value);
    val += change;
    if (val < 1) val = 1;
    input.value = val;
}

function addToCart() {
    const currentId = document.getElementById('product-content').getAttribute('data-current-id');
    const qty = document.getElementById('qty-input').value;
    const prodName = document.getElementById('prod-name').innerText;
    
    // Efeito Visual
    const btn = document.querySelector('.btn-add');
    const originalText = btn.innerHTML;
    
    btn.style.backgroundColor = '#2e7d32'; // Verde sucesso
    btn.innerHTML = '<span class="material-icons">check</span> ADICIONADO!';
    
    // Atualiza badge do carrinho
    const badge = document.getElementById('cart-badge');
    badge.innerText = parseInt(badge.innerText) + parseInt(qty);

    alert(`Sucesso!\n\nVocê adicionou ${qty}x "${prodName}" ao seu carrinho.`);

    // Volta botão ao normal após 2 segundos
    setTimeout(() => {
        btn.style.backgroundColor = '';
        btn.innerHTML = originalText;
    }, 2000);
}