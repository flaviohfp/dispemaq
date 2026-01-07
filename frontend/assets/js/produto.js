import { db, doc, getDoc, collection, query, limit, getDocs } from './firebase-config.js';

// Pegar ID da URL
const params = new URLSearchParams(window.location.search);
const produtoId = params.get('id');

let produtoAtual = null;

// Elementos
const els = {
    img: document.getElementById('img-principal'),
    nome: document.getElementById('nome-produto'),
    breadNome: document.getElementById('bread-nome'),
    cod: document.getElementById('cod-produto'),
    preco: document.getElementById('preco-produto'),
    desc: document.getElementById('desc-produto'),
    qtdInput: document.getElementById('qtd'),
    btnAdicionar: document.getElementById('btn-adicionar'),
    btnComprar: document.getElementById('btn-comprar-agora')
};

// 1. Controle de Quantidade Visual
window.mudarQtd = function(valor) {
    let atual = parseInt(els.qtdInput.value) || 1;
    let novo = atual + valor;
    if (novo < 1) novo = 1;
    els.qtdInput.value = novo;
};

// 2. Carregar Produto
async function carregarProduto() {
    if (!produtoId) {
        window.location.href = 'loja.html';
        return;
    }

    try {
        const docRef = doc(db, "produtos", produtoId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            produtoAtual = docSnap.data();
            const preco = parseFloat(produtoAtual.preco || 0);

            // Preencher HTML
            els.img.src = produtoAtual.img || produtoAtual.urlImagem || './assets/images/placeholder.jpg';
            els.nome.innerText = produtoAtual.nome;
            els.breadNome.innerText = produtoAtual.nome;
            els.cod.innerText = `Cód: ${produtoAtual.cod || produtoAtual.codigo || '--'}`;
            els.preco.innerText = `R$ ${preco.toFixed(2).replace('.', ',')}`;
            els.desc.innerHTML = produtoAtual.descricao || "Sem descrição.";

            // Configurar Cliques dos Botões
            configurarBotoes(produtoId, produtoAtual, preco);

        } else {
            document.querySelector('.area-info').innerHTML = "<h2>Produto não encontrado.</h2>";
        }
    } catch (error) {
        console.error("Erro:", error);
    }
}

// 3. Configurar Botões
function configurarBotoes(id, prod, preco) {
    
    // A) ADICIONAR AO CARRINHO (Mantém na página)
    els.btnAdicionar.onclick = () => {
        const qtd = parseInt(els.qtdInput.value);
        
        // Se a função window.adicionarAoCarrinho do main.js existir (ela espera um elemento HTML),
        // mas aqui vamos manipular direto o localStorage para ser mais seguro,
        // e depois chamar o toggleCarrinho.
        
        let carrinho = JSON.parse(localStorage.getItem('dispemaq_carrinho')) || [];
        const existente = carrinho.find(i => i.id === id);

        if (existente) {
            existente.qtd += qtd;
        } else {
            carrinho.push({
                id: id,
                nome: prod.nome,
                preco: preco,
                img: prod.img || prod.urlImagem,
                qtd: qtd
            });
        }
        
        localStorage.setItem('dispemaq_carrinho', JSON.stringify(carrinho));
        
        // Atualiza badge e abre carrinho (funções do main.js)
        if(window.toggleCarrinho) {
            window.location.reload(); // Recarrega para atualizar o número no header
        }
    };

    // B) COMPRAR AGORA (Vai pro checkout)
    els.btnComprar.onclick = () => {
        const qtd = parseInt(els.qtdInput.value);
        let carrinho = JSON.parse(localStorage.getItem('dispemaq_carrinho')) || [];
        
        // Adiciona e vai
        const existente = carrinho.find(i => i.id === id);
        if (existente) existente.qtd += qtd;
        else carrinho.push({ id, nome: prod.nome, preco, img: prod.img || prod.urlImagem, qtd });

        localStorage.setItem('dispemaq_carrinho', JSON.stringify(carrinho));
        window.location.href = 'checkout.html'; // Crie esta página depois
    };
}

document.addEventListener('DOMContentLoaded', carregarProduto);