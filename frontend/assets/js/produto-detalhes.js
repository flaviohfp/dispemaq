// IMPORTANTE: Verifique se esse caminho está certo no seu computador
import { db, doc, getDoc } from './assets/js/firebase-config.js';

// Função para pegar o ID da URL
function getProdutoId() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    return id;
}

// Função Principal
async function carregarDetalhes() {
    const loading = document.getElementById('loading');
    const container = document.getElementById('container-produto');

    try {
        // 1. Verificar ID
        const id = getProdutoId();
        if (!id) {
            throw new Error("ID do produto não encontrado na URL. (Ex: produto.html?id=XYZ)");
        }

        // 2. Buscar no Firebase
        console.log("Buscando ID:", id);
        const docRef = doc(db, "produtos", id);
        const docSnap = await getDoc(docRef);

        // 3. Verificar se produto existe
        if (!docSnap.exists()) {
            throw new Error("Produto não encontrado no banco de dados (ID inválido ou apagado).");
        }

        const produto = docSnap.data();
        console.log("Dados do produto:", produto); // Veja isso no Console (F12)

        // 4. Preencher a tela (com proteções contra falhas)
        const imagem = produto.urlImagem || produto.imagem || produto.foto || './assets/images/placeholder.jpg';
        const nome = produto.nome || "Sem nome";
        const codigo = produto.codigo || "---";
        const categoria = produto.categoria || "Geral";
        const descricao = produto.descricao || "Sem descrição.";
        const preco = parseFloat(produto.preco || 0);

        // Injetar no HTML
        document.getElementById('img-produto').src = imagem;
        document.getElementById('cat-produto').innerText = categoria;
        document.getElementById('nome-produto').innerText = nome;
        document.getElementById('cod-produto').innerText = codigo;
        document.getElementById('desc-produto').innerText = descricao;
        document.getElementById('preco-produto').innerText = `R$ ${preco.toFixed(2).replace('.', ',')}`;

        // Configurar Botão Zap
        const btnZap = document.getElementById('btn-whatsapp');
        if(btnZap) {
            const msg = `Olá, tenho interesse em: ${nome} (Cód: ${codigo})`;
            btnZap.href = `https://wa.me/554984276503?text=${encodeURIComponent(msg)}`;
        }

        // Configurar Botão Comprar
        const btnComprar = document.getElementById('btn-comprar');
        if(btnComprar) {
            btnComprar.onclick = () => {
                alert("Produto adicionado ao carrinho!"); // Feedback simples para teste
                // Aqui entraria a lógica de salvar no localStorage
            };
        }

        // SUCESSO: Mostrar a tela
        loading.style.display = 'none';
        container.style.display = 'grid'; // ou 'flex'

    } catch (error) {
        // MOSTRAR ERRO NA TELA
        console.error("Erro fatal:", error);
        loading.innerHTML = `
            <div style="color: red; text-align: center; padding: 20px; border: 1px solid red; background: #fff0f0;">
                <h3>Ocorreu um erro!</h3>
                <p><strong>Mensagem:</strong> ${error.message}</p>
                <p><small>Verifique o Console (F12) para mais detalhes técnicos.</small></p>
            </div>
        `;
    }
}

// Inicializar
window.addEventListener('DOMContentLoaded', carregarDetalhes);