import { 
    db, storage, auth, onAuthStateChanged, signOut,
    collection, addDoc, getDocs, deleteDoc, doc, ref, uploadBytes, getDownloadURL, setDoc, getDoc, updateDoc, query, orderBy
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
        carregarBannersAdmin();
        carregarFiltrosAdmin(); // Carrega as marcas/categorias
    }
});

/* ============================================================
   EVENTOS GLOBAIS (AO CARREGAR A PÁGINA)
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

    // 3. Evento do Banner
    const btnUpload = document.getElementById("btnUploadBanner");
    if(btnUpload) {
        btnUpload.addEventListener("click", async (e) => {
            e.preventDefault(); 
            await adicionarBanner();
        });
    }

    // 4. Botões de Adicionar Marcas e Categorias
    const btnAddMarca = document.getElementById("btnAddMarca");
    const btnAddCat = document.getElementById("btnAddCategoria");

    if(btnAddMarca) btnAddMarca.addEventListener("click", () => adicionarFiltro('marcas'));
    if(btnAddCat) btnAddCat.addEventListener("click", () => adicionarFiltro('categorias'));

    // 5. DELEGAÇÃO DE CLIQUES (Para botões gerados dinamicamente)
    document.body.addEventListener('click', function(e) {
        
        // --- Excluir Produto ---
        if(e.target.closest('.btn-delete-prod')) {
            const id = e.target.closest('.btn-delete-prod').dataset.id;
            deletarProduto(id, e.target);
        }
        
        // --- Excluir Banner ---
        if(e.target.closest('.btn-delete-banner')) {
            const index = e.target.closest('.btn-delete-banner').dataset.index;
            removerBanner(index);
        }
        
        // --- Excluir Filtro (Marca/Cat) ---
        if(e.target.closest('.btn-delete-filtro')) {
            const btn = e.target.closest('.btn-delete-filtro');
            removerFiltro(btn.dataset.colecao, btn.dataset.id);
        }

        // --- Editar Filtro (Marca/Cat) [NOVO] ---
        if(e.target.closest('.btn-edit-filtro')) {
            const btn = e.target.closest('.btn-edit-filtro');
            editarFiltro(btn.dataset.colecao, btn.dataset.id, btn.dataset.nome);
        }
    });
});

/* ============================================================
   LÓGICA CORRIGIDA: GERENCIAR FILTROS (MARCAS E CATEGORIAS)
   ============================================================ */

async function carregarFiltrosAdmin() {
    try {
        // Busca Marcas (Sem orderBy do Firebase para não travar se a lista for nova)
        const snapMarcas = await getDocs(collection(db, "marcas"));
        let marcas = [];
        snapMarcas.forEach(doc => { marcas.push({ id: doc.id, nome: doc.data().nome }); });
        
        // Ordena em ordem alfabética usando JavaScript
        marcas.sort((a, b) => a.nome.localeCompare(b.nome)); 

        // Busca Categorias
        const snapCat = await getDocs(collection(db, "categorias"));
        let categorias = [];
        snapCat.forEach(doc => { categorias.push({ id: doc.id, nome: doc.data().nome }); });
        
        // Ordena em ordem alfabética usando JavaScript
        categorias.sort((a, b) => a.nome.localeCompare(b.nome));

        // Renderiza nas listas
        renderizarListaGestao('listaMarcasAdmin', marcas, 'marcas');
        renderizarListaGestao('listaCategoriasAdmin', categorias, 'categorias');

        // Preenche os SELECTS do formulário
        atualizarSelectFormulario('marca', marcas);
        atualizarSelectFormulario('categoria', categorias);

    } catch (error) {
        console.error("Erro ao carregar filtros:", error);
        document.getElementById('listaMarcasAdmin').innerHTML = `<li style="color:red; padding:10px;">Erro ao carregar.</li>`;
        document.getElementById('listaCategoriasAdmin').innerHTML = `<li style="color:red; padding:10px;">Erro ao carregar.</li>`;
    }
}

function renderizarListaGestao(elementId, arrayItens, colecao) {
    const ul = document.getElementById(elementId);
    if(!ul) return;
    ul.innerHTML = "";
    
    if(arrayItens.length === 0) {
        ul.innerHTML = `<li style="padding:10px; color:#999;">Nenhum item cadastrado.</li>`;
        return;
    }

    arrayItens.forEach(item => {
        // Adicionamos o botão de EDITAR (lápis azul)
        ul.innerHTML += `
            <li style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #eee;">
                <span>${item.nome}</span>
                <div>
                    <button class="btn-edit-filtro" data-colecao="${colecao}" data-id="${item.id}" data-nome="${item.nome}" style="color:#007bff; background:none; border:none; cursor:pointer; margin-right: 15px; font-size: 1.1em;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete-filtro" data-colecao="${colecao}" data-id="${item.id}" style="color:#dc3545; background:none; border:none; cursor:pointer; font-size: 1.1em;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </li>
        `;
    });
}

function atualizarSelectFormulario(selectId, arrayItens) {
    const select = document.getElementById(selectId);
    if(!select) return;

    select.innerHTML = `<option value="" disabled selected>Selecione...</option>`;
    arrayItens.forEach(item => {
        select.innerHTML += `<option value="${item.nome}">${item.nome}</option>`;
    });
}

async function adicionarFiltro(colecao) {
    const idInput = colecao === 'marcas' ? 'novaMarcaInput' : 'novaCategoriaInput';
    const input = document.getElementById(idInput);
    const nome = input.value.trim();

    if (!nome) return alert("Por favor, digite um nome antes de adicionar!");

    try {
        // Cria um ID limpo para o banco (ex: "Filtro de Óleo" vira "filtro_de_oleo")
        const idDoc = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');
        
        await setDoc(doc(db, colecao, idDoc), { 
            nome: nome 
        });
        
        input.value = "";
        carregarFiltrosAdmin(); // Atualiza a tela imediatamente
    } catch (e) {
        console.error(e);
        alert("Erro ao adicionar no banco de dados.");
    }
}

// NOVA FUNÇÃO: Editar o texto de uma Marca ou Categoria
async function editarFiltro(colecao, idDoc, nomeAtual) {
    const novoNome = prompt(`Editar nome (${colecao === 'marcas' ? 'Marca' : 'Categoria'}):`, nomeAtual);
    
    // Se a pessoa cancelar ou enviar em branco, ou enviar igual, não faz nada
    if(novoNome === null || novoNome.trim() === "" || novoNome.trim() === nomeAtual) {
        return; 
    }

    try {
        await updateDoc(doc(db, colecao, idDoc), { 
            nome: novoNome.trim() 
        });
        carregarFiltrosAdmin(); // Atualiza a tela imediatamente
    } catch (error) {
        console.error(error);
        alert("Erro ao salvar a edição.");
    }
}

async function removerFiltro(colecao, idDoc) {
    if(!confirm(`Tem certeza que deseja excluir esta opção?`)) return;

    try {
        await deleteDoc(doc(db, colecao, idDoc));
        carregarFiltrosAdmin();
    } catch (e) {
        console.error(e);
        alert("Erro ao remover.");
    }
}

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
        
        if(!marca || !categoria) throw new Error("Selecione uma Marca e uma Categoria!");

        const descElement = document.getElementById('desc-produto');
        const descricao = descElement ? descElement.value : "Sem descrição técnica.";

        const arquivoInput = document.getElementById('arquivoImagem');
        if (arquivoInput.files.length === 0) throw new Error("Selecione uma foto!");

        const arquivo = arquivoInput.files[0];
        const storageRef = ref(storage, `produtos/${Date.now()}-${arquivo.name}`);
        await uploadBytes(storageRef, arquivo);
        const urlFoto = await getDownloadURL(storageRef);

        await addDoc(prodCollection, {
            nome: nome,
            cod: cod,
            marca: marca,
            categoria: categoria,
            preco: preco,
            descricao: descricao, 
            img: urlFoto, 
            data_cadastro: new Date()
        });

        alert("Produto cadastrado com sucesso!");
        document.getElementById("formProduto").reset();
        
        carregarFiltrosAdmin(); 
        carregarProdutos();

    } catch (error) {
        console.error("Erro ao cadastrar:", error);
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
    } catch(error) {
        console.error("Erro ao carregar produtos:", error);
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
   LÓGICA DE BANNERS
   ============================================================ */
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
        
        const file = input.files[0];
        const storageRef = ref(storage, `banners/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        const docRef = doc(db, "configuracoes", "banner_site");
        const docSnap = await getDoc(docRef);
        
        let listaAtual = [];
        if (docSnap.exists() && docSnap.data().listaBanners) {
            listaAtual = docSnap.data().listaBanners;
        }

        listaAtual.push({
            img: url,
            criadoEm: Date.now()
        });

        await setDoc(docRef, { listaBanners: listaAtual }, { merge: true });

        alert("Banner adicionado com sucesso!");
        input.value = ""; 
        carregarBannersAdmin(); 

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

async function carregarBannersAdmin() {
    const container = document.getElementById("listaBannersAdmin");
    if(!container) return;

    container.innerHTML = "Carregando lista de banners...";

    try {
        const docRef = doc(db, "configuracoes", "banner_site");
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists() || !docSnap.data().listaBanners || docSnap.data().listaBanners.length === 0) {
            container.innerHTML = "<p style='padding:10px; color:#777;'>Nenhum banner ativo. Adicione um acima.</p>";
            return;
        }

        const banners = docSnap.data().listaBanners;
        container.innerHTML = ""; 

        banners.forEach((banner, index) => {
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

async function removerBanner(index) {
    if(!confirm("Tem certeza que deseja remover este banner do carrossel?")) return;

    try {
        const docRef = doc(db, "configuracoes", "banner_site");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            let lista = docSnap.data().listaBanners || [];
            lista.splice(index, 1);
            await updateDoc(docRef, { listaBanners: lista });
            carregarBannersAdmin();
        }
    } catch (error) {
        console.error(error);
        alert("Erro ao remover banner.");
    }
}