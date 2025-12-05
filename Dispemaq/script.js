/* ===================================
   MENU MOBILE - BOTÃO HAMBÚRGUER
   =================================== */

// Pega os elementos do menu pelo ID
const botaoMenuMobile = document.getElementById('botaoMenuMobile');
const listaMenu = document.getElementById('listaMenu');

// Quando clicar no botão, abre/fecha o menu
botaoMenuMobile.addEventListener('click', () => {
    // Adiciona ou remove a classe 'active' (alterna)
    botaoMenuMobile.classList.toggle('active');
    listaMenu.classList.toggle('active');
});


/* ===================================
   FECHAR MENU AO CLICAR EM UM LINK
   =================================== */

// Pega todos os links do menu
const linksMenu = document.querySelectorAll('.lista-menu a');

// Para cada link do menu
linksMenu.forEach(link => {
    // Quando clicar, fecha o menu
    link.addEventListener('click', () => {
        botaoMenuMobile.classList.remove('active');
        listaMenu.classList.remove('active');
    });
});


/* ===================================
   ROLAGEM SUAVE PARA SEÇÕES
   =================================== */

// Pega todos os links que começam com # (links internos)
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function (evento) {
        // Evita o comportamento padrão do link
        evento.preventDefault();
        
        // Pega o elemento de destino pelo ID
        const destino = document.querySelector(this.getAttribute('href'));
        
        // Se o destino existe
        if (destino) {
            // Calcula a posição considerando o cabeçalho fixo
            const alturaHeader = 100;
            const posicaoElemento = destino.getBoundingClientRect().top;
            const posicaoFinal = posicaoElemento + window.pageYOffset - alturaHeader;

            // Rola suavemente até a posição
            window.scrollTo({
                top: posicaoFinal,
                behavior: 'smooth'
            });
        }
    });
});


/* ===================================
   EFEITO DE ESCONDER/MOSTRAR HEADER AO ROLAR
   =================================== */

let ultimaRolagem = 0;
const cabecalho = document.querySelector('.cabecalho');

window.addEventListener('scroll', () => {
    // Pega a posição atual da rolagem
    const rolagemAtual = window.pageYOffset;
    
    // Se está no topo da página
    if (rolagemAtual <= 0) {
        cabecalho.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        return;
    }
    
    // Se está rolando para baixo e já rolou mais de 100px
    if (rolagemAtual > ultimaRolagem && rolagemAtual > 100) {
        // Esconde o header
        cabecalho.style.transform = 'translateY(-100%)';
    } else {
        // Mostra o header
        cabecalho.style.transform = 'translateY(0)';
        cabecalho.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
    }
    
    // Atualiza a última posição de rolagem
    ultimaRolagem = rolagemAtual;
});


/* ===================================
   ANIMAÇÃO DOS CARDS AO ROLAR A PÁGINA
   =================================== */

// Configurações do observador
const opcoesObservador = {
    threshold: 0.1,  // Ativa quando 10% do elemento está visível
    rootMargin: '0px 0px -50px 0px'  // Margem para ativar antes
};

// Cria um observador para animar elementos
const observador = new IntersectionObserver((elementos) => {
    elementos.forEach(elemento => {
        // Se o elemento está visível na tela
        if (elemento.isIntersecting) {
            // Torna visível com animação
            elemento.target.style.opacity = '1';
            elemento.target.style.transform = 'translateY(0)';
        }
    });
}, opcoesObservador);

// Pega todos os cards que serão animados
const elementosAnimados = document.querySelectorAll('.card-peca, .card-contato, .card-estatistica, .caixa-info');

// Para cada elemento
elementosAnimados.forEach(elemento => {
    // Define estado inicial (invisível e deslocado para baixo)
    elemento.style.opacity = '0';
    elemento.style.transform = 'translateY(30px)';
    elemento.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    // Observa o elemento
    observador.observe(elemento);
});


/* ===================================
   ANIMAÇÃO DE CONTAGEM NOS NÚMEROS
   =================================== */

// Pega todos os números de estatística
const numerosEstatistica = document.querySelectorAll('.card-estatistica h4');

// Função que anima a contagem de um número
const animarContagem = (elemento) => {
    const textoCompleto = elemento.textContent;
    const temNumero = /\d+/.test(textoCompleto);
    
    // Se não tem número, não anima
    if (!temNumero) return;
    
    // Extrai o número e o sufixo (ex: "12" e "+")
    const numero = parseInt(textoCompleto.match(/\d+/)[0]);
    const sufixo = textoCompleto.replace(/\d+/, '');
    const duracao = 2000;  // 2 segundos
    const incremento = numero / (duracao / 16);  // 60 FPS
    let numeroAtual = 0;
    
    // Cria um timer para animar
    const timer = setInterval(() => {
        numeroAtual += incremento;
        if (numeroAtual >= numero) {
            // Chegou no número final
            elemento.textContent = numero + sufixo;
            clearInterval(timer);
        } else {
            // Atualiza com o número arredondado
            elemento.textContent = Math.floor(numeroAtual) + sufixo;
        }
    }, 16);  // Atualiza a cada 16ms (60 FPS)
};

// Observador para as estatísticas
const observadorEstatisticas = new IntersectionObserver((elementos) => {
    elementos.forEach(elemento => {
        if (elemento.isIntersecting) {
            // Anima o número e para de observar
            animarContagem(elemento.target);
            observadorEstatisticas.unobserve(elemento.target);
        }
    });
}, { threshold: 0.5 });  // Ativa quando 50% está visível

// Observa cada número de estatística
numerosEstatistica.forEach(numero => observadorEstatisticas.observe(numero));


/* ===================================
   LAZY LOAD DE IMAGENS (CARREGAMENTO PREGUIÇOSO)
   =================================== */

// Pega todas as imagens com data-src (carregamento adiado)
const imagensLazy = document.querySelectorAll('img[data-src]');

const observadorImagens = new IntersectionObserver((elementos) => {
    elementos.forEach(elemento => {
        if (elemento.isIntersecting) {
            const imagem = elemento.target;
            // Troca o data-src pelo src (carrega a imagem)
            imagem.src = imagem.dataset.src;
            imagem.removeAttribute('data-src');
            observadorImagens.unobserve(imagem);
        }
    });
});

// Observa cada imagem
imagensLazy.forEach(imagem => observadorImagens.observe(imagem));


/* ===================================
   DESTACAR ITEM DO MENU ATIVO
   =================================== */

// Pega o hash da URL (ex: #inicio)
const localizacaoAtual = window.location.hash;

// Se existe um hash na URL
if (localizacaoAtual) {
    linksMenu.forEach(link => {
        // Se o link corresponde ao hash atual
        if (link.getAttribute('href') === localizacaoAtual) {
            link.style.color = 'var(--cor-secundaria)';
        }
    });
}


/* ===================================
   BOTÃO VOLTAR AO TOPO
   =================================== */

// Cria o botão de voltar ao topo
let botaoTopo = document.createElement('button');
botaoTopo.innerHTML = '<i class="fas fa-arrow-up"></i>';
botaoTopo.className = 'botao-topo';
botaoTopo.style.cssText = `
    position: fixed;
    bottom: 100px;
    right: 30px;
    width: 50px;
    height: 50px;
    background: var(--cor-primaria);
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    z-index: 998;
    font-size: 1.2rem;
    box-shadow: 0 4px 15px rgba(26, 35, 126, 0.4);
`;

// Adiciona o botão no body
document.body.appendChild(botaoTopo);

// Mostra/esconde o botão conforme a rolagem
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        // Mostra o botão
        botaoTopo.style.opacity = '1';
        botaoTopo.style.visibility = 'visible';
    } else {
        // Esconde o botão
        botaoTopo.style.opacity = '0';
        botaoTopo.style.visibility = 'hidden';
    }
});

// Quando clicar no botão, volta ao topo
botaoTopo.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Efeitos ao passar o mouse no botão
botaoTopo.addEventListener('mouseenter', () => {
    botaoTopo.style.transform = 'scale(1.1)';
    botaoTopo.style.background = 'var(--cor-secundaria)';
});

botaoTopo.addEventListener('mouseleave', () => {
    botaoTopo.style.transform = 'scale(1)';
    botaoTopo.style.background = 'var(--cor-primaria)';
});


/* ===================================
   ANIMAÇÃO DE CARREGAMENTO DA PÁGINA
   =================================== */

window.addEventListener('load', () => {
    // Começa invisível
    document.body.style.opacity = '0';
    setTimeout(() => {
        // Fade in suave da página
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
});


/* ===================================
   FECHAR MENU AO CLICAR FORA DELE
   =================================== */

document.addEventListener('click', (evento) => {
    // Se clicou fora do menu e o menu está aberto
    if (!evento.target.closest('.menu-navegacao') && listaMenu.classList.contains('active')) {
        botaoMenuMobile.classList.remove('active');
        listaMenu.classList.remove('active');
    }
});

// Impede que clique no botão feche o menu
botaoMenuMobile.addEventListener('click', (evento) => {
    evento.stopPropagation();
});


/* ===================================
   EFEITO DE CARREGAMENTO NOS BOTÕES DO WHATSAPP
   =================================== */

document.querySelectorAll('.botao').forEach(botao => {
    // Se o botão é um link do WhatsApp
    if (botao.href && botao.href.includes('whatsapp')) {
        botao.addEventListener('click', (evento) => {
            const textoOriginal = botao.innerHTML;
            // Mostra loading
            botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Abrindo...';
            botao.style.pointerEvents = 'none';
            
            // Volta ao normal depois de 2 segundos
            setTimeout(() => {
                botao.innerHTML = textoOriginal;
                botao.style.pointerEvents = 'auto';
            }, 2000);
        });
    }
});


/* ===================================
   EFEITO DE HOVER PERSONALIZADO NOS CARDS
   =================================== */

document.querySelectorAll('.card-peca, .card-contato').forEach(card => {
    // Ao entrar com o mouse
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-10px) scale(1.02)';
    });
    
    // Ao sair com o mouse
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});


/* ===================================
   MENSAGEM DE BOAS-VINDAS NO CONSOLE
   =================================== */

console.log('%c🔧 Dispemaq - Peças para Máquinas Pesadas', 'color: #1a237e; font-size: 20px; font-weight: bold;');
console.log('%cSite desenvolvido com HTML, CSS e JavaScript', 'color: #ffa000; font-size: 14px;');
console.log('%c📞 Contato: +55 49 98427-6503', 'color: #00897b; font-size: 14px;');


/* ===================================
   MONITORAMENTO DE PERFORMANCE (OPCIONAL)
   =================================== */

if ('performance' in window) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            // Pega dados de performance do navegador
            const dadosPerformance = performance.getEntriesByType('navigation')[0];
            const tempoCarregamento = Math.round(dadosPerformance.loadEventEnd - dadosPerformance.fetchStart);
            console.log(`⚡ Página carregada em ${tempoCarregamento}ms`);
        }, 0);
    });
}