/* =========================================
   MAIN.JS - DADOS E FUNÇÕES GLOBAIS (CORRIGIDO)
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

// Variável Global para controlar o fluxo Marca -> Categoria
let marcaAtualSelecionada = "";

// 2. LÓGICA DO CARRINHO (Compartilhada)
let carrinho = JSON.parse(localStorage.getItem('dispemaq_carrinho')) || [];

function atualizarBadge() {
    const badges = document.querySelectorAll('.badge-carrinho, #badgeCarrinho'); // Suporta classe ou ID
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

// 3. FUNÇÕES GLOBAIS DE INTERFACE (Acessíveis pelo HTML)
function fecharModalCategorias() {
    const modal = document.getElementById('modalCategorias');
    if(modal) modal.style.display = 'none';
}

function abrirModal(id) {
    const modal = document.getElementById(id);
    if(modal) modal.classList.add('ativo');
}

function fecharModal(id) {
    const modal = document.getElementById(id);
    if(modal) modal.classList.remove('ativo');
}

/* =========================================
   INICIALIZAÇÃO DO SITE (DOMContentLoaded)
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    
    // A. Inicializa Carrinho
    atualizarBadge();

    // B. Menu Mobile
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

    // D. Renderizar DESTAQUES na Home (Se existir a div)
    const containerDestaques = document.getElementById('gradeDestaques');
    if (containerDestaques) {
        // Pega os 4 primeiros
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
       E. LÓGICA DO MENU DROPDOWN "VER MAIS MARCAS" (Posicionamento)
       ----------------------------------------------------------- */
    const btnMarcas = document.getElementById("btnMarcas");
    const menuMarcas = document.getElementById("menuMarcas");

    if (btnMarcas && menuMarcas) {
        // Função para calcular posição
        const posicionarMenu = () => {
            const rect = btnMarcas.getBoundingClientRect();
            menuMarcas.style.top = (rect.bottom + 5) + "px";
            
            // Ajuste para não sair da tela
            if (rect.left + 220 > window.innerWidth) {
                menuMarcas.style.left = "auto";
                menuMarcas.style.right = "10px";
            } else {
                menuMarcas.style.left = rect.left + "px";
                menuMarcas.style.right = "auto";
            }
        };

        btnMarcas.addEventListener("click", (e) => {
            e.stopPropagation();
            const estaVisivel = menuMarcas.style.display === "block";
            if (!estaVisivel) {
                posicionarMenu(); // Calcula antes de mostrar
                menuMarcas.style.display = "block";
            } else {
                menuMarcas.style.display = "none";
            }
        });

        // Fechar dropdown ao rolar a página
        window.addEventListener('scroll', () => {
            if(menuMarcas.style.display === 'block') menuMarcas.style.display = "none";
        });
    }

    /* -----------------------------------------------------------
       F. LÓGICA: CLIQUE NA MARCA -> ABRIR MODAL CATEGORIAS
       ----------------------------------------------------------- */
    const botoesMarca = document.querySelectorAll('.item-marca, .marca-item');
    const modalCat = document.getElementById('modalCategorias');
    const tituloModal = document.getElementById('tituloMarcaModal');

    // 1. Clique nas marcas (da barra ou do menu)
    botoesMarca.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); 
            e.stopPropagation();

            // Identifica a marca
            let marca = btn.getAttribute('data-marca');
            if (!marca) {
                marca = btn.innerText.trim().toLowerCase().replace(/\s+/g, '-');
            }
            
            marcaAtualSelecionada = marca;

            // Abre o modal
            if(tituloModal) tituloModal.innerText = `Peças para ${marca.toUpperCase()}`;
            if(modalCat) modalCat.style.display = 'flex';
            
            // Fecha o menu dropdown se estiver aberto
            if(menuMarcas) menuMarcas.style.display = 'none';
        });
    });

    // 2. Clique nas categorias (dentro do modal)
    const botoesCategoria = document.querySelectorAll('.btn-cat-escolha');
    botoesCategoria.forEach(btn => {
        btn.addEventListener('click', () => {
            const categoria = btn.getAttribute('data-cat');
            
            let urlDestino = `loja.html?marca=${marcaAtualSelecionada}`;
            if (categoria !== 'todas') {
                urlDestino += `&cat=${categoria}`;
            }
            window.location.href = urlDestino;
        });
    });
});

// Fechar modal de categorias ao clicar fora (Global)
window.addEventListener('click', (e) => {
    const modal = document.getElementById('modalCategorias');
    const btnMarcas = document.getElementById("btnMarcas");
    const menuMarcas = document.getElementById("menuMarcas");

    // Fecha modal de categoria
    if (e.target === modal) {
        fecharModalCategorias();
    }

    // Fecha dropdown de marcas se clicar fora
    if (btnMarcas && menuMarcas) {
        if (!btnMarcas.contains(e.target) && !menuMarcas.contains(e.target)) {
            menuMarcas.style.display = "none";
        }
    }
});