import { db, doc, getDoc } from './firebase-config.js';

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
            
            // Renderiza descrição ou mensagem padrão
            els.desc.innerHTML = produtoAtual.descricao || "Sem descrição disponível.";

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
    const imagemProd = prod.img || prod.urlImagem || './assets/images/placeholder.jpg';

    // A) ADICIONAR AO CARRINHO (Sem reload, usando o main.js)
    els.btnAdicionar.onclick = () => {
        const qtdSelecionada = parseInt(els.qtdInput.value) || 1;

        // Se o main.js carregou corretamente, usamos a função dele
        if (typeof window.adicionarAoCarrinho === 'function') {
            
            // Criamos um elemento "falso" para simular o clique que o main.js espera
            // Isso evita duplicar código e garante que o menu lateral abra corretamente
            const elementoSimulado = {
                getAttribute: (attr) => {
                    if (attr === 'data-id') return id;
                    if (attr === 'data-nome') return prod.nome;
                    if (attr === 'data-preco') return preco;
                    if (attr === 'data-img') return imagemProd;
                    return null;
                }
            };

            // 1. Adiciona o primeiro item e abre o carrinho
            window.adicionarAoCarrinho(elementoSimulado);

            // 2. Se o cliente escolheu mais de 1 (ex: 3), adicionamos o restante
            if (qtdSelecionada > 1 && typeof window.alterarQuantidade === 'function') {
                // Loop para adicionar a quantidade extra
                for (let i = 0; i < qtdSelecionada - 1; i++) {
                    window.alterarQuantidade(id, 'aumentar');
                }
            }

        } else {
            // Fallback (caso main.js falhe): Método manual com reload
            console.warn("Função adicionarAoCarrinho não encontrada. Usando método manual.");
            adicionarManual(id, prod, preco, qtdSelecionada, false);
        }
    };

    // B) COMPRAR AGORA (Salva e redireciona direto)
    els.btnComprar.onclick = () => {
        const qtdSelecionada = parseInt(els.qtdInput.value) || 1;
        
        // Aqui usamos o método manual para não abrir o carrinho lateral antes de mudar de página
        adicionarManual(id, prod, preco, qtdSelecionada, true);
    };
}

// Função auxiliar para manipular LocalStorage diretamente (usada no Comprar Agora)
function adicionarManual(id, prod, preco, qtd, redirecionar) {
    let carrinho = JSON.parse(localStorage.getItem('dispemaq_carrinho')) || [];
    const imagemProd = prod.img || prod.urlImagem || './assets/images/placeholder.jpg';

    // Procura se já existe (comparando ID como string para segurança)
    const existente = carrinho.find(i => String(i.id) === String(id));

    if (existente) {
        existente.qtd += qtd;
    } else {
        carrinho.push({
            id: id,
            nome: prod.nome,
            preco: preco,
            img: imagemProd,
            qtd: qtd
        });
    }

    localStorage.setItem('dispemaq_carrinho', JSON.stringify(carrinho));

    if (redirecionar) {
        window.location.href = 'checkout.html';
    } else {
        window.location.reload(); // Só recarrega se for o fallback
    }
}

document.addEventListener('DOMContentLoaded', carregarProduto);