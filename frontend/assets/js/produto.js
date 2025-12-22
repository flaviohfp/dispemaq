/* =========================================
   PRODUTO.JS - DETALHES DO PRODUTO
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    // Verifica se estamos na página de detalhes
    const tituloDetalhe = document.getElementById('nomeProdutoDetalhe');
    if (!tituloDetalhe) return;

    // Pegar ID da URL
    const urlParams = new URLSearchParams(window.location.search);
    const id = parseInt(urlParams.get('id'));

    if (!id) {
        window.location.href = 'loja.html'; // Se não tiver ID, volta pra loja
        return;
    }

    const produto = produtos.find(p => p.id === id); // Busca no array global do main.js

    if (produto) {
        // Preencher HTML
        document.getElementById('imgProdutoDetalhe').src = produto.img;
        document.getElementById('nomeProdutoDetalhe').innerText = produto.nome;
        document.getElementById('codProduto').innerText = `CÓD: ${produto.cod}`;
        document.getElementById('precoProdutoDetalhe').innerText = `R$ ${produto.preco.toFixed(2).replace('.', ',')}`;
        document.getElementById('breadNomeProduto').innerText = produto.nome;
        
        if(produto.desc) {
            document.getElementById('descProdutoDetalhe').innerText = produto.desc;
        }

        // Configurar botão de compra específico desta página
        const btnComprar = document.querySelector('.acoes-compra .botao-primario');
        if(btnComprar) {
            // Remove onclick antigo do HTML para evitar conflitos e adiciona listener
            btnComprar.removeAttribute('onclick'); 
            btnComprar.addEventListener('click', () => {
                adicionarAoCarrinho(produto.id);
            });
        }
        
        // Configurar botão WhatsApp específico
        const btnWhats = document.querySelector('.acoes-compra .botao-outline');
        if(btnWhats) {
            const texto = `Olá! Tenho interesse no produto: ${produto.nome} (Cód: ${produto.cod}).`;
            btnWhats.href = `https://api.whatsapp.com/send/?phone=5549984276503&text=${encodeURIComponent(texto)}`;
        }

    } else {
        alert('Produto não encontrado.');
        window.location.href = 'loja.html';
    }
});