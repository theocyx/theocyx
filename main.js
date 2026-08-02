/* =========================================
   PORTFOLIO — INTERACTIONS & ANIMATIONS
   ========================================= */

(function () {
    'use strict';

    const navbar = document.querySelector('.navbar');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    // Vrai pendant la fermeture du panneau mobile : on laisse le
    // panneau finir de sortir avant de lancer le scroll.
    let menuJustClosed = false;

    function closeMenu() {
        const wasOpen = navLinks?.classList.contains('active');

        menuToggle?.classList.remove('active');
        navLinks?.classList.remove('active');
        navOverlay?.classList.remove('active');
        document.body.classList.remove('menu-open');
        menuToggle?.setAttribute('aria-expanded', 'false');

        if (wasOpen) {
            menuJustClosed = true;
            setTimeout(() => { menuJustClosed = false; }, 450);
        }
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

    const navAnchors = Array.from(navLinks?.querySelectorAll('a') || []);

    navAnchors.forEach((link, i) => {
        // Cascade d'ouverture du panneau mobile (lue par le CSS)
        link.style.setProperty('--nav-delay', (0.08 + i * 0.05) + 's');

        link.addEventListener('click', () => {
            // Petit rebond au clic, relancé à chaque fois
            link.classList.remove('is-tapped');
            void link.offsetWidth;
            link.classList.add('is-tapped');
            setTimeout(() => link.classList.remove('is-tapped'), 400);
            closeMenu();
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navLinks?.classList.contains('active')) closeMenu();
    });

    // --- Smooth scroll (single source of truth for offset scrolling) ---
    // Animation maison : easing identique partout, et interruptible
    // dès que l'utilisateur reprend la main.
    let scrollAnimId = null;
    let scrollAnimGuard = null;

    function cancelScrollAnim() {
        if (scrollAnimId === null) return;
        cancelAnimationFrame(scrollAnimId);
        scrollAnimId = null;
        clearTimeout(scrollAnimGuard);
        scrollAnimGuard = null;
        document.documentElement.style.scrollBehavior = '';
    }

    ['wheel', 'touchstart'].forEach(evt => {
        window.addEventListener(evt, cancelScrollAnim, { passive: true });
    });

    function flashTarget(el) {
        if (reducedMotion) return;
        el.classList.remove('nav-flash');
        void el.offsetWidth;
        el.classList.add('nav-flash');
        setTimeout(() => el.classList.remove('nav-flash'), 1200);
    }

    function scrollToTarget(target) {
        const offset = (navbar?.offsetHeight || 84);
        const destination = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);

        if (reducedMotion) {
            window.scrollTo(0, destination);
            return;
        }

        cancelScrollAnim();

        const startY = window.scrollY;
        const distance = destination - startY;
        if (Math.abs(distance) < 2) {
            flashTarget(target);
            return;
        }

        // Durée proportionnelle à la distance, bornée pour rester vif
        const duration = Math.min(1000, Math.max(450, Math.abs(distance) * 0.55));
        const startTime = performance.now();

        // Neutralise le scroll-behavior CSS qui entrerait en conflit
        document.documentElement.style.scrollBehavior = 'auto';

        function step(now) {
            const t = Math.min((now - startTime) / duration, 1);
            const eased = t < 0.5
                ? 4 * t * t * t
                : 1 - Math.pow(-2 * t + 2, 3) / 2;
            window.scrollTo(0, startY + distance * eased);

            if (t < 1) {
                scrollAnimId = requestAnimationFrame(step);
            } else {
                cancelScrollAnim();
                flashTarget(target);
            }
        }

        scrollAnimId = requestAnimationFrame(step);

        // Filet de sécurité : si les frames s'arrêtent (onglet en arrière-plan),
        // on se pose directement sur la destination plutôt que rester bloqué.
        scrollAnimGuard = setTimeout(() => {
            if (scrollAnimId === null) return;
            cancelScrollAnim();
            window.scrollTo(0, destination);
        }, duration + 400);
    }

    function normalizedPath(p) {
        if (!p || p === '/') return 'index.html';
        const file = p.split('/').pop();
        return file || 'index.html';
    }

    document.querySelectorAll('a[href*="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (!href || href === '#') return;

            const hashIndex = href.indexOf('#');
            const targetId = href.substring(hashIndex);
            if (targetId.length <= 1) return;

            const pathPart = href.substring(0, hashIndex);
            // Un href commençant par '#' vise forcément la page courante
            const isSamePage = !pathPart ||
                normalizedPath(pathPart) === normalizedPath(window.location.pathname);

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
                    if (menuJustClosed && !reducedMotion) {
                        setTimeout(() => scrollToTarget(target), 300);
                    } else {
                        scrollToTarget(target);
                    }
                }
            }
        });
    });

    // --- Lien actif : page courante + section à l'écran ---
    const currentFile = normalizedPath(window.location.pathname);
    const spyItems = [];

    navAnchors.forEach(link => {
        const href = link.getAttribute('href') || '';
        const hashIndex = href.indexOf('#');
        const pathPart = hashIndex >= 0 ? href.substring(0, hashIndex) : href;
        const samePage = !pathPart || normalizedPath(pathPart) === currentFile;

        if (!samePage) return;

        if (hashIndex < 0) {
            // Lien vers la page courante sans ancre (Projets, Contact, CV)
            link.classList.add('is-active');
            return;
        }

        let section;
        try {
            section = document.querySelector(href.substring(hashIndex));
        } catch (err) {
            section = null;
        }
        if (section) spyItems.push({ link, section });
    });

    if (spyItems.length) {
        spyItems.sort((a, b) => a.section.offsetTop - b.section.offsetTop);

        let spyTicking = false;

        function updateActiveLink() {
            const line = window.scrollY + (navbar?.offsetHeight || 84) + 40;
            const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;

            let current = atBottom ? spyItems[spyItems.length - 1] : null;
            if (!atBottom) {
                spyItems.forEach(item => {
                    if (item.section.offsetTop <= line) current = item;
                });
            }

            spyItems.forEach(item => {
                item.link.classList.toggle('is-active', item === current);
            });
        }

        window.addEventListener('scroll', () => {
            if (spyTicking) return;
            spyTicking = true;
            requestAnimationFrame(() => {
                updateActiveLink();
                spyTicking = false;
            });
        }, { passive: true });

        window.addEventListener('resize', updateActiveLink);
        updateActiveLink();
    }

    // --- Transition entre les pages ---
    // Rideau qui remonte, puis navigation. Le fondu d'arrivée est en CSS.
    const pageFade = document.createElement('div');
    pageFade.className = 'page-transition';
    document.body.appendChild(pageFade);

    // Retour arrière depuis le cache navigateur : on ré-affiche la page
    window.addEventListener('pageshow', () => pageFade.classList.remove('is-active'));

    function shouldIntercept(link, e) {
        if (e.defaultPrevented || e.button !== 0) return false;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
        if (link.hasAttribute('download')) return false;
        if (link.target && link.target !== '_self') return false;

        const href = link.getAttribute('href');
        if (!href || href.charAt(0) === '#') return false;

        let url;
        try {
            url = new URL(link.href, window.location.href);
        } catch (err) {
            return false;
        }

        if (url.origin !== window.location.origin) return false;
        // Uniquement les pages du site : ni PDF, ni pptx, ni mailto
        if (!/(\.html?|\/)$/i.test(url.pathname)) return false;
        if (url.pathname === window.location.pathname) return false;

        return true;
    }

    document.addEventListener('click', (e) => {
        const link = e.target.closest?.('a[href]');
        if (!link || !shouldIntercept(link, e)) return;

        e.preventDefault();
        closeMenu();

        const go = () => { window.location.href = link.href; };
        if (reducedMotion) {
            go();
            return;
        }

        pageFade.classList.add('is-active');
        setTimeout(go, 380);
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
            if (target) setTimeout(() => scrollToTarget(target), 60);
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
        if (e.key === 'Escape' && modal?.classList.contains('active')) closeModal();
    });

    // =========================================
    // ONGLETS PROJETS (page projets.html)
    // =========================================
    const tabList = document.querySelector('.project-tabs');

    if (tabList) {
        const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));

        function selectTab(tab, { focus = false, updateHash = true, userAction = true } = {}) {
            const panel = document.getElementById(tab.getAttribute('aria-controls'));
            if (!panel) return;

            // Si on a déjà scrollé dans le panneau précédent, on remonte sur
            // les onglets : sinon on atterrit au milieu de nulle part.
            const scrolledPast = tabList.getBoundingClientRect().top < (navbar?.offsetHeight || 84);
            if (userAction && scrolledPast) scrollToTarget(tabList);

            tabs.forEach(t => {
                const isTarget = t === tab;
                const p = document.getElementById(t.getAttribute('aria-controls'));

                t.classList.toggle('is-selected', isTarget);
                t.setAttribute('aria-selected', isTarget ? 'true' : 'false');
                t.tabIndex = isTarget ? 0 : -1;
                if (p) p.hidden = !isTarget;
            });

            if (!reducedMotion) {
                panel.classList.remove('is-entering');
                void panel.offsetWidth;
                panel.classList.add('is-entering');
            }

            if (focus) tab.focus();
            // Rend l'onglet partageable sans provoquer de saut de scroll
            if (updateHash) history.replaceState(null, '', '#' + panel.id);
        }

        tabs.forEach(tab => {
            tab.addEventListener('click', () => selectTab(tab));

            tab.addEventListener('keydown', (e) => {
                const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
                    : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1
                    : e.key === 'Home' ? 'first'
                    : e.key === 'End' ? 'last'
                    : null;
                if (dir === null) return;

                e.preventDefault();
                const i = tabs.indexOf(tab);
                const next = dir === 'first' ? tabs[0]
                    : dir === 'last' ? tabs[tabs.length - 1]
                    : tabs[(i + dir + tabs.length) % tabs.length];
                selectTab(next, { focus: true });
            });
        });

        // Ouverture directe via l'URL (ex. projets.html#panel-atelier68)
        const fromHash = window.location.hash
            ? tabs.find(t => '#' + t.getAttribute('aria-controls') === window.location.hash)
            : null;

        selectTab(fromHash || tabs[0], { updateHash: false, userAction: false });
    }

    // =========================================
    // SCROLL REVEAL ENGINE
    // =========================================
    const revealSelectors = '.reveal, .reveal-scale, .reveal-left, .reveal-right, .reveal-stagger';
    const revealEls = document.querySelectorAll(revealSelectors);

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
        revealEls.forEach(el => el.classList.add('in-view'));
    }

    // =========================================
    // ANIMATED KPI COUNTERS (data-count attribute)
    // =========================================
    const counters = document.querySelectorAll('[data-count]');
    if (counters.length && 'IntersectionObserver' in window) {
        const counterObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                const target = parseInt(el.getAttribute('data-count'), 10) || 0;

                if (reducedMotion) {
                    el.textContent = target;
                    obs.unobserve(el);
                    return;
                }

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

    // =========================================
    // HERO TERMINAL — séquence tapée au chargement
    // Élément signature de la page d'accueil.
    // =========================================
    const terminal = document.getElementById('terminal');

    if (terminal) {
        const SEQUENCE = [
            { cmd: 'whoami' },
            { out: 'Théo Cayeux — Admin d\'Infrastructures Sécurisées' },
            { cmd: 'systemctl status alternance' },
            { out: '● SPL Grand Est mobilités · Strasbourg' },
            { out: '  démarrage : septembre 2026' },
            { cmd: 'cat formation.txt' },
            { out: 'CCI Campus · AIS · 2026–2027' }
        ];

        const PROMPT = 'theo@infra:~$';

        function makeLine() {
            const line = document.createElement('div');
            line.className = 'term-line';
            terminal.appendChild(line);
            return line;
        }

        function renderAll() {
            terminal.innerHTML = '';
            SEQUENCE.forEach(step => {
                const line = makeLine();
                if (step.cmd) {
                    line.innerHTML = '<span class="term-prompt">' + PROMPT + '</span><span class="term-cmd"></span>';
                    line.querySelector('.term-cmd').textContent = step.cmd;
                } else {
                    line.className = 'term-line term-out';
                    line.textContent = step.out;
                }
            });
            const last = makeLine();
            last.innerHTML = '<span class="term-prompt">' + PROMPT + '</span><span class="term-cursor"></span>';
        }

        function typeSequence() {
            let stepIndex = 0;

            function nextStep() {
                if (stepIndex >= SEQUENCE.length) {
                    const last = makeLine();
                    last.innerHTML = '<span class="term-prompt">' + PROMPT + '</span><span class="term-cursor"></span>';
                    return;
                }

                const step = SEQUENCE[stepIndex++];
                const line = makeLine();

                if (step.out) {
                    line.className = 'term-line term-out';
                    line.textContent = step.out;
                    setTimeout(nextStep, 320);
                    return;
                }

                line.innerHTML = '<span class="term-prompt">' + PROMPT + '</span><span class="term-cmd"></span><span class="term-cursor"></span>';
                const cmdSpan = line.querySelector('.term-cmd');
                const cursor = line.querySelector('.term-cursor');
                let charIndex = 0;

                function typeChar() {
                    if (charIndex < step.cmd.length) {
                        cmdSpan.textContent += step.cmd.charAt(charIndex++);
                        setTimeout(typeChar, 42);
                    } else {
                        cursor.remove();
                        setTimeout(nextStep, 380);
                    }
                }
                typeChar();
            }

            nextStep();
        }

        if (reducedMotion) {
            renderAll();
        } else {
            setTimeout(typeSequence, 700);
        }
    }

})();
