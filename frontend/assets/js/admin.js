import { 
    db, storage, auth, onAuthStateChanged, signOut,
    collection, addDoc, getDocs, deleteDoc, doc, ref, uploadBytes, getDownloadURL, setDoc, getDoc, updateDoc
} from './firebase-config.js';

/* ============================================================
   CONFIGURAÇÃO E VARIÁVEIS
   ============================================================ */
const prodCollection = collection(db, "produtos");
const EMAIL_ADMIN = "admin@dispemaq.com"; 

// Verifica Autenticação
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else if (user.email !== EMAIL_ADMIN) {
        alert("Acesso Negado.");
        window.location.href = "index.html";
    } else {
        console.log("Admin logado:", user.email);
        carregarProdutos(); 
        carregarBannersAdmin(); // <--- IMPORTANTE: Carrega a lista assim que loga
    }
});

/* ============================================================
   EVENTOS (AO CARREGAR A PÁGINA)
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Logout
    const btnLogout = document.getElementById("btnLogout");
    if(btnLogout) btnLogout.addEventListener("click", async () => {
        await signOut(auth);
        window.location.reload();
    });

    // 2. Cadastrar Produto
    const form = document.getElementById("formProduto");
    if(form) form.addEventListener("submit", cadastrarProduto);

    // 3. EVENTO DO BANNER (CRUCIAL)
    const btnUpload = document.getElementById("btnUploadBanner");
    const inputBanner = document.getElementById("arquivoBanner");

    if(btnUpload) {
        // Garante que o clique chame a função correta
        btnUpload.addEventListener("click", async (e) => {
            e.preventDefault(); // Impede resetar a página
            await adicionarBanner();
        });
    } else {
        console.error("Botão btnUploadBanner não encontrado no HTML!");
    }

    // 4. Botões de Excluir (Delegação de evento para itens dinâmicos)
    document.body.addEventListener('click', function(e) {
        // Excluir Produto
        if(e.target.closest('.btn-delete-prod')) {
            const id = e.target.closest('.btn-delete-prod').dataset.id;
            deletarProduto(id, e.target);
        }
        // Excluir Banner
        if(e.target.closest('.btn-delete-banner')) {
            const index = e.target.closest('.btn-delete-banner').dataset.index;
            removerBanner(index);
        }
    });
});

/* ============================================================
   LÓGICA DE PRODUTOS
   ============================================================ */
async function cadastrarProduto(e) {
    e.preventDefault();
    const btn = document.querySelector('#formProduto button[type="submit"]');
    const txtOriginal = btn.innerHTML;
    
    try {
        btn.innerHTML = 'Salvando...';
        btn.disabled = true;

        const nome = document.getElementById('nome').value;
        const cod = document.getElementById('cod').value;
        const marca = document.getElementById('marca').value;
        const categoria = document.getElementById('categoria').value;
        const preco = parseFloat(document.getElementById('preco').value);
        const arquivoInput = document.getElementById('arquivoImagem');

        if (arquivoInput.files.length === 0) throw new Error("Selecione uma foto!");

        const arquivo = arquivoInput.files[0];
        const storageRef = ref(storage, `produtos/${Date.now()}-${arquivo.name}`);
        await uploadBytes(storageRef, arquivo);
        const urlFoto = await getDownloadURL(storageRef);

        await addDoc(prodCollection, {
            nome, cod, marca, categoria, preco,
            img: urlFoto, 
            data_cadastro: new Date()
        });

        alert("Produto cadastrado!");
        document.getElementById("formProduto").reset();
        carregarProdutos();

    } catch (error) {
        alert("Erro: " + error.message);
    } finally {
        btn.innerHTML = txtOriginal;
        btn.disabled = false;
    }
}

async function carregarProdutos() {
    const tbody = document.getElementById("tabelaProdutos");
    if(!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';

    try {
        const querySnapshot = await getDocs(prodCollection);
        tbody.innerHTML = "";

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5">Nenhum produto cadastrado.</td></tr>';
            return;
        }

        querySnapshot.forEach((docItem) => {
            const p = docItem.data();
            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding:10px;"><img src="${p.img}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;"></td>
                    <td><strong>${p.nome}</strong><br><small>${p.cod || ''}</small></td>
                    <td>${p.marca}<br><small>${p.categoria}</small></td>
                    <td style="color:green; font-weight:bold;">R$ ${p.preco}</td>
                    <td>
                        <button class="btn-delete-prod" data-id="${docItem.id}" style="background:red; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error(error);
    }
}

async function deletarProduto(id, elementoBtn) {
    if(confirm("Excluir produto?")) {
        try {
            await deleteDoc(doc(db, "produtos", id));
            elementoBtn.closest("tr").remove();
        } catch (error) {
            alert("Erro ao excluir: " + error.message);
        }
    }
}

/* ============================================================
   LÓGICA DE BANNERS (SISTEMA DE LISTA)
   ============================================================ */

// 1. Adicionar Banner à Lista
async function adicionarBanner() {
    const input = document.getElementById("arquivoBanner");
    const btn = document.getElementById("btnUploadBanner");
    
    if(!input || !input.files || input.files.length === 0) {
        alert("Por favor, selecione uma imagem primeiro!");
        return;
    }

    try {
        if(btn) {
            btn.innerText = "Enviando...";
            btn.disabled = true;
        }
        
        // A. Upload da Imagem
        const file = input.files[0];
        const storageRef = ref(storage, `banners/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        // B. Pegar a lista atual do Firestore
        const docRef = doc(db, "configuracoes", "banner_site");
        const docSnap = await getDoc(docRef);
        
        let listaAtual = [];
        if (docSnap.exists() && docSnap.data().listaBanners) {
            listaAtual = docSnap.data().listaBanners;
        }

        // C. Adicionar nova imagem ao array (no final da lista)
        listaAtual.push({
            img: url,
            criadoEm: Date.now()
        });

        // D. Salvar a lista atualizada no banco
        await setDoc(docRef, { listaBanners: listaAtual }, { merge: true });

        alert("Banner adicionado com sucesso!");
        input.value = ""; // Limpa o campo
        carregarBannersAdmin(); // Atualiza a visualização na hora

    } catch (error) {
        console.error("Erro banner:", error);
        alert("Erro ao enviar banner: " + error.message);
    } finally {
        if(btn) {
            btn.innerHTML = '<i class="fas fa-upload"></i> Enviar Banner';
            btn.disabled = false;
        }
    }
}

// 2. Mostrar Lista de Banners
async function carregarBannersAdmin() {
    const container = document.getElementById("listaBannersAdmin");
    if(!container) return;

    container.innerHTML = "Carregando lista de banners...";

    try {
        const docRef = doc(db, "configuracoes", "banner_site");
        const docSnap = await getDoc(docRef);

        // Verifica se tem lista
        if (!docSnap.exists() || !docSnap.data().listaBanners || docSnap.data().listaBanners.length === 0) {
            container.innerHTML = "<p style='padding:10px; color:#777;'>Nenhum banner ativo. Adicione um acima.</p>";
            return;
        }

        const banners = docSnap.data().listaBanners;
        container.innerHTML = ""; // Limpa para desenhar

        // Desenha cada banner
        banners.forEach((banner, index) => {
            // Suporte para campo 'img' (novo) ou 'imagem' (legado)
            const imgUrl = banner.img || banner.imagem;

            container.innerHTML += `
                <div style="display: flex; align-items: center; justify-content: space-between; background: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <span style="font-weight:bold; color:#007bff; font-size: 1.2em;">#${index + 1}</span>
                        <img src="${imgUrl}" style="height: 60px; width: 150px; object-fit: cover; border-radius: 4px; border: 1px solid #ccc;">
                        <div>
                            <small style="color:#999;">Banner Ativo</small>
                        </div>
                    </div>
                    <button class="btn-delete-banner" data-index="${index}" style="background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                        <i class="fas fa-trash"></i> Remover
                    </button>
                </div>
            `;
        });

    } catch (error) {
        console.error(error);
        container.innerHTML = "<p style='color:red;'>Erro ao carregar banners.</p>";
    }
}

// 3. Remover Banner Específico
async function removerBanner(index) {
    if(!confirm("Tem certeza que deseja remover este banner do carrossel?")) return;

    try {
        const docRef = doc(db, "configuracoes", "banner_site");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            let lista = docSnap.data().listaBanners || [];
            
            // Remove o item da lista usando o índice
            lista.splice(index, 1);

            // Atualiza o banco
            await updateDoc(docRef, { listaBanners: lista });
            
            carregarBannersAdmin(); // Atualiza a tela
        }
    } catch (error) {
        console.error(error);
        alert("Erro ao remover banner.");
    }
}