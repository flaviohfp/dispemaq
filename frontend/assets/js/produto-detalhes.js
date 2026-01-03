import { db, doc, getDoc } from './assets/js/firebase-config.js';

// 1. Pegar o ID da URL
function getProdutoId() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    console.log("ID recuperado da URL:", id); // LOG DE DEBUG
    return id;
}

// 2. Buscar e Exibir
async function carregarDetalhes() {
    const id = getProdutoId();
    const loading = document.getElementById('loading');
    const container = document.getElementById('container-produto');

    // Se não tiver ID na URL, para tudo
    if (!id) {
        console.error("Nenhum ID fornecido na URL.");
        loading.innerHTML = "<p>Produto não especificado. Volte para a loja.</p>";
        return;
    }

    try {
        console.log("Buscando no Firebase..."); // LOG DE DEBUG
        const docRef = doc(db, "produtos", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            console.log("Produto encontrado:", docSnap.data()); // LOG DE DEBUG
            const produto = docSnap.data();
            const preco = parseFloat(produto.preco || 0);

            // Preencher HTML (Verifique se esses IDs existem no seu produto.html)
            const imgEl = document.getElementById('img-produto');
            if(imgEl) imgEl.src = produto.urlImagem || 'assets/images/placeholder.jpg';

            const catEl = document.getElementById('cat-produto');
            if(catEl) catEl.innerText = produto.categoria || 'Geral';

            const nomeEl = document.getElementById('nome-produto');
            if(nomeEl) nomeEl.innerText = produto.nome || 'Produto sem nome';

            const codEl = document.getElementById('cod-produto');
            if(codEl) codEl.innerText = produto.codigo || '---';

            const descEl = document.getElementById('desc-produto');
            if(descEl) descEl.innerText = produto.descricao || "Sem descrição disponível.";
            
            // Preço
            const precoEl = document.getElementById('preco-produto');
            if(precoEl) precoEl.innerText = `R$ ${preco.toFixed(2).replace('.', ',')}`;

            // Configurar Botão WhatsApp
            const btnZap = document.getElementById('btn-whatsapp');
            if(btnZap) {
                const msg = `Olá, vi o produto *${produto.nome}* (Cód: ${produto.codigo}) no site e gostaria de saber mais.`;
                btnZap.href = `https://wa.me/554984276503?text=${encodeURIComponent(msg)}`;
            }

            // Configurar Botão Comprar (Função global que está no main.js não funciona aqui pois é module, precisamos recriar ou exportar)
            const btnComprar = document.getElementById('btn-comprar');
            if(btnComprar) {
                btnComprar.onclick = () => adicionarCarrinhoLocal({
                    id: id,
                    nome: produto.nome,
                    preco: preco,
                    img: produto.urlImagem || 'assets/images/placeholder.jpg'
                });
            }

            // Esconde loading e mostra produto
            if(loading) loading.style.display = 'none';
            if(container) container.style.display = 'grid'; // ou flex, dependendo do seu CSS

        } else {
            console.error("Documento não existe no Firebase");
            loading.innerHTML = "<p>Produto não encontrado ou removido.</p>";
        }
    } catch (error) {
        console.error("ERRO FATAL ao carregar detalhes:", error);
        loading.innerHTML = `<p>Erro ao carregar: ${error.message}</p>`;
    }
}

// Função auxiliar de carrinho apenas para esta página
function adicionarCarrinhoLocal(novoItem) {
    let carrinho = JSON.parse(localStorage.getItem('dispemaq_carrinho')) || [];
    const existente = carrinho.find(item => item.id === novoItem.id);
    if (existente) {
        existente.qtd++;
    } else {
        novoItem.qtd = 1;
        carrinho.push(novoItem);
    }
    localStorage.setItem('dispemaq_carrinho', JSON.stringify(carrinho));
    
    // Efeito visual no botão
    const btn = document.getElementById('btn-comprar');
    btn.innerHTML = '<i class="fas fa-check"></i> Adicionado!';
    btn.style.backgroundColor = '#1e3a8a';
    setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Adicionar ao Carrinho';
        btn.style.backgroundColor = '';
        // Opcional: Atualizar o badge do carrinho se recarregar ou se comunicar com main.js
        window.location.reload(); // Recarrega para atualizar o número no header
    }, 1000);
}

// Inicializar
document.addEventListener('DOMContentLoaded', carregarDetalhes);