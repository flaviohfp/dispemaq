/* =========================================
   ADMIN.JS - CORRIGIDO E COMPLETO
   (Firebase: Produtos + Banner Dinâmico)
   ========================================= */

// 1. IMPORTAÇÕES
import { 
    db, storage, auth, onAuthStateChanged, signOut,
    collection, addDoc, getDocs, deleteDoc, doc, ref, uploadBytes, getDownloadURL, setDoc, getDoc
} from './firebase-config.js';

const prodCollection = collection(db, "produtos");

// 2. CONFIGURAÇÃO DE SEGURANÇA
const EMAIL_ADMIN = "admin@dispemaq.com"; 

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else if (user.email !== EMAIL_ADMIN) {
        alert("Acesso Negado: Área restrita ao administrador.");
        window.location.href = "loja.html";
    } else {
        console.log("Admin logado:", user.email);
        carregarProdutos(); 
        carregarBannerNaTela(); // <--- NOVA FUNÇÃO PARA MOSTRAR O BANNER
    }
});

// 3. EVENTOS (DOM LOADED)
document.addEventListener("DOMContentLoaded", () => {
    
    // Logout
    const btnLogout = document.getElementById("btnLogout");
    if(btnLogout) {
        btnLogout.addEventListener("click", async () => {
            await signOut(auth);
            window.location.href = "login.html";
        });
    }

    // Cadastrar Produto
    const form = document.getElementById("formProduto");
    if(form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            await cadastrarComFoto();
        });
    }

    // Salvar Banner (Agora previne o refresh da página)
    const btnBanner = document.getElementById("btnSalvarBanner");
    if(btnBanner) {
        btnBanner.addEventListener("click", async (e) => {
            e.preventDefault(); // Impede o formulário de recarregar a página
            await atualizarBannerSite();
        });
    }

    // Deletar Produto (Delegação de Eventos)
    const tabela = document.getElementById("tabelaProdutos");
    if(tabela) {
        tabela.addEventListener("click", async (e) => {
            const btn = e.target.closest(".btn-delete");
            if (btn) {
                const id = btn.dataset.id;
                if(id) await deletarProduto(id, btn);
            }
        });
    }

    // Deletar Banner (Delegação de Eventos)
    const listaBanners = document.getElementById("listaBanners");
    if(listaBanners) {
        listaBanners.addEventListener("click", async (e) => {
            if(e.target.closest(".btn-delete-banner")) {
                await deletarBanner();
            }
        });
    }
});

/* ----------------------------------------------------------------
   FUNÇÕES DE PRODUTOS (Mantidas iguais, pois estavam boas)
   ---------------------------------------------------------------- */
async function cadastrarComFoto() {
    const btn = document.querySelector('.btn-add');
    const textoOriginal = btn.innerHTML;
    
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
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        btn.disabled = true;

        const arquivo = arquivoInput.files[0];
        const nomeArquivo = `produtos/${Date.now()}-${arquivo.name}`;
        
        const storageRef = ref(storage, nomeArquivo);
        await uploadBytes(storageRef, arquivo);
        const urlFoto = await getDownloadURL(storageRef);

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
        carregarProdutos(); 

    } catch (error) {
        console.error("Erro ao cadastrar:", error);
        alert("Erro: " + error.message);
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

async function carregarProdutos() {
    const tbody = document.getElementById("tabelaProdutos");
    const status = document.getElementById("statusCarregamento");
    
    if(!tbody) return;
    tbody.innerHTML = ""; 

    try {
        const querySnapshot = await getDocs(prodCollection);
        
        if (querySnapshot.empty) {
            if(status) status.innerText = "Nenhum produto cadastrado.";
            return;
        }

        if(status) status.style.display = "none";

        querySnapshot.forEach((docItem) => {
            const produto = docItem.data();
            const id = docItem.id; 

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><img src="${produto.img}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;"></td>
                <td><strong>${produto.nome}</strong><br><small style="color:#666">${produto.cod || '-'}</small></td>
                <td><span style="text-transform:capitalize">${produto.marca}</span></td>
                <td style="color:#28a745; font-weight:bold;">R$ ${produto.preco}</td>
                <td>
                    <button class="btn-delete" data-id="${id}" style="background:red; color:white; border:none; width:30px; height:30px; border-radius:4px; cursor:pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error("Erro ao listar:", error);
    }
}

async function deletarProduto(id, botao) {
    if(confirm("Excluir este produto?")) {
        try {
            await deleteDoc(doc(db, "produtos", id));
            botao.closest("tr").remove();
            alert("Produto excluído!");
        } catch (error) {
            alert("Erro ao excluir: " + error.message);
        }
    }
}

/* ----------------------------------------------------------------
   FUNÇÕES DO BANNER (Corrigidas e Integradas com HTML)
   ---------------------------------------------------------------- */

// 1. ATUALIZAR (Upload + Salvar no Firestore)
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

        // Dica: Usar Date.now() no nome evita cache do navegador ao trocar imagem
        const nomeArquivo = `config_site/banner_oficial_${Date.now()}`; 
        
        // 1. Upload
        const storageRef = ref(storage, nomeArquivo);
        await uploadBytes(storageRef, arquivo);
        
        // 2. Pegar URL
        const urlBanner = await getDownloadURL(storageRef);

        // 3. Atualizar documento de Configuração
        await setDoc(doc(db, "configuracoes", "banner_site"), {
            url: urlBanner,
            atualizado_em: new Date()
        });

        alert("Banner atualizado com sucesso!");
        input.value = ""; 
        carregarBannerNaTela(); // Atualiza a visualização na hora

        btn.innerHTML = textoOriginal;
        btn.disabled = false;

    } catch (error) {
        console.error("Erro no banner:", error);
        alert("Erro: " + error.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-upload"></i> Enviar Banner';
    }
}

// 2. CARREGAR (Mostrar o banner atual na div #listaBanners)
async function carregarBannerNaTela() {
    const container = document.getElementById("listaBanners");
    if(!container) return;

    try {
        container.innerHTML = "Buscando banner...";
        const docRef = doc(db, "configuracoes", "banner_site");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const dados = docSnap.data();
            
            container.innerHTML = `
                <div style="position: relative; width: 300px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                    <img src="${dados.url}" style="width: 100%; height: auto; display: block;">
                    <div style="padding: 10px; background: #fff; text-align: center;">
                        <small style="color: green; font-weight: bold;">Ativo no Site</small>
                        <br>
                        <button class="btn-delete-banner" style="margin-top: 5px; background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-trash"></i> Remover Banner
                        </button>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = "<p>Nenhum banner configurado.</p>";
        }
    } catch (error) {
        console.error("Erro ao carregar banner:", error);
        container.innerHTML = "<p>Erro ao carregar.</p>";
    }
}

// 3. DELETAR BANNER
async function deletarBanner() {
    if(confirm("Tem certeza que deseja remover o banner do site?")) {
        try {
            // Remove o documento de configuração (o site ficará sem banner)
            await deleteDoc(doc(db, "configuracoes", "banner_site"));
            carregarBannerNaTela(); // Atualiza tela
            alert("Banner removido!");
        } catch (error) {
            console.error(error);
            alert("Erro ao remover.");
        }
    }
}