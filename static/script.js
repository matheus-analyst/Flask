/* ============================================================
   NeoCount Blog — Integração Assíncrona (Fetch API + SPA)
   ============================================================ */

const API_BASE = '/api/posts';
const ADMIN_PASS = '123456';
let isAdmin = false; // Sessão temporária de administração

document.addEventListener('DOMContentLoaded', () => {
    setupAdminUI();
    loadPosts();
});

/* ----------------------------------------------------------
   CARREGAMENTO INICIAL DOS POSTS
---------------------------------------------------------- */
async function loadPosts() {
    const container = document.getElementById('posts-container');
    try {
        const res = await fetch(API_BASE);
        if (!res.ok) throw new Error('Erro ao carregar posts.');
        const posts = await res.json();
        renderPosts(posts, container);
    } catch (err) {
        console.error(err);
        showToast('Falha na comunicação com a API.', 'error');
    }
}

function renderPosts(posts, container) {
    container.innerHTML = '';
    if (posts.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1;">Nenhum artigo publicado ainda.</p>';
        return;
    }
    posts.forEach((post, i) => container.appendChild(createPostCard(post, i * 0.1)));
}

function createPostCard(post, delay = 0) {
    const card = document.createElement('article');
    card.className = 'post-card';
    card.style.setProperty('--delay', `${delay}s`);
    card.dataset.id = post.id;

    const commentsHtml = post.comentarios
        .map(c => `
            <div class="comment-item">
                <strong><i class="fa-solid fa-user"></i> ${escapeHtml(c.nome)}</strong>
                ${escapeHtml(c.texto)}
            </div>`)
        .join('');

    const adminControl = isAdmin ? `
        <button class="btn-icon-action btn-delete" title="Excluir artigo">
            <i class="fa-solid fa-trash-can"></i>
        </button>` : '';

    card.innerHTML = `
        <div class="card-top">
            <span class="card-category">${escapeHtml(post.categoria)}</span>
            ${adminControl}
        </div>
        <h2 class="card-title">${escapeHtml(post.titulo)}</h2>
        <p class="card-content">${escapeHtml(post.conteudo)}</p>
        <div class="card-divider"></div>
        <div class="card-interactions">
            <button class="like-group">
                <i class="fa-regular fa-heart"></i> <span class="like-count">${post.curtidas}</span>
            </button>
            <button class="comment-toggle">
                <i class="fa-regular fa-comments"></i> <span class="comment-count">${post.comentarios.length}</span>
            </button>
        </div>
        <section class="comments-section hidden">
            ${commentsHtml}
            <form class="comment-form">
                <input type="text" class="comment-name" placeholder="Seu nome" required maxlength="60">
                <input type="text" class="comment-text" placeholder="Escreva seu comentário..." required maxlength="280">
                <button type="submit" class="btn-primary">
                    <i class="fa-solid fa-paper-plane"></i> Comentar
                </button>
            </form>
        </section>
    `;

    setupCardEvents(card, post.id);
    return card;
}

/* ---------------------------------------------------------
   EVENTOS DINÂMICOS DO CARD (Like, Comentar, Excluir)
--------------------------------------------------------- */
function setupCardEvents(card, postId) {
    // Curtir
    const likeBtn = card.querySelector('.like-group');
    likeBtn.addEventListener('click', async () => {
        const icon = likeBtn.querySelector('i');
        icon.classList.remove('fa-regular');
        icon.classList.add('fa-solid');
        likeBtn.classList.add('liked');

        try {
            const res = await fetch(`${API_BASE}/${postId}/like`, { method: 'POST' });
            if (!res.ok) throw new Error('Erro na curtida.');
            const data = await res.json();
            // Atualização reativa do DOM, sem reload (SPA)
            card.querySelector('.like-count').textContent = data.curtidas;
        } catch {
            showToast('Não foi possível registrar a curtida.', 'error');
        }
    });

    // Alternar seção de comentários
    const commentsSection = card.querySelector('.comments-section');
    card.querySelector('.comment-toggle').addEventListener('click', () => {
        commentsSection.classList.toggle('hidden');
    });

    // Enviar comentário
    const commentForm = card.querySelector('.comment-form');
    commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nomeInput = commentForm.querySelector('.comment-name').value.trim();
        const textoInput = commentForm.querySelector('.comment-text').value.trim();
        if (!nomeInput || !textoInput) return;

        try {
            const res = await fetch(`${API_BASE}/${postId}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: nomeInput, texto: textoInput })
            });
            if (!res.ok) throw new Error('Erro no comentário.');
            const data = await res.json();

            // Inserção instantânea do comentário no fluxo (SPA)
            const newComment = document.createElement('div');
            newComment.className = 'comment-item';
            newComment.innerHTML = `
                <strong><i class="fa-solid fa-user"></i> ${escapeHtml(nomeInput)}</strong>
                ${escapeHtml(textoInput)}`;
            commentsSection.insertBefore(newComment, commentForm);

            card.querySelector('.comment-count').textContent = data.comentarios.length;
            commentForm.reset();
            showToast('Comentário publicado!', 'success');
        } catch {
            showToast('Erro ao enviar comentário.', 'error');
        }
    });

    // Excluir (apenas admin)
    const deleteBtn = card.querySelector('.btn-delete');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (!confirm('Deseja realmente excluir este artigo permanentemente?')) return;
            card.classList.add('removing');
            try {
                const res = await fetch(`${API_BASE}/${postId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ senha: ADMIN_PASS })
                });
                if (!res.ok) throw new Error('Erro ao excluir.');
                setTimeout(() => card.remove(), 400);
                showToast('Artigo removido.', 'success');
            } catch {
                card.classList.remove('removing');
                showToast('Erro ao excluir artigo.', 'error');
            }
        });
    }
}

/* ---------------------------------------------------------
   PAINEL DE ADMINISTRAÇÃO (Oculto por padrão)
--------------------------------------------------------- */
function setupAdminUI() {
    const btnAdmin = document.getElementById('btn-admin');
    const modalOverlay = document.getElementById('modal-overlay');
    const btnLogin = document.getElementById('btn-login');
    const btnClose = document.getElementById('modal-close');
    const btnAdminClose = document.getElementById('admin-close');
    const adminPanel = document.getElementById('admin-panel');
    const postForm = document.getElementById('post-form');

    // Abrir modal de senha (ou toggle do painel se já desbloqueado)
    btnAdmin.addEventListener('click', () => {
        if (isAdmin) {
            adminPanel.classList.toggle('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            modalOverlay.classList.remove('hidden');
            document.getElementById('admin-password').focus();
        }
    });

    // Fechar modal
    const closeModal = () => {
        modalOverlay.classList.add('hidden');
        document.getElementById('admin-password').value = '';
        document.getElementById('modal-error').classList.add('hidden');
    };
    btnClose.addEventListener('click', closeModal);
    btnAdminClose.addEventListener('click', () => adminPanel.classList.add('hidden'));
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    // Verificação da senha
    btnLogin.addEventListener('click', () => {
        const pass = document.getElementById('admin-password').value;
        if (pass === ADMIN_PASS) {
            isAdmin = true;
            closeModal();
            btnAdmin.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i>';
            btnAdmin.title = 'Sair do modo administrador';
            adminPanel.classList.remove('hidden');
            showToast('Modo administrador ativado!', 'success');
            loadPosts(); // Re-renderiza os cards com os botões de exclusão
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            document.getElementById('modal-error').classList.remove('hidden');
        }
    });

    // Publicar novo artigo
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titulo = document.getElementById('post-titulo').value.trim();
        const categoria = document.getElementById('post-categoria').value.trim();
        const conteudo = document.getElementById('post-conteudo').value.trim();

        try {
            const res = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titulo, categoria, conteudo, senha: ADMIN_PASS })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erro ao publicar.');
            }
            const data = await res.json();

            // SPA Update: insere o card novo no topo do feed
            const container = document.getElementById('posts-container');
            const emptyMsg = container.querySelector('p');
            if (emptyMsg) emptyMsg.remove();
            container.prepend(createPostCard(data.post, 0));

            postForm.reset();
            showToast('Artigo publicado com sucesso!', 'success');
        } catch (err) {
            showToast(err.message || 'Erro ao publicar artigo.', 'error');
        }
    });
}

/* ---------------------------------------------------------
   UTILITÁRIOS
--------------------------------------------------------- */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

let toastTimer;
function showToast(message, type = 'success') {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${escapeHtml(message)}`;
    toast.className = `toast ${type} show`;

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}
