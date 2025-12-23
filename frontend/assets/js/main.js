/* =========================================
   MAIN.JS - COMPLETO E ATUALIZADO
   ========================================= */

// 1. BANCO DE DADOS DE PRODUTOS
const produtos = [
    { id: 1, nome: "Filtro de Óleo Motor Caterpillar", cod: "CAT-1R0716", categoria: "filtros", preco: 145.90, img: "./assets/placeholder.jpg", marca: "caterpillar", desc: "Filtro de alta eficiência para motores CAT séries 300 e 900." },
    { id: 2, nome: "Bomba Hidráulica Principal", cod: "HYD-9920", categoria: "hidraulica", preco: 2350.00, img: "./assets/placeholder.jpg", marca: "komatsu", desc: "Bomba de pistão axial para escavadeiras Komatsu PC200." },
    { id: 3, nome: "Alternador 24V 60A", cod: "EL-2460", categoria: "eletrica", preco: 890.00, img: "./assets/placeholder.jpg", marca: "volvo-michigan", desc: "Alternador blindado resistente a poeira e vibração." },
    { id: 4, nome: "Kit Vedação Cilindro Lança", cod: "VED-5500", categoria: "hidraulica", preco: 320.50, img: "./assets/placeholder.jpg", marca: "case", desc: "Kit completo de reparo para cilindro hidráulico." },
    { id: 5, nome: "Motor de Partida 12 Dentes", cod: "MOT-12D", categoria: "motor", preco: 1200.00, img: "./assets/placeholder.jpg", marca: "cummins", desc: "Arranque reforçado para motores Cummins série B." },
    { id: 6, nome: "Dente de Caçamba Escavadeira", cod: "FPS-220", categoria: "fps", preco: 180.00, img: "./assets/placeholder.jpg", marca: "jcb", desc: "Dente forjado de alta resistência a abrasão." },
    { id: 7, nome: "Filtro de Ar Externo", cod: "FIL-AR-01", categoria: "filtros", preco: 210.00, img: "./assets/placeholder.jpg", marca: "caterpillar", desc: "Elemento filtrante primário radial seal." },
    { id: 8, nome: "Correia Ventilador", cod: "COR-8890", categoria: "motor", preco: 85.00, img: "./assets/placeholder.jpg", marca: "new-holland", desc: "Correia em V dentada industrial." },
    { id: 9, nome: "Disco de Freio Sinterizado", cod: "FRE-500", categoria: "freios", preco: 450.00, img: "./assets/placeholder.jpg", marca: "cnh-fiatitallis", desc: "Disco de fricção para transmissão e freio úmido." },
    { id: 10, nome: "Farol de Led Trabalho", cod: "LUZ-LED", categoria: "eletrica", preco: 150.00, img: "./assets/placeholder.jpg", marca: "universal", desc: "Farol de milha LED quadrado 48W bivolt." },
    { id: 11, nome: "Cruzeta Cardan Transmissão", cod: "TRA-900", categoria: "transmissao", preco: 290.00, img: "./assets/placeholder.jpg", marca: "massey", desc: "Cruzeta blindada série 1000." },
    { id: 12, nome: "Sensor de Pressão Óleo", cod: "SEN-01", categoria: "eletrica", preco: 120.00, img: "./assets/placeholder.jpg", marca: "caterpillar", desc: "Sensor interruptor de pressão 3 pinos." },
];

// Variável para saber qual marca o usuário clicou por último
let marcaSelecionadaAtual = "";

// 2. LÓGICA DO CARRINHO
let carrinho = JSON.parse(localStorage.getItem('dispemaq_carrinho')) || [];

function atualizarBadge() {
    const badges = document.querySelectorAll('.badge-carrinho, #badgeCarrinho'); 
    const totalItens = carrinho.reduce((acc, item) => acc + item.qtd, 0);
    
    badges.forEach(b => {
        b.innerText = totalItens;
        b.style.display = totalItens > 0 ? 'flex' : 'none';
    });
    localStorage.setItem('dispemaq_carrinho', JSON.stringify(carrinho));
}

function adicionarAoCarrinho(idProduto) {
    const produto = produtos.find(p => p.id === idProduto);
    if (!produto) return;

    const itemExistente = carrinho.find(item => item.id === idProduto);
    if (itemExistente) {
        itemExistente.qtd++;
    } else {
        carrinho.push({ ...produto, qtd: 1 });
    }
    
    atualizarBadge();
    alert(`"${produto.nome}" adicionado ao carrinho!`);
}

/* =========================================
   INICIALIZAÇÃO (QUANDO A PÁGINA CARREGA)
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    
    // A. Inicializa Carrinho
    atualizarBadge();

    // B. Menu Mobile (Hambúrguer)
    const btnMenu = document.getElementById('botaoMenuMobile');
    const navMenu = document.getElementById('menuNavegacao');
    if (btnMenu && navMenu) {
        btnMenu.addEventListener('click', () => {
            navMenu.classList.toggle('ativo');
            btnMenu.classList.toggle('ativo');
        });
    }

    // C. Busca Global
    const btnBuscar = document.getElementById('botaoBuscar');
    const inputBusca = document.getElementById('campoBusca');
    
    function realizarBusca() {
        const termo = inputBusca.value.trim().toLowerCase();
        if (termo) {
            window.location.href = `loja.html?busca=${encodeURIComponent(termo)}`;
        }
    }

    if (btnBuscar && inputBusca) {
        btnBuscar.addEventListener('click', realizarBusca);
        inputBusca.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') realizarBusca();
        });
    }

    // D. Renderizar Destaques (Se houver a div na Home)
    const containerDestaques = document.getElementById('gradeDestaques');
    if (containerDestaques) {
        const destaques = produtos.slice(0, 4);
        containerDestaques.innerHTML = destaques.map(p => `
            <div class="card-produto" style="border: 1px solid #eee; padding: 15px; border-radius: 8px; text-align: center;">
                <img src="${p.img}" alt="${p.nome}" style="width: 100%; height: 160px; object-fit: contain; margin-bottom: 10px;">
                <h3 style="font-size: 0.95rem; color: #333; margin-bottom: 5px; height: 40px; overflow: hidden;">${p.nome}</h3>
                <div style="color: #1e3a8a; font-weight: bold; font-size: 1.1rem; margin-bottom: 10px;">
                    R$ ${p.preco.toFixed(2).replace('.', ',')}
                </div>
                <button onclick="adicionarAoCarrinho(${p.id})" style="background: #1e3a8a; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; width: 100%;">
                    Comprar
                </button>
            </div>
        `).join('');
    }

    /* -----------------------------------------------------------
       E. DROPDOWN "VER MAIS MARCAS" (Botão Fixo à Direita)
       ----------------------------------------------------------- */
    const btnMaisMarcas = document.getElementById('btnMarcas');
    const menuMaisMarcas = document.getElementById('menuMarcas');

    if (btnMaisMarcas && menuMaisMarcas) {
        btnMaisMarcas.addEventListener('click', (e) => {
            e.stopPropagation(); // Impede fechar ao clicar
            menuMaisMarcas.classList.toggle('mostrar');
            btnMaisMarcas.classList.toggle('ativo');
        });
    }

    /* -----------------------------------------------------------
       F. NOVO: MENU FLUTUANTE DE CATEGORIAS (Abre ao clicar na Marca)
       ----------------------------------------------------------- */
    const menuCategorias = document.getElementById('menuCategoriasFlutuante');
    const tituloMenuCat = document.getElementById('tituloMarcaDropdown');
    
    // Seleciona botões da barra e também os de dentro do "Ver mais marcas"
    const botoesMarca = document.querySelectorAll('.item-marca, .marca-item');

    // Função para abrir o menu na posição correta
    function abrirMenuCategorias(e, nomeMarca) {
        e.preventDefault();
        e.stopPropagation();

        // 1. Salva a marca atual e atualiza o título
        marcaSelecionadaAtual = nomeMarca; 
        if(tituloMenuCat) tituloMenuCat.textContent = nomeMarca.toUpperCase();

        // 2. Cálculos de Posição
        const botao = e.currentTarget;
        const rect = botao.getBoundingClientRect(); // Pega X e Y do botão clicado
        
        let top = rect.bottom + window.scrollY; // Logo abaixo do botão
        let left = rect.left + window.scrollX;  // Alinhado à esquerda do botão

        // Ajuste: Se o menu for sair da tela na direita, alinha pela direita
        if (left + 280 > window.innerWidth) {
            left = (rect.right + window.scrollX) - 280;
        }

        // 3. Aplica posição e mostra
        if(menuCategorias) {
            menuCategorias.style.top = `${top + 5}px`;
            menuCategorias.style.left = `${left}px`;
            menuCategorias.style.display = 'block';
        }

        // Esconde o menu de "Ver mais marcas" se estiver aberto
        if(menuMaisMarcas) menuMaisMarcas.classList.remove('mostrar');
    }

    // Adiciona o evento de clique em CADA marca
    botoesMarca.forEach(btn => {
        btn.addEventListener('click', (evento) => {
            // Tenta pegar o nome do atributo data-marca, senão pega do texto
            const marca = btn.getAttribute('data-marca') || btn.innerText.trim();
            abrirMenuCategorias(evento, marca);
        });
    });

    // Evento de clique nos itens DO menu de categorias (Motor, Hidráulica, etc)
    const itensCategoria = document.querySelectorAll('.item-cat-dropdown');
    itensCategoria.forEach(item => {
        item.addEventListener('click', () => {
            const cat = item.getAttribute('data-cat');
            
            // Redireciona para a loja com Marca + Categoria
            let url = `loja.html?marca=${marcaSelecionadaAtual}`;
            if (cat !== 'todas') {
                url += `&cat=${cat}`;
            }
            window.location.href = url;
        });
    });

    /* -----------------------------------------------------------
       G. FECHAR MENUS AO CLICAR FORA
       ----------------------------------------------------------- */
    document.addEventListener('click', (e) => {
        // Fechar Menu de Categorias Flutuante
        if (menuCategorias && menuCategorias.style.display === 'block') {
            if (!menuCategorias.contains(e.target)) {
                menuCategorias.style.display = 'none';
            }
        }

        // Fechar Menu "Ver Mais Marcas"
        if (menuMaisMarcas && menuMaisMarcas.classList.contains('mostrar')) {
            if (!btnMaisMarcas.contains(e.target) && !menuMaisMarcas.contains(e.target)) {
                menuMaisMarcas.classList.remove('mostrar');
                btnMaisMarcas.classList.remove('ativo');
            }
        }
    });

    // Fechar ao rolar a página (opcional, mas recomendado para menus flutuantes)
    window.addEventListener('scroll', () => {
        if (menuCategorias) menuCategorias.style.display = 'none';
        if (menuMaisMarcas) menuMaisMarcas.classList.remove('mostrar');
    });

});