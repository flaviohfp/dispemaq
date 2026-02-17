import { 
    db, storage, auth, onAuthStateChanged, signOut,
    collection, addDoc, getDocs, deleteDoc, doc, ref, uploadBytes, getDownloadURL, setDoc, getDoc, updateDoc
} from './firebase-config.js';

/* ============================================================
   CONFIGURAÇÃO E VARIÁVEIS globais
   ============================================================ */
const prodCollection = collection(db, "produtos");
const EMAIL_ADMIN = "admin@dispemaq.com"; // Mude se necessário

// Verifica Autenticação
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else if (user.email !== EMAIL_ADMIN) {
        alert("Acesso Negado. Apenas o administrador pode acessar este painel.");
        window.location.href = "index.html"; // Redireciona usuários comuns
    } else {
        console.log("Admin logado com sucesso:", user.email);
        // Inicia o carregamento de todos os módulos
        carregarFiltrosAdmin();
        carregarProdutos(); 
        carregarBannersAdmin();
    }
});

/* ============================================================
   EVENTOS GLOBAIS (AO CARREGAR A PÁGINA)
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Logout
    const btnLogout = document.getElementById("btnLogout");
    if(btnLogout) {
        btnLogout.addEventListener("click", async () => {
            await signOut(auth);
            window.location.reload();
        });
    }

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

    // 5. DELEGAÇÃO DE CLIQUES (Para botões gerados dinamicamente no JS)
    document.body.addEventListener('click', function(e) {
        
        // --- Excluir Produto ---
        if(e.target.closest('.btn-delete-prod')) {
            const id = e.target.closest('.btn-delete-prod').dataset.id;
            deletarProduto(id, e.target.closest('tr'));
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

        // --- Editar Filtro (Marca/Cat) ---
        if(e.target.closest('.btn-edit-filtro')) {
            const btn = e.target.closest('.btn-edit-filtro');
            editarFiltro(btn.dataset.colecao, btn.dataset.id, btn.dataset.nome);
        }
    });
});

/* ============================================================
   LÓGICA: GERENCIAR FILTROS (MARCAS E CATEGORIAS)
   ============================================================ */
async function carregarFiltrosAdmin() {
    try {
        // Busca Marcas
        const snapMarcas = await getDocs(collection(db, "marcas"));
        let marcas = [];
        snapMarcas.forEach(doc => { marcas.push({ id: doc.id, nome: doc.data().nome }); });
        marcas.sort((a, b) => a.nome.localeCompare(b.nome)); 

        // Busca Categorias
        const snapCat = await getDocs(collection(db, "categorias"));
        let categorias = [];
        snapCat.forEach(doc => { categorias.push({ id: doc.id, nome: doc.data().nome }); });
        categorias.sort((a, b) => a.nome.localeCompare(b.nome));

        // Renderiza nas listas do painel
        renderizarListaGestao('listaMarcasAdmin', marcas, 'marcas');
        renderizarListaGestao('listaCategoriasAdmin', categorias, 'categorias');

        // Preenche os SELECTS do formulário de produto
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
        ul.innerHTML += `
            <li style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #eee;">
                <span>${item.nome}</span>
                <div>
                    <button class="btn-edit-filtro" data-colecao="${colecao}" data-id="${item.id}" data-nome="${item.nome}" style="color:#007bff; background:none; border:none; cursor:pointer; margin-right: 15px; font-size: 1.1em;" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete-filtro" data-colecao="${colecao}" data-id="${item.id}" style="color:#dc3545; background:none; border:none; cursor:pointer; font-size: 1.1em;" title="Excluir">
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

    if (!nome) {
        alert("Por favor, digite um nome antes de adicionar!");
        return input.focus();
    }

    try {
        await addDoc(collection(db, colecao), { 
            nome: nome 
        });
        
        input.value = "";
        carregarFiltrosAdmin(); // Atualiza a tela imediatamente
    } catch (e) {
        console.error(e);
        alert("Erro ao adicionar no banco de dados.");
    }
}

async function editarFiltro(colecao, idDoc, nomeAtual) {
    const novoNome = prompt(`Editar nome (${colecao === 'marcas' ? 'Marca' : 'Categoria'}):`, nomeAtual);
    
    // Se cancelar ou mandar igual/vazio, cancela a ação
    if(novoNome === null || novoNome.trim() === "" || novoNome.trim() === nomeAtual) {
        return; 
    }

    try {
        await updateDoc(doc(db, colecao, idDoc), { 
            nome: novoNome.trim() 
        });
        carregarFiltrosAdmin();
    } catch (error) {
        console.error("Erro na edição: ", error);
        alert("Erro ao salvar a edição.");
    }
}

async function removerFiltro(colecao, idDoc) {
    if(!confirm(`Tem certeza que deseja excluir permanentemente esta opção?`)) return;

    try {
        await deleteDoc(doc(db, colecao, idDoc));
        carregarFiltrosAdmin();
    } catch (e) {
        console.error(e);
        alert("Erro ao remover do banco de dados.");
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
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        btn.disabled = true;

        const nome = document.getElementById('nome').value.trim();
        const cod = document.getElementById('cod').value.trim();
        const marca = document.getElementById('marca').value;
        const categoria = document.getElementById('categoria').value;
        const precoRaw = document.getElementById('preco').value.replace(',', '.'); // Suporte a vírgula
        const preco = parseFloat(precoRaw) || 0; // Se ficar vazio vira 0 (Sob consulta)
        
        if(!nome) throw new Error("O nome do produto é obrigatório.");
        if(!marca || !categoria) throw new Error("Selecione uma Marca e uma Categoria!");

        const descElement = document.getElementById('desc-produto');
        const descricao = descElement && descElement.value.trim() !== "" ? descElement.value : "Sem descrição técnica.";

        const arquivoInput = document.getElementById('arquivoImagem');
        if (arquivoInput.files.length === 0) throw new Error("Selecione uma foto para o produto!");

        // === CAPTURAR QUAIS VITRINES FORAM MARCADAS ===
        const vitrinesSelecionadas = [];
        const checkboxesVitrines = document.querySelectorAll('input[name="vitrines"]:checked');
        checkboxesVitrines.forEach((checkbox) => {
            vitrinesSelecionadas.push(checkbox.value);
        });

        // Upload da foto
        const arquivo = arquivoInput.files[0];
        const storageRef = ref(storage, `produtos/${Date.now()}_${arquivo.name}`);
        await uploadBytes(storageRef, arquivo);
        const urlFoto = await getDownloadURL(storageRef);

        // Salvar no banco de dados
        await addDoc(prodCollection, {
            nome: nome,
            cod: cod,
            marca: marca,
            categoria: categoria,
            preco: preco,
            descricao: descricao, 
            img: urlFoto, 
            vitrines: vitrinesSelecionadas, // Salvando a lista de vitrines
            data_cadastro: new Date()
        });

        alert("Produto cadastrado com sucesso!");
        document.getElementById("formProduto").reset();
        
        carregarProdutos(); // Recarrega a tabela

    } catch (error) {
        console.error("Erro ao cadastrar:", error);
        alert(error.message);
    } finally {
        btn.innerHTML = txtOriginal;
        btn.disabled = false;
    }
}

async function carregarProdutos() {
    const tbody = document.getElementById("tabelaProdutos");
    if(!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Carregando produtos...</td></tr>';

    try {
        const querySnapshot = await getDocs(prodCollection);
        tbody.innerHTML = "";

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum produto cadastrado no sistema.</td></tr>';
            return;
        }

        querySnapshot.forEach((docItem) => {
             const p = docItem.data();
             const valorFormatado = p.preco > 0 ? `R$ ${p.preco.toFixed(2).replace('.', ',')}` : "Sob Consulta";
             
             // Identificar as vitrines para mostrar na tabela
             let vitrinesBadge = "";
             if (p.vitrines && p.vitrines.length > 0) {
                 vitrinesBadge = `<br><small style="color:#ff6600; font-weight:bold;"><i class="fas fa-star" style="font-size:0.8em;"></i> Vitrines: ${p.vitrines.join(', ')}</small>`;
             }

             tbody.innerHTML += `
                 <tr style="border-bottom: 1px solid #eee;">
                     <td style="padding:10px;"><img src="${p.img || p.imagem}" style="width:50px; height:50px; object-fit:cover; border-radius:4px; border:1px solid #ddd;"></td>
                     <td><strong>${p.nome}</strong><br><small style="color:#777;">Cód: ${p.cod || '--'}</small>${vitrinesBadge}</td>
                     <td>${p.marca}<br><small style="color:#777;">${p.categoria}</small></td>
                     <td style="color:green; font-weight:bold;">${valorFormatado}</td>
                     <td>
                         <button class="btn-delete-prod" data-id="${docItem.id}" title="Excluir Produto" style="background:#dc3545; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">
                             <i class="fas fa-trash"></i>
                         </button>
                     </td>
                 </tr>
             `;
        });
    } catch(error) {
        console.error("Erro ao carregar produtos:", error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Erro ao carregar lista.</td></tr>';
    }
}

async function deletarProduto(id, rowElement) {
    if(confirm("ATENÇÃO: Deseja realmente excluir este produto? A ação não pode ser desfeita.")) {
        try {
            rowElement.style.opacity = "0.5"; // Efeito visual de loading
            await deleteDoc(doc(db, "produtos", id));
            rowElement.remove();
        } catch (error) {
            console.error(error);
            alert("Erro ao excluir: " + error.message);
            rowElement.style.opacity = "1";
        }
    }
}

/* ============================================================
   LÓGICA DE BANNERS DO SITE
   ============================================================ */
async function adicionarBanner() {
    const input = document.getElementById("arquivoBanner");
    const btn = document.getElementById("btnUploadBanner");
    
    if(!input || !input.files || input.files.length === 0) {
        alert("Por favor, selecione a imagem do banner no seu computador!");
        return;
    }

    try {
        if(btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            btn.disabled = true;
        }
        
        const file = input.files[0];
        const storageRef = ref(storage, `banners/${Date.now()}_${file.name.replace(/\s/g, '')}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        const docRef = doc(db, "configuracoes", "banner_site");
        const docSnap = await getDoc(docRef);
        
        let listaAtual = [];
        if (docSnap.exists() && docSnap.data() && docSnap.data().listaBanners) {
            listaAtual = docSnap.data().listaBanners;
        }

        listaAtual.push({
            img: url,
            criadoEm: Date.now()
        });

        await setDoc(docRef, { listaBanners: listaAtual }, { merge: true });

        alert("Banner adicionado ao site com sucesso!");
        input.value = ""; 
        carregarBannersAdmin(); 

    } catch (error) {
        console.error("Erro banner:", error);
        alert("Erro ao enviar banner. Verifique as permissões de Storage do Firebase.");
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

    container.innerHTML = "<p>Carregando lista de banners...</p>";

    try {
        const docRef = doc(db, "configuracoes", "banner_site");
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists() || !docSnap.data() || !docSnap.data().listaBanners || docSnap.data().listaBanners.length === 0) {
            container.innerHTML = "<p style='padding:15px; background:#f9f9f9; text-align:center; color:#777; border-radius:4px;'>Nenhum banner ativo no site. Adicione um acima.</p>";
            return;
        }

        const banners = docSnap.data().listaBanners;
        container.innerHTML = ""; 

        banners.forEach((banner, index) => {
            container.innerHTML += `
                <div style="display: flex; align-items: center; justify-content: space-between; background: #fff; padding: 15px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <span style="font-weight:bold; color:#ff6600; font-size: 1.2em;">#${index + 1}</span>
                        <img src="${banner.img}" style="height: 60px; width: 150px; object-fit: cover; border-radius: 4px; border: 1px solid #ccc;">
                        <div>
                            <small style="color:#999;">Banner visível no site</small>
                        </div>
                    </div>
                    <button class="btn-delete-banner" data-index="${index}" style="background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                        <i class="fas fa-trash"></i> Remover
                    </button>
                </div>
            `;
        });

    } catch (error) {
        console.error("Erro ao carregar banners:", error);
        container.innerHTML = "<p style='color:red;'>Erro ao carregar sistema de banners.</p>";
    }
}

async function removerBanner(index) {
    if(!confirm("Tem certeza que deseja remover este banner do carrossel do site?")) return;

    try {
        const docRef = doc(db, "configuracoes", "banner_site");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            let lista = docSnap.data().listaBanners || [];
            lista.splice(index, 1);
            await updateDoc(docRef, { listaBanners: lista });
            carregarBannersAdmin(); // Recarrega os banners
        }
    } catch (error) {
        console.error("Erro ao remover banner:", error);
        alert("Erro ao remover banner do sistema.");
    }
}