import { db } from './firebase-config.js'; // Garanta que o caminho está certo
import { doc, getDoc, collection, query, where, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 1. Pegar o ID da URL (ex: produto.html?id=ABC12345)
const params = new URLSearchParams(window.location.search);
const produtoId = params.get('id');

const containerRelacionados = document.getElementById('relatedContainer');

// Se não tiver ID, volta pra home
if (!produtoId) {
    window.location.href = "index.html";
}

// 2. Função Principal
async function carregarProduto() {
    try {
        const docRef = doc(db, "produtos", produtoId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const produto = docSnap.data();
            
            // Preencher HTML
            document.getElementById('imgPrincipal').src = produto.imagem;
            document.getElementById('nomeProd').innerText = produto.nome;
            document.getElementById('marcaProd').innerText = produto.marca; // ou formatarMarca(produto.marca)
            document.getElementById('codProd').innerText = docSnap.id; // ou produto.codigo se tiver salvo
            
            // Preço
            const precoFormatado = parseFloat(produto.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            document.getElementById('precoProd').innerText = precoFormatado;

            // Link do WhatsApp dinâmico
            const zapTexto = `Olá, vi o produto *${produto.nome}* no site e gostaria de um orçamento/comprar.`;
            const zapLink = `https://wa.me/55SEUNUMEROAQUI?text=${encodeURIComponent(zapTexto)}`;
            document.getElementById('btnZap').href = zapLink;

            // Carregar Relacionados (Mesma Categoria)
            carregarRelacionados(produto.categoria, produtoId);

        } else {
            document.querySelector('.product-main').innerHTML = "<h2>Produto não encontrado.</h2>";
        }
    } catch (error) {
        console.error("Erro ao carregar:", error);
    }
}

// 3. Função para carregar Relacionados
async function carregarRelacionados(categoria, idAtual) {
    if(!categoria) return;

    // Busca 4 produtos da mesma categoria
    const q = query(
        collection(db, "produtos"), 
        where("categoria", "==", categoria),
        limit(4)
    );

    const querySnapshot = await getDocs(q);
    
    containerRelacionados.innerHTML = ""; // Limpa

    querySnapshot.forEach((doc) => {
        // Não mostrar o produto que já estamos vendo
        if(doc.id === idAtual) return;

        const prod = doc.data();
        
        // Cria o card (HTML simplificado)
        const card = document.createElement('div');
        card.className = 'produto-card'; // Use a mesma classe do seu CSS principal
        card.innerHTML = `
            <img src="${prod.imagem}" alt="${prod.nome}">
            <h3>${prod.nome}</h3>
            <p class="preco">R$ ${parseFloat(prod.preco).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            <button onclick="window.location.href='produto.html?id=${doc.id}'">Ver Detalhes</button>
        `;
        containerRelacionados.appendChild(card);
    });

    if(containerRelacionados.innerHTML === "") {
        containerRelacionados.innerHTML = "<p>Nenhum produto relacionado encontrado.</p>";
    }
}

// Iniciar
carregarProduto();