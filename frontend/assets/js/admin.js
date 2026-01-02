/* =========================================
   ADMIN.JS - COMPLETO E SEGURO
   (Proteção de Login + Produtos + Banner)
   ========================================= */

// 1. IMPORTAÇÕES (Incluindo Auth e SignOut)
import { 
    db, storage, auth, onAuthStateChanged, signOut,
    collection, addDoc, getDocs, deleteDoc, doc, ref, uploadBytes, getDownloadURL, setDoc 
} from './firebase-config.js';

const prodCollection = collection(db, "produtos");

// 2. CONFIGURAÇÃO DE SEGURANÇA (O GUARDIÃO)
// Troque pelo e-mail que você criou para seu cliente no Firebase
const EMAIL_ADMIN = "admin@dispemaq.com"; 

onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Se ninguém estiver logado -> Manda pro Login
        window.location.href = "login.html";
    } else if (user.email !== EMAIL_ADMIN) {
        // Se estiver logado, mas não for o dono -> Manda pra Loja
        alert("Acesso Negado: Área restrita ao administrador.");
        window.location.href = "loja.html";
    } else {
        // Se for o dono -> Libera o uso e carrega os produtos
        console.log("Acesso Admin Liberado para: ", user.email);
        carregarProdutos(); 
    }
});

// 3. LOGICA DA PÁGINA (Botões e Formulários)
document.addEventListener("DOMContentLoaded", () => {
    
    // Botão de Sair (Logout) - Caso você adicione no HTML depois
    const btnLogout = document.getElementById("btnLogout");
    if(btnLogout) {
        btnLogout.addEventListener("click", async () => {
            await signOut(auth);
            window.location.href = "login.html";
        });
    }

    // EVENTO: CADASTRAR PRODUTO
    const form = document.getElementById("formProduto");
    if(form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            await cadastrarComFoto();
        });
    }

    // EVENTO: ATUALIZAR BANNER
    const btnBanner = document.getElementById("btnSalvarBanner");
    if(btnBanner) {
        btnBanner.addEventListener("click", atualizarBannerSite);
    }

    // EVENTO: DELETAR PRODUTO (Delegação de Eventos)
    const tabela = document.getElementById("tabelaProdutos");
    if(tabela) {
        tabela.addEventListener("click", async (e) => {
            // Verifica se clicou no botão de deletar ou no ícone dentro dele
            const btn = e.target.closest(".btn-delete");
            
            if (btn) {
                const id = btn.dataset.id;
                if(id) {
                    await deletarProduto(id, btn);
                }
            }
        });
    }
});

/* ----------------------------------------------------------------
   FUNÇÃO 1: CADASTRAR PRODUTO (Completa)
   ---------------------------------------------------------------- */
async function cadastrarComFoto() {
    const btn = document.querySelector('.btn-add');
    const textoOriginal = btn.innerHTML;
    
    // Pega os dados do formulário
    const nome = document.getElementById('nome').value;
    const cod = document.getElementById('cod').value;
    const marca = document.getElementById('marca').value;
    const categoria = document.getElementById('categoria').value;
    const preco = parseFloat(document.getElementById('preco').value);
    const arquivoInput = document.getElementById('arquivoImagem');

    if (arquivoInput.files.length === 0) {
        alert("Selecione uma foto para o produto!");
        return;
    }

    try {
        btn.innerHTML = "Enviando foto...";
        btn.disabled = true;

        const arquivo = arquivoInput.files[0];
        // Cria nome único para a imagem
        const nomeArquivo = `produtos/${Date.now()}-${arquivo.name}`;
        
        // 1. Upload da Imagem
        const storageRef = ref(storage, nomeArquivo);
        await uploadBytes(storageRef, arquivo);
        const urlFoto = await getDownloadURL(storageRef);

        btn.innerHTML = "Salvando dados...";

        // 2. Salva no Firestore
        await addDoc(prodCollection, {
            nome: nome,
            cod: cod,
            marca: marca,
            categoria: categoria,
            preco: preco,
            img: urlFoto, 
            data_cadastro: new Date()
        });

        alert("Produto cadastrado com sucesso!");
        document.getElementById("formProduto").reset(); 
        carregarProdutos(); // Atualiza a tabela

    } catch (error) {
        console.error("Erro ao cadastrar:", error);
        alert("Erro: " + error.message);
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

/* ----------------------------------------------------------------
   FUNÇÃO 2: LISTAR PRODUTOS NA TABELA
   ---------------------------------------------------------------- */
async function carregarProdutos() {
    const tbody = document.getElementById("tabelaProdutos");
    const status = document.getElementById("statusCarregamento");
    
    if(!tbody) return;
    tbody.innerHTML = ""; // Limpa a tabela antes de encher

    try {
        const querySnapshot = await getDocs(prodCollection);
        
        if (querySnapshot.empty) {
            if(status) status.innerText = "Nenhum produto cadastrado.";
            return;
        }

        if(status) status.style.display = "none";

        querySnapshot.forEach((docItem) => {
            const produto = docItem.data();
            const id = docItem.id; // ID do Firebase

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>
                    <img src="${produto.img}" alt="foto" style="width:50px; height:50px; object-fit:cover; border-radius:4px;">
                </td>
                <td>
                    <strong>${produto.nome}</strong><br>
                    <small style="color:#666">${produto.cod || '-'}</small>
                </td>
                <td>
                    <span style="text-transform:capitalize">${produto.marca}</span> / 
                    <small>${produto.categoria}</small>
                </td>
                <td style="color:#28a745; font-weight:bold;">R$ ${produto.preco}</td>
                <td>
                    <button class="btn-delete" data-id="${id}" style="cursor:pointer; background:red; color:white; border:none; width:35px; height:35px; border-radius:4px; display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error("Erro ao listar:", error);
        if(status) status.innerText = "Erro ao carregar lista.";
    }
}

/* ----------------------------------------------------------------
   FUNÇÃO 3: DELETAR PRODUTO (Remover)
   ---------------------------------------------------------------- */
async function deletarProduto(id, botao) {
    if(confirm("Tem certeza que deseja excluir este produto do estoque?")) {
        try {
            console.log("Tentando deletar ID:", id);
            
            // Remove do Banco
            await deleteDoc(doc(db, "produtos", id));
            
            // Remove da Tela (Visual)
            const linha = botao.closest("tr");
            linha.remove();
            
            alert("Produto excluído com sucesso!");

        } catch (error) {
            console.error("Erro ao deletar:", error);
            alert("Erro ao excluir: " + error.message);
        }
    }
}

/* ----------------------------------------------------------------
   FUNÇÃO 4: ATUALIZAR BANNER (Nova)
   ---------------------------------------------------------------- */
async function atualizarBannerSite() {
    const input = document.getElementById("arquivoBanner");
    const btn = document.getElementById("btnSalvarBanner");
    
    if(!input.files || input.files.length === 0) {
        alert("Selecione uma imagem para o banner!");
        return;
    }

    const arquivo = input.files[0];

    try {
        const textoOriginal = btn.innerHTML;
        btn.innerHTML = "Enviando...";
        btn.disabled = true;

        // 1. Salva no Storage (sempre sobrescreve o arquivo 'banner_oficial')
        const storageRef = ref(storage, 'config_site/banner_oficial');
        await uploadBytes(storageRef, arquivo);
        
        // 2. Pega o link novo
        const urlBanner = await getDownloadURL(storageRef);

        // 3. Salva link no Banco de Dados
        await setDoc(doc(db, "configuracoes", "banner_site"), {
            url: urlBanner,
            atualizado_em: new Date()
        });

        alert("Banner atualizado! Vá na loja conferir.");
        input.value = ""; 

        btn.innerHTML = textoOriginal;
        btn.disabled = false;

    } catch (error) {
        console.error("Erro no banner:", error);
        alert("Erro ao atualizar banner: " + error.message);
        btn.disabled = false;
    }
}