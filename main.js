/* =========================================
   PORTFOLIO — INTERACTIONS & ANIMATIONS
   ========================================= */

(function () {
    'use strict';

    const navbar = document.querySelector('.navbar');

    // --- Navbar scroll effect ---
    if (navbar) {
        const onScroll = () => {
            navbar.classList.toggle('navbar--scrolled', window.scrollY > 40);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    // --- Scroll progress bar ---
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    document.body.appendChild(progressBar);

    const updateProgress = () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = pct + '%';
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();

    // --- Burger menu ---
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navOverlay = document.querySelector('.nav-overlay');

    function closeMenu() {
        menuToggle?.classList.remove('active');
        navLinks?.classList.remove('active');
        navOverlay?.classList.remove('active');
        document.body.classList.remove('menu-open');
        menuToggle?.setAttribute('aria-expanded', 'false');
    }

    function toggleMenu() {
        const isOpen = navLinks?.classList.toggle('active');
        menuToggle?.classList.toggle('active', isOpen);
        navOverlay?.classList.toggle('active', isOpen);
        document.body.classList.toggle('menu-open', isOpen);
        menuToggle?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    window.toggleMenu = toggleMenu;
    window.closeMenu = closeMenu;

    menuToggle?.addEventListener('click', toggleMenu);
    navOverlay?.addEventListener('click', closeMenu);

    navLinks?.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // --- Smooth scroll (single source of truth for offset scrolling) ---
    function scrollToTarget(target) {
        const offset = (navbar?.offsetHeight || 90);
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    }

    function normalizedPath(p) {
        if (!p || p === '/' ) return 'index.html';
        // strip any leading path segments, keep just the filename
        const file = p.split('/').pop();
        return file || 'index.html';
    }

    document.querySelectorAll('a[href*="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (!href || href === '#') return;

            const hashIndex = href.indexOf('#');
            const targetId = href.substring(hashIndex);
            if (targetId.length <= 1) return; // just "#"

            const pathPart = href.substring(0, hashIndex);
            const currentPath = normalizedPath(window.location.pathname);
            const isSamePage = normalizedPath(pathPart) === currentPath;

            if (isSamePage) {
                let target;
                try {
                    target = document.querySelector(targetId);
                } catch (err) {
                    target = null;
                }
                if (target) {
                    e.preventDefault();
                    closeMenu();
                    scrollToTarget(target);
                }
            }
        });
    });

    // Handle hash present on page load (e.g. arriving from another page)
    if (window.location.hash) {
        window.addEventListener('load', () => {
            let target;
            try {
                target = document.querySelector(window.location.hash);
            } catch (err) {
                target = null;
            }
            if (target) {
                // let the browser finish its own jump first, then correct with offset + smooth
                setTimeout(() => scrollToTarget(target), 60);
            }
        });
    }

    // --- Modal mentions légales ---
    const modal = document.getElementById('modalMentions');

    window.openModal = function (e) {
        if (e) e.preventDefault();
        if (!modal) return;
        modal.style.display = 'flex';
        requestAnimationFrame(() => modal.classList.add('active'));
        document.body.style.overflow = 'hidden';
    };

    window.closeModal = function () {
        if (!modal) return;
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    };

    modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal?.classList.contains('active')) {
            closeModal();
        }
    });

    // =========================================
    // SCROLL REVEAL ENGINE
    // Animates any element with .reveal, .reveal-scale,
    // .reveal-left, .reveal-right, or .reveal-stagger
    // (whose direct children get a cascading delay)
    // as it enters the viewport.
    // =========================================
    const revealSelectors = '.reveal, .reveal-scale, .reveal-left, .reveal-right, .reveal-stagger';
    const revealEls = document.querySelectorAll(revealSelectors);

    // Assign a staggered transition-delay to children of .reveal-stagger containers
    document.querySelectorAll('.reveal-stagger').forEach(container => {
        Array.from(container.children).forEach((child, i) => {
            child.style.setProperty('--stagger-delay', (i * 0.09) + 's');
        });
    });

    if ('IntersectionObserver' in window && revealEls.length) {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    obs.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -60px 0px'
        });

        revealEls.forEach(el => observer.observe(el));
    } else {
        // Fallback: no IntersectionObserver support, just show everything
        revealEls.forEach(el => el.classList.add('in-view'));
    }

    // =========================================
    // ANIMATED KPI COUNTERS (data-count attribute)
    // Used on the projets.html KPI cards.
    // =========================================
    const counters = document.querySelectorAll('[data-count]');
    if (counters.length && 'IntersectionObserver' in window) {
        const counterObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                const target = parseInt(el.getAttribute('data-count'), 10) || 0;
                const duration = 900;
                const start = performance.now();

                function tick(now) {
                    const progress = Math.min((now - start) / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    el.textContent = Math.round(eased * target);
                    if (progress < 1) requestAnimationFrame(tick);
                    else el.textContent = target;
                }
                requestAnimationFrame(tick);
                obs.unobserve(el);
            });
        }, { threshold: 0.5 });

        counters.forEach(el => counterObserver.observe(el));
    }

})();
