/* =========================================
   ADMIN.JS - VERSÃO DIAGNÓSTICO (DEBUG)
   ========================================= */
import { db, storage, collection, addDoc, getDocs, deleteDoc, doc, ref, uploadBytes, getDownloadURL } from './firebase-config.js';

console.log("Admin.js carregado com sucesso!"); // Teste 1

const prodCollection = collection(db, "produtos");

document.addEventListener("DOMContentLoaded", () => {
    carregarProdutos();
    
    // Configura o formulário
    const form = document.getElementById("formProduto");
    if(form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            await cadastrarComFoto();
        });
    }

    // --- LISTENER DO DELETE (COM LOGS) ---
    const tabela = document.getElementById("tabelaProdutos");
    if(tabela) {
        console.log("Tabela encontrada. Observando cliques..."); // Teste 2
        
        tabela.addEventListener("click", async (e) => {
            console.log("Clique detectado na tabela. Alvo:", e.target); // Teste 3
            
            // Tenta achar o botão, mesmo se clicou no ícone
            const btn = e.target.closest(".btn-delete");
            
            if (btn) {
                console.log("Botão de deletar encontrado!"); // Teste 4
                const id = btn.dataset.id;
                console.log("ID recuperado:", id); // Teste 5
                
                if(id) {
                    await deletarProduto(id, btn);
                } else {
                    console.error("ERRO: O botão não tem ID (data-id vazio).");
                }
            }
        });
    } else {
        console.error("ERRO CRÍTICO: Tabela #tabelaProdutos não encontrada no HTML.");
    }
});

// --- FUNÇÃO DELETAR ---
async function deletarProduto(id, botao) {
    console.log("Iniciando processo de delete para o ID:", id); // Teste 6
    
    if(confirm("Tem certeza que deseja excluir?")) {
        try {
            console.log("Enviando comando para o Firebase..."); // Teste 7
            
            // O ERRO GERALMENTE ACONTECE AQUI
            await deleteDoc(doc(db, "produtos", id));
            
            console.log("Sucesso! Removendo linha da tabela..."); // Teste 8
            const linha = botao.closest("tr");
            linha.remove();
            
            alert("Produto excluído!");

        } catch (error) {
            console.error("ERRO AO DELETAR:", error); // AQUI VAI APARECER O MOTIVO REAL
            alert("Erro: " + error.message);
        }
    } else {
        console.log("Cancelado pelo usuário.");
    }
}

// ... (Mantenha as funções cadastrarComFoto e carregarProdutos iguais às anteriores)
// Vou repetir aqui só o carregarProdutos pra garantir que o ID está indo pro botão
async function carregarProdutos() {
    const tbody = document.getElementById("tabelaProdutos");
    tbody.innerHTML = ""; 
    try {
        const querySnapshot = await getDocs(prodCollection);
        querySnapshot.forEach((docItem) => {
            const produto = docItem.data();
            const id = docItem.id; // IMPORTANTE
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><img src="${produto.img}" width="50"></td>
                <td>${produto.nome}</td>
                <td>${produto.marca}</td>
                <td>R$ ${produto.preco}</td>
                <td>
                    <button class="btn-delete" data-id="${id}" style="background:red; color:white; border:none; padding:5px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error("Erro ao carregar:", error);
    }
}

// Precisa repetir a função de cadastro para o código ficar completo
async function cadastrarComFoto() {
    // ... (Use o mesmo código de cadastro que te passei antes) ...
    // Se quiser, posso mandar ele completo de novo, mas o foco é o delete.
    const btn = document.querySelector('.btn-add');
    const nome = document.getElementById('nome').value;
    const preco = document.getElementById('preco').value;
    const arquivo = document.getElementById('arquivoImagem').files[0];

    // Simplificado para teste se você precisar (mas use o seu completo)
    if(arquivo) {
        const storageRef = ref(storage, `produtos/${Date.now()}`);
        await uploadBytes(storageRef, arquivo);
        const url = await getDownloadURL(storageRef);
        await addDoc(prodCollection, { nome, preco, img: url, data_cadastro: new Date() });
        carregarProdutos();
    }
}