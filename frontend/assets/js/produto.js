import { db, doc, getDoc } from './firebase-config.js';

// Pegar ID da URL
const params = new URLSearchParams(window.location.search);
const produtoId = params.get('id');

let produtoAtual = null;

// Elementos (Mapeamento do HTML)
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

// 1. Controle de Quantidade Visual (Botões + e -)
window.mudarQtd = function(valor) {
    if (!els.qtdInput) return;
    let atual = parseInt(els.qtdInput.value) || 1;
    let novo = atual + valor;
    if (novo < 1) novo = 1;
    els.qtdInput.value = novo;
};

// 2. Carregar Produto do Firebase
async function carregarProduto() {
    // Se não tiver ID na URL, manda de volta pra home
    if (!produtoId) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const docRef = doc(db, "produtos", produtoId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            produtoAtual = docSnap.data();
            
            // --- TRATAMENTO CORRETO DO PREÇO ---
            let precoDisplay = "Consulte";
            let precoNumerico = 0;

            if (produtoAtual.preco) {
                let valor = produtoAtual.preco;
                
                // Se for string (ex: "1.250,00" ou "R$ 150,50"), limpamos para virar número real
                if(typeof valor === 'string') {
                    valor = parseFloat(valor.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
                }
                
                if (!isNaN(valor) && valor > 0) {
                    precoNumerico = valor;
                    precoDisplay = precoNumerico.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                } else {
                    precoDisplay = produtoAtual.preco; // Mantém texto (ex: "Sob Consulta")
                }
            }

            // --- PREENCHER HTML COM TRAVAS DE SEGURANÇA ---
            // As travas (if) evitam que o código quebre caso algum ID do HTML seja alterado futuramente
            const imagemProd = produtoAtual.imagem || produtoAtual.img || produtoAtual.urlImagem || './assets/images/sem-foto.png';
            
            if (els.img) els.img.src = imagemProd;
            if (els.nome) els.nome.innerText = produtoAtual.nome || 'Produto sem nome';
            if (els.breadNome) els.breadNome.innerText = produtoAtual.nome || 'Detalhes';
            if (els.cod) els.cod.innerText = `Cód: ${produtoAtual.codigo || produtoAtual.cod || '--'}`;
            if (els.preco) els.preco.innerText = precoDisplay;
            if (els.desc) els.desc.innerHTML = produtoAtual.descricao || "Sem descrição disponível.";

            // Configurar Cliques dos Botões passando o preço já tratado
            configurarBotoes(produtoId, produtoAtual, precoNumerico, imagemProd);

        } else {
            const areaInfo = document.querySelector('.area-info');
            if(areaInfo) areaInfo.innerHTML = "<h2>Produto não encontrado ou removido.</h2>";
        }
    } catch (error) {
        console.error("Erro ao carregar o produto:", error);
    }
}

// 3. Configurar Botões de Compra
function configurarBotoes(id, prod, precoNumerico, imagemProd) {
    
    // A) ADICIONAR AO CARRINHO (Usando a função do main.js para abrir a gaveta)
    if (els.btnAdicionar) {
        els.btnAdicionar.onclick = () => {
            const qtdSelecionada = parseInt(els.qtdInput.value) || 1;

            // Verifica se a função global do carrinho existe
            if (typeof window.adicionarAoCarrinho === 'function') {
                
                // Criamos um elemento "falso" para simular o clique que o main.js espera
                const elementoSimulado = {
                    getAttribute: (attr) => {
                        if (attr === 'data-id') return id;
                        if (attr === 'data-nome') return prod.nome;
                        if (attr === 'data-preco') return precoNumerico;
                        if (attr === 'data-img') return imagemProd;
                        return null;
                    }
                };

                // 1. Adiciona o primeiro item (isso costuma abrir o carrinho lateral)
                window.adicionarAoCarrinho(elementoSimulado);

                // 2. Se o cliente escolheu mais de 1 (ex: 3), adicionamos o restante silenciosamente
                if (qtdSelecionada > 1 && typeof window.alterarQuantidade === 'function') {
                    for (let i = 0; i < qtdSelecionada - 1; i++) {
                        window.alterarQuantidade(id, 'aumentar');
                    }
                }

            } else {
                // Fallback: Método manual caso o main.js não tenha carregado
                console.warn("Função adicionarAoCarrinho do main.js não encontrada. Usando modo manual.");
                adicionarManual(id, prod, precoNumerico, imagemProd, qtdSelecionada, false);
            }
        };
    }

    // B) COMPRAR AGORA (Salva no carrinho e redireciona direto pro checkout)
    if (els.btnComprar) {
        els.btnComprar.onclick = () => {
            const qtdSelecionada = parseInt(els.qtdInput.value) || 1;
            adicionarManual(id, prod, precoNumerico, imagemProd, qtdSelecionada, true);
        };
    }
}

// 4. Função Auxiliar para Salvar Manualmente no LocalStorage
function adicionarManual(id, prod, precoNumerico, imagemProd, qtd, redirecionar) {
    let carrinho = JSON.parse(localStorage.getItem('dispemaq_carrinho')) || [];

    // Procura se já existe no carrinho
    const existente = carrinho.find(i => String(i.id) === String(id));

    if (existente) {
        existente.qtd += qtd;
    } else {
        carrinho.push({
            id: id,
            nome: prod.nome,
            preco: precoNumerico, // Salva como número para facilitar o cálculo do total depois
            img: imagemProd,
            qtd: qtd
        });
    }

    // Salva de volta no navegador
    localStorage.setItem('dispemaq_carrinho', JSON.stringify(carrinho));

    // Redireciona ou atualiza a página para refletir a mudança
    if (redirecionar) {
        window.location.href = 'checkout.html'; // Mude para o link real da sua página de pagamento se for outro
    } else {
        window.location.reload(); 
    }
}

// Inicia a rotina assim que a página terminar de carregar
document.addEventListener('DOMContentLoaded', carregarProduto);