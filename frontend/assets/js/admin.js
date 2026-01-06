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
        window.location.href = "index.html"; // Redireciona para a home se não for admin
    } else {
        console.log("Admin logado");
        carregarProdutos(); 
        carregarBannersAdmin(); // Carrega a lista de banners ao iniciar
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

    // 3. EVENTO DO BOTÃO DE BANNER (CORREÇÃO PRINCIPAL)
    // Tenta pegar pelo ID novo ou pelo botão genérico dentro do formulário de banner
    const btnUpload = document.getElementById("btnUploadBanner") || document.getElementById("btnSalvarBanner");
    
    if(btnUpload) {
        // Remove qualquer onclick antigo do HTML para evitar conflito e usa o JS moderno
        btnUpload.onclick = null; 
        btnUpload.addEventListener("click", async (e) => {
            e.preventDefault(); // Impede recarregar a página
            await adicionarBanner();
        });
    }

    // 4. Delegação de Eventos para botões de Excluir (Funciona para itens criados dinamicamente)
    document.body.addEventListener('click', function(e) {
        // Deletar Produto
        if(e.target.closest('.btn-delete-prod')) {
            const id = e.target.closest('.btn-delete-prod').dataset.id;
            deletarProduto(id, e.target);
        }
        // Deletar Banner
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

        // Upload
        const arquivo = arquivoInput.files[0];
        const storageRef = ref(storage, `produtos/${Date.now()}-${arquivo.name}`);
        await uploadBytes(storageRef, arquivo);
        const urlFoto = await getDownloadURL(storageRef);

        // Salvar Firestore
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
            // Remove a linha da tabela visualmente sem precisar recarregar tudo
            if(elementoBtn && elementoBtn.closest("tr")) {
                elementoBtn.closest("tr").remove();
            } else {
                carregarProdutos();
            }
        } catch (error) {
            alert("Erro ao excluir: " + error.message);
        }
    }
}

/* ============================================================
   LÓGICA DE BANNERS (MÚLTIPLOS / CARROSSEL)
   ============================================================ */

async function adicionarBanner() {
    const input = document.getElementById("arquivoBanner");
    
    // Tenta pegar o botão pelo ID novo ou busca o botão próximo ao input
    let btn = document.getElementById("btnUploadBanner");
    if(!btn) {
        // Fallback: tenta achar o botão dentro do card de banners se o ID não existir
        btn = input.parentElement.parentElement.querySelector("button"); 
    }

    if(!input.files || input.files.length === 0) {
        alert("Selecione uma imagem para o banner!");
        return;
    }

    const txtOriginal = btn ? btn.innerHTML : "Enviar";

    try {
        if(btn) {
            btn.innerHTML = 'Enviando...';
            btn.disabled = true;
        }
        
        // 1. Upload da Imagem
        const file = input.files[0];
        // Usar timestamp garante nome único
        const storageRef = ref(storage, `banners/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        // 2. Pegar a lista atual do Firestore
        const docRef = doc(db, "configuracoes", "banner_site");
        const docSnap = await getDoc(docRef);
        
        let listaAtual = [];
        // Se já existir lista, pega ela. Se não, começa vazia.
        if (docSnap.exists() && docSnap.data().listaBanners) {
            listaAtual = docSnap.data().listaBanners;
        }

        // 3. Adicionar nova imagem ao array
        // IMPORTANTE: Estou usando 'img' para ficar compatível com o main.js que te passei
        listaAtual.push({
            img: url, 
            criadoEm: Date.now()
        });

        // 4. Salvar a lista atualizada (sobrescreve o array antigo com o novo contendo +1 item)
        await setDoc(docRef, { listaBanners: listaAtual }, { merge: true });

        alert("Banner adicionado com sucesso!");
        input.value = ""; // Limpa o input
        carregarBannersAdmin(); // Atualiza a visualização na hora

    } catch (error) {
        console.error("Erro banner:", error);
        alert("Erro ao enviar banner: " + error.message);
    } finally {
        if(btn) {
            btn.innerHTML = txtOriginal;
            btn.disabled = false;
        }
    }
}

async function carregarBannersAdmin() {
    const container = document.getElementById("listaBannersAdmin");
    if(!container) return;

    container.innerHTML = "<p>Carregando banners...</p>";

    try {
        const docRef = doc(db, "configuracoes", "banner_site");
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists() || !docSnap.data().listaBanners || docSnap.data().listaBanners.length === 0) {
            container.innerHTML = "<p>Nenhum banner ativo no momento.</p>";
            return;
        }

        const banners = docSnap.data().listaBanners;
        container.innerHTML = ""; // Limpa a mensagem de carregando

        // Cria o HTML para cada banner da lista
        banners.forEach((banner, index) => {
            container.innerHTML += `
                <div style="display: flex; align-items: center; justify-content: space-between; background: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 10px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-weight:bold; color:#666;">#${index + 1}</span>
                        <img src="${banner.img || banner.imagem}" style="height: 60px; width: 120px; object-fit: cover; border-radius: 4px;">
                    </div>
                    <button class="btn-delete-banner" data-index="${index}" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-trash"></i> Remover
                    </button>
                </div>
            `;
        });

    } catch (error) {
        console.error(error);
        container.innerHTML = "<p>Erro ao carregar lista de banners.</p>";
    }
}

async function removerBanner(index) {
    if(!confirm("Tem certeza que deseja remover este banner?")) return;

    try {
        const docRef = doc(db, "configuracoes", "banner_site");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            let lista = docSnap.data().listaBanners || [];
            
            // Remove o item pelo índice (posição na lista)
            lista.splice(index, 1);

            // Salva a nova lista no banco
            await updateDoc(docRef, { listaBanners: lista });
            
            carregarBannersAdmin(); // Atualiza a tela
        }
    } catch (error) {
        console.error(error);
        alert("Erro ao remover banner.");
    }
}