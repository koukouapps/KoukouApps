document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://koukou-apps.vercel.app';

    // Global State
    let state = {
        products: [],
        categories: [],
        promotions: [],
        comments: [],
        config: null,
        likes: JSON.parse(localStorage.getItem('koukou_likes')) || [],
        cart: JSON.parse(localStorage.getItem('koukou_cart')) || []
    };

    function updateCounters() {
        const likesBadge = document.getElementById('global-likes-badge');
        const cartBadge = document.getElementById('global-cart-badge');
        if (likesBadge) likesBadge.textContent = state.likes.length;
        if (cartBadge) cartBadge.textContent = state.cart.length;
    }

    // -- INJECTORES --

    // Inyectar Banners
    function injectBanners() {
        if (!state.config) return;
        const c = state.config;

        // Función auxiliar para inyectar si existe el elemento
        const inject = (containerId, bgImg, title, subtitle, btnText = null) => {
            const container = document.getElementById(containerId);
            if (container) {
                if (bgImg) container.style.backgroundImage = `url('${bgImg}')`;
                const titleEl = container.querySelector('h1') || container.querySelector('h2');
                const subEl = container.querySelector('p');
                const btnEl = container.querySelector('a.btn-primary');

                if (titleEl && title) titleEl.innerHTML = title;
                if (subEl && subtitle) subEl.innerHTML = subtitle;
                if (btnEl && btnText) btnEl.innerHTML = btnText;
            }
        };

        // Identificar la página y aplicar
        inject('hero-home', c.heroHomeImage, c.heroHomeTitle, c.heroHomeSubtitle, c.heroHomeBtnText);
        inject('hero-productos', c.heroProductsImage, c.heroProductsTitle, c.heroProductsSubtitle);
        inject('hero-promos', c.heroPromosImage, c.heroPromosTitle, null);
        inject('hero-recom', c.heroRecomImage, c.heroRecomTitle, null);
        inject('hero-nosotros', c.heroAboutImage, c.heroAboutTitle, c.heroAboutSubtitle);
    }

    // Inyectar Textos Nosotros
    function injectNosotros() {
        if (!state.config) return;
        const c = state.config;
        const histContainer = document.getElementById('about-history-content');
        const misContainer = document.getElementById('about-mission-content');
        const imgEl = document.getElementById('about-side-img');

        if (histContainer && c.aboutHistoryText) histContainer.innerHTML = c.aboutHistoryText;
        if (misContainer && c.aboutPhilosophyText) misContainer.innerHTML = c.aboutPhilosophyText;
        if (imgEl && c.aboutSideImage) imgEl.src = c.aboutSideImage;
    }

    // Renderizar Categorías (index.html)
    function renderCategoriesNav() {
        const catContainer = document.getElementById('dynamic-categories-nav');
        if (!catContainer) return;

        catContainer.innerHTML = '';
        if (state.categories.length === 0) {
            catContainer.innerHTML = '<p class="text-center text-gray-400 w-full">No hay categorías configuradas.</p>';
            return;
        }

        state.categories.filter(c => c.isActive).sort((a, b) => a.order - b.order).forEach((cat, idx) => {
            const div = document.createElement('div');
            div.className = `category-item ${idx === 0 ? 'active' : ''}`;
            div.setAttribute('data-id', cat.id);
            div.innerHTML = `
                <div class="category-icon">
                    <img src="${cat.image || 'https://via.placeholder.com/60'}" alt="${cat.name}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">
                </div>
                <span>${cat.name}</span>
            `;

            div.addEventListener('click', () => {
                document.querySelectorAll('.category-item').forEach(c => c.classList.remove('active'));
                div.classList.add('active');
                renderHomeProducts(cat.id);
            });

            catContainer.appendChild(div);
        });

        // Cargar los productos de la primera categoría por defecto
        const firstCat = state.categories.filter(c => c.isActive).sort((a, b) => a.order - b.order)[0];
        if (firstCat) renderHomeProducts(firstCat.id);
    }

    // Renderizar Productos en Home (index.html)
    function renderHomeProducts(categoryId) {
        const prodContainer = document.getElementById('dynamic-home-products');
        if (!prodContainer) return;

        prodContainer.classList.remove('fade-in');

        const filtered = state.products.filter(p => p.categoryId === categoryId && p.isActive);

        setTimeout(() => {
            prodContainer.innerHTML = '';
            if (filtered.length === 0) {
                prodContainer.innerHTML = '<p class="text-center col-span-full py-8 text-gray-500">No hay productos en esta categoría.</p>';
            } else {
                filtered.forEach((item, index) => {
                    prodContainer.innerHTML += createProductCardHTML(item, index);
                });
                attachCardEvents();
            }
            prodContainer.classList.add('fade-in');
        }, 100);
    }

    // Renderizar Catálogo Completo (productos.html)
    function renderFullCatalog() {
        const catContainer = document.getElementById('full-catalog-container');
        if (!catContainer) return;

        catContainer.innerHTML = '';
        if (state.categories.length === 0 || state.products.length === 0) {
            catContainer.innerHTML = '<p class="text-center w-full py-12 text-gray-500">No hay catálogo disponible por el momento.</p>';
            return;
        }

        const activeCategories = state.categories.filter(c => c.isActive).sort((a, b) => a.order - b.order);

        activeCategories.forEach(cat => {
            const catProducts = state.products.filter(p => p.categoryId === cat.id && p.isActive);
            if (catProducts.length === 0) return; // Skip empty categories

            let sectionHTML = `
                <div class="mb-12 w-full px-4">
                    <h2 class="text-3xl font-bold mb-6 border-b pb-2 border-gray-200" style="color:var(--text-primary)">${cat.name}</h2>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            `;

            catProducts.forEach((item, index) => {
                sectionHTML += createProductCardHTML(item, index);
            });

            sectionHTML += `</div></div>`;
            catContainer.innerHTML += sectionHTML;
        });

        attachCardEvents();
    }

    // Renderizar Promociones
    function renderPromotions() {
        const promoContainers = document.querySelectorAll('.dynamic-promos-container');
        if (promoContainers.length === 0) return;

        const activePromos = state.promotions.filter(p => p.isActive);

        promoContainers.forEach(container => {
            container.innerHTML = '';
            if (activePromos.length === 0) {
                container.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">No hay promociones activas.</p>';
                return;
            }

            activePromos.forEach(promo => {
                container.innerHTML += `
                    <div class="promo-card bg-white rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row items-center border border-gray-100 hover:shadow-md transition">
                        <div class="w-full md:w-2/5 h-48 bg-gray-200">
                            <img src="${promo.image || 'https://via.placeholder.com/300'}" alt="${promo.title}" class="w-full h-full object-cover">
                        </div>
                        <div class="p-6 w-full md:w-3/5 text-center md:text-left">
                            <h3 class="text-2xl font-black text-gray-900 mb-2">${promo.title}</h3>
                            <p class="text-gray-600 mb-4 font-medium">${promo.desc}</p>
                            <a href="https://wa.me/${state.config?.whatsappNumber || ''}" class="inline-block bg-gray-900 text-white px-6 py-2 rounded-full font-bold hover:bg-red-600 transition">${promo.buttonText || 'Aprovechar'}</a>
                        </div>
                    </div>
                `;
            });
        });
    }

    // Renderizar Comentarios (recomendaciones.html)
    function renderComments() {
        const commContainer = document.getElementById('dynamic-comments-container');
        if (!commContainer) return;

        commContainer.innerHTML = '';
        const approved = state.comments; // API ya devuelve approved by default

        if (approved.length === 0) {
            commContainer.innerHTML = '<p class="col-span-full text-center text-gray-500 py-12">Sé el primero en dejar una recomendación.</p>';
            return;
        }

        approved.forEach(c => {
            commContainer.innerHTML += `
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative">
                    <div class="flex items-center gap-4 mb-4">
                        <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-xl font-bold text-gray-600">
                            ${c.user.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-900">${c.user}</h4>
                            <span class="text-xs text-gray-400">${new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <p class="text-gray-700 italic">"${c.text}"</p>
                    <div class="absolute top-4 right-4 text-yellow-400">
                        <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
                    </div>
                </div>
            `;
        });
    }

    // -- COMPONENTES HTML COMUNES --
    function createProductCardHTML(item, index) {
        return `
            <div class="product-card" style="animation-delay: ${index * 0.1}s">
                <div class="product-image-container">
                    <button class="btn-like-top" data-id="${item.id}">
                        <i class="${state.likes.includes(item.id) ? 'fa-solid' : 'fa-regular'} fa-heart" style="${state.likes.includes(item.id) ? 'color: var(--accent-red)' : ''}"></i>
                    </button>
                    <img src="${item.image || 'https://via.placeholder.com/300'}" alt="${item.name}" class="product-img">
                </div>
                <div class="product-info">
                    <h3 class="product-title">${item.name}</h3>
                    <p class="product-desc text-xs mt-1 text-gray-500">${item.shortDesc}</p>
                    <div class="product-footer mt-3">
                        <div class="product-stats">
                            <span><i class="fa-solid fa-heart text-red-400"></i> ${item.likes}</span>
                            ${item.price ? `<span class="font-bold text-gray-900">$${item.price}</span>` : ''}
                        </div>
                        <a href="#" class="btn-whatsapp-icon btn-product-wa" data-name="${item.name}"><i class="fa-brands fa-whatsapp"></i></a>
                    </div>
                </div>
            </div>
        `;
    }

    function attachCardEvents() {
        // Lógica de Likes
        document.querySelectorAll('.btn-like-top').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const id = btn.getAttribute('data-id');
                const icon = btn.querySelector('i');
                if (!state.likes.includes(id)) {
                    icon.classList.replace('fa-regular', 'fa-solid');
                    icon.style.color = 'var(--accent-red)';
                    state.likes.push(id);
                } else {
                    icon.classList.replace('fa-solid', 'fa-regular');
                    icon.style.color = '';
                    state.likes = state.likes.filter(i => i !== id);
                }
                localStorage.setItem('koukou_likes', JSON.stringify(state.likes));
                updateCounters();
            });
        });

        // Lógica de WhatsApp por Producto
        document.querySelectorAll('.btn-product-wa').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (!state.config) return;
                const prodName = btn.getAttribute('data-name');
                const num = state.config.whatsappNumber || '525512345678';
                const baseMsg = state.config.whatsappMessageProduct || 'Me interesa: {{producto}}';
                const msg = baseMsg.replace('{{producto}}', prodName);
                window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
            });
        });
    }

    // Inicialización Principal (Llamada al Panel Administrativo API)
    async function init() {
        updateCounters();

        try {
            // Se hacen todas las peticiones al Panel
            const [prodRes, catRes, promRes, confRes, comRes] = await Promise.all([
                fetch(`${API_URL}/products`).catch(() => null),
                fetch(`${API_URL}/categories`).catch(() => null),
                fetch(`${API_URL}/promotions`).catch(() => null),
                fetch(`${API_URL}/config`).catch(() => null),
                fetch(`${API_URL}/comments`).catch(() => null)
            ]);

            if (prodRes && prodRes.ok) state.products = await prodRes.json();
            if (catRes && catRes.ok) state.categories = await catRes.json();
            if (promRes && promRes.ok) state.promotions = await promRes.json();
            if (confRes && confRes.ok) state.config = await confRes.json();
            if (comRes && comRes.ok) state.comments = await comRes.json();

            // Desplegar datos en el frontend estático
            injectBanners();
            injectNosotros();
            renderCategoriesNav();
            renderFullCatalog();
            renderPromotions();
            renderComments();

            // Configurar WhatsApp Global
            const globalBtn = document.getElementById('btn-whatsapp-global');
            if (state.config && globalBtn) {
                const num = state.config.whatsappNumber || '525512345678';
                let msg = state.config.whatsappMessageCart || 'Hola 👋';
                globalBtn.href = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
            }

        } catch (error) {
            console.error('Error sincronizando con el CMS:', error);
        }
    }

    init();

    // Lógica para Formulario de Recomendaciones
    const recomForm = document.getElementById('recom-form');
    if (recomForm) {
        recomForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('recom-name').value;
            const text = document.getElementById('recom-text').value;

            try {
                await fetch(`${API_URL}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user, text })
                });
                alert("¡Gracias! Tu recomendación fue enviada a revisión y pronto aparecerá aquí.");
                recomForm.reset();
            } catch (err) {
                alert("Hubo un error al enviar tu comentario.");
            }
        });
    }

});
