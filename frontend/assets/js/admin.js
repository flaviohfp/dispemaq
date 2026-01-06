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
        window.location.href = "loja.html";
    } else {
        console.log("Admin logado");
        carregarProdutos(); 
        carregarBannersAdmin(); // Carrega a lista de banners
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

    // 3. Enviar Novo Banner (Agora adiciona à lista)
    // Nota: Se você usou o meu HTML anterior, o botão pode ter um onclick="adicionarBanner()".
    // Vamos garantir que funcione via JS também.
    window.adicionarBanner = adicionarBanner; // Exibe para o HTML chamar se precisar
    
    const btnAddBanner = document.querySelector('button[onclick="adicionarBanner()"]'); 
    if(btnAddBanner) {
        // Remove o onclick do HTML para não dar conflito ou garante que funcione
        btnAddBanner.onclick = function(e) {
            e.preventDefault();
            adicionarBanner();
        };
    }

    // 4. Delegação de Eventos para botões de Excluir
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
            tbody.innerHTML = '<tr><td colspan="5">Nenhum produto.</td></tr>';
            return;
        }

        querySnapshot.forEach((docItem) => {
            const p = docItem.data();
            tbody.innerHTML += `
                <tr>
                    <td><img src="${p.img}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;"></td>
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
            alert("Erro ao excluir.");
        }
    }
}

/* ============================================================
   LÓGICA DE BANNERS (CARROSSEL / MÚLTIPLOS)
   ============================================================ */

// 1. Adicionar Banner à Lista
async function adicionarBanner() {
    const input = document.getElementById("arquivoBanner");
    const containerBtn = input.parentElement.nextElementSibling; // Botão de enviar
    
    if(!input.files || input.files.length === 0) return alert("Selecione uma imagem!");

    try {
        if(containerBtn) containerBtn.innerText = "Enviando...";
        
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

        // C. Adicionar nova imagem ao array
        listaAtual.push({
            imagem: url,
            criadoEm: Date.now()
        });

        // D. Salvar a lista atualizada
        await setDoc(docRef, { listaBanners: listaAtual }, { merge: true });

        alert("Banner adicionado ao carrossel!");
        input.value = "";
        carregarBannersAdmin(); // Recarrega a lista visual

    } catch (error) {
        console.error(error);
        alert("Erro ao enviar banner.");
    } finally {
        if(containerBtn) containerBtn.innerHTML = '<i class="fas fa-upload"></i> Enviar';
    }
}

// 2. Listar Banners na Tela do Admin
async function carregarBannersAdmin() {
    const container = document.getElementById("listaBannersAdmin"); // ID correto do HTML novo
    if(!container) return;

    container.innerHTML = "Carregando...";

    try {
        const docRef = doc(db, "configuracoes", "banner_site");
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists() || !docSnap.data().listaBanners || docSnap.data().listaBanners.length === 0) {
            container.innerHTML = "<p>Nenhum banner ativo no carrossel.</p>";
            return;
        }

        const banners = docSnap.data().listaBanners;
        container.innerHTML = ""; // Limpa

        banners.forEach((banner, index) => {
            container.innerHTML += `
                <div style="display: flex; align-items: center; justify-content: space-between; background: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-weight:bold; color:#666;">#${index + 1}</span>
                        <img src="${banner.imagem}" style="height: 60px; width: auto; border-radius: 4px;">
                    </div>
                    <button class="btn-delete-banner" data-index="${index}" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-trash"></i> Remover
                    </button>
                </div>
            `;
        });

    } catch (error) {
        console.error(error);
        container.innerHTML = "Erro ao carregar banners.";
    }
}

// 3. Remover Banner da Lista
async function removerBanner(index) {
    if(!confirm("Remover este banner do carrossel?")) return;

    try {
        const docRef = doc(db, "configuracoes", "banner_site");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            let lista = docSnap.data().listaBanners || [];
            
            // Remove o item pelo index (splice)
            lista.splice(index, 1);

            // Atualiza o banco com a nova lista
            await updateDoc(docRef, { listaBanners: lista });
            
            carregarBannersAdmin(); // Atualiza a tela
        }
    } catch (error) {
        console.error(error);
        alert("Erro ao remover banner.");
    }
}