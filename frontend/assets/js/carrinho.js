/* =========================================
   CARRINHO.JS - LÓGICA DA PÁGINA DE CARRINHO
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    const carrinhoContainer = document.getElementById('carrinhoConteudo');
    
    // Só executa se estiver na página do carrinho
    if (!carrinhoContainer) return;

    renderizarCarrinhoPage();

    // Botão Finalizar Compra (WhatsApp)
    const btnFinalizar = document.getElementById('finalizarCompra');
    if(btnFinalizar) {
        btnFinalizar.addEventListener('click', () => {
            if(carrinho.length === 0) return alert('Seu carrinho está vazio!');
            
            let msg = "Olá Dispemaq! Gostaria de finalizar o seguinte pedido:\n\n";
            let total = 0;
            carrinho.forEach(item => {
                msg += `* ${item.nome}\n   Qtd: ${item.qtd} | Cód: ${item.cod}\n`;
                total += item.preco * item.qtd;
            });
            msg += `\n*Valor Total: R$ ${total.toFixed(2).replace('.', ',')}*`;
            msg += `\n\nAguardo confirmação de estoque e frete.`;
            
            window.open(`https://api.whatsapp.com/send/?phone=5549984276503&text=${encodeURIComponent(msg)}`, '_blank');
        });
    }
});

function renderizarCarrinhoPage() {
    const container = document.getElementById('carrinhoConteudo');
    const totalEl = document.getElementById('carrinhoTotal');
    
    if (carrinho.length === 0) {
        container.innerHTML = `
            <div class="carrinho-vazio">
                <i class="fas fa-shopping-cart" style="font-size: 4rem; color: #e0e0e0; margin-bottom: 20px;"></i>
                <p style="font-size: 1.2rem; color: #666;">Seu carrinho está vazio.</p>
                <a href="loja.html" class="botao botao-primario" style="margin-top:20px; display:inline-block;">Ir para Loja</a>
            </div>`;
        totalEl.innerText = "R$ 0,00";
        return;
    }

    container.innerHTML = "";
    let total = 0;

    carrinho.forEach((item, index) => {
        const subtotal = item.preco * item.qtd;
        total += subtotal;
        
        container.innerHTML += `
            <div class="item-carrinho">
                <div style="display:flex; align-items:center; gap:15px; flex: 1;">
                    <img src="${item.img}" alt="${item.nome}" style="width: 70px; height: 70px; object-fit: cover; border: 1px solid #eee;">
                    <div>
                        <strong style="display:block; color: #111; margin-bottom: 4px;">${item.nome}</strong>
                        <span style="font-size:0.8rem; color:#777; background: #eee; padding: 2px 6px; border-radius: 4px;">Cód: ${item.cod}</span>
                    </div>
                </div>
                
                <div style="text-align:right; min-width: 120px;">
                    <div style="font-size: 0.9rem; color: #555; margin-bottom: 5px;">${item.qtd} x R$ ${item.preco.toFixed(2).replace('.', ',')}</div>
                    <strong style="color: #111; font-size: 1.1rem;">R$ ${subtotal.toFixed(2).replace('.', ',')}</strong>
                    <div style="margin-top: 8px;">
                        <button onclick="removerItemCarrinho(${index})" style="color:#dc3545; font-size:0.8rem; background:none; text-decoration: underline;">
                            <i class="fas fa-trash"></i> Remover
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    totalEl.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

// Função global window para ser acessada pelo onclick do HTML gerado
window.removerItemCarrinho = function(index) {
    if(confirm('Deseja remover este item?')) {
        carrinho.splice(index, 1);
        atualizarBadge(); // Função do main.js
        renderizarCarrinhoPage();
    }
};