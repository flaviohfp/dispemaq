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

    // 3. EVENTO DO BANNER
    const btnUpload = document.getElementById("btnUploadBanner");
    if(btnUpload) {
        btnUpload.addEventListener("click", async (e) => {
            e.preventDefault(); 
            await adicionarBanner();
        });
    }

    // 4. EVENTOS DE FILTROS (Marcas e Categorias)
    const btnAddMarca = document.getElementById("btnAddMarca");
    const btnAddCat = document.getElementById("btnAddCategoria");

    if(btnAddMarca) btnAddMarca.addEventListener("click", () => adicionarFiltro('marcas'));
    if(btnAddCat) btnAddCat.addEventListener("click", () => adicionarFiltro('categorias'));

    // 5. Botões de Excluir (Delegação Global)
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
        // Excluir Filtro
        if(e.target.closest('.btn-delete-filtro')) {
            const btn = e.target.closest('.btn-delete-filtro');
            const colecao = btn.dataset.colecao;
            const idDoc = btn.dataset.id;
            removerFiltro(colecao, idDoc);
        }
    });
});

/* ============================================================
   NOVA LÓGICA: GERENCIAR FILTROS (COLEÇÕES SEPARADAS)
   ============================================================ */

async function carregarFiltrosAdmin() {
    try {
        // Busca Marcas
        const qMarcas = query(collection(db, "marcas"), orderBy("nome"));
        const snapMarcas = await getDocs(qMarcas);
        let marcas = [];
        snapMarcas.forEach(doc => { marcas.push({ id: doc.id, nome: doc.data().nome }); });

        // Busca Categorias
        const qCat = query(collection(db, "categorias"), orderBy("nome"));
        const snapCat = await getDocs(qCat);
        let categorias = [];
        snapCat.forEach(doc => { categorias.push({ id: doc.id, nome: doc.data().nome }); });

        // Renderiza listas de gestão
        renderizarListaGestao('listaMarcasAdmin', marcas, 'marcas');
        renderizarListaGestao('listaCategoriasAdmin', categorias, 'categorias');

        // Preenche os SELECTS do formulário de cadastro
        atualizarSelectFormulario('marca', marcas);
        atualizarSelectFormulario('categoria', categorias);

    } catch (error) {
        console.error("Erro ao carregar filtros:", error);
    }
}

function renderizarListaGestao(elementId, arrayItens, colecao) {
    const ul = document.getElementById(elementId);
    if(!ul) return;
    ul.innerHTML = "";
    
    if(arrayItens.length === 0) {
        ul.innerHTML = `<li style="padding:10px; color:#999;">Nenhum cadastrado.</li>`;
        return;
    }

    arrayItens.forEach(item => {
        ul.innerHTML += `
            <li style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #eee;">
                <span>${item.nome}</span>
                <button class="btn-delete-filtro" data-colecao="${colecao}" data-id="${item.id}" style="color:red; background:none; border:none; cursor:pointer;">
                    <i class="fas fa-trash"></i>
                </button>
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

    if (!nome) return alert("Digite um nome!");

    try {
        // Cria um ID limpo para o documento (ex: "Filtro de Óleo" vira "filtro_de_oleo")
        const idDoc = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');
        
        await setDoc(doc(db, colecao, idDoc), { 
            nome: nome 
        });
        
        input.value = "";
        alert(`${colecao === 'marcas' ? 'Marca' : 'Categoria'} adicionada com sucesso!`);
        carregarFiltrosAdmin(); // Atualiza a tela
    } catch (e) {
        console.error(e);
        alert("Erro ao adicionar.");
    }
}

async function removerFiltro(colecao, idDoc) {
    if(!confirm(`Tem certeza que deseja excluir? Isso removerá a opção do menu, mas não apagará os produtos já cadastrados com ela.`)) return;

    try {
        await deleteDoc(doc(db, colecao, idDoc));
        carregarFiltrosAdmin();
    } catch (e) {
        console.error(e);
        alert("Erro ao remover.");
    }
}

/* ============================================================
   LÓGICA DE PRODUTOS (MANTIDA INTACTA)
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
        // Ordena produtos dos mais novos para os mais antigos
        const qProd = query(prodCollection, orderBy("data_cadastro", "desc"));
        const querySnapshot = await getDocs(qProd);
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
        console.error("Erro ao carregar produtos (Pode ser falta de index):", error);
        // Fallback caso falte index de ordenação
        try {
            const querySnapshot = await getDocs(prodCollection);
            tbody.innerHTML = "";
            querySnapshot.forEach((docItem) => { /* Código idêntico do loop acima */
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
        } catch(e) {}
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
   LÓGICA DE BANNERS (MANTIDA INTACTA)
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