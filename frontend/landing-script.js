/* ========================================
   LANDING PAGE PETHUB - JAVASCRIPT
   ======================================== */

document.addEventListener('DOMContentLoaded', function () {

    // ========================================
    // NAVBAR - Efeito de scroll
    // ========================================
    const navbar = document.querySelector('.navbar');
    const heroSection = document.querySelector('.hero');
    
    function handleScroll() {
        if (window.scrollY > 60) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        // Back to top button visibility
        if (window.scrollY > 400) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true });

    // ========================================
    // MENU MOBILE - Hamburger toggle
    // ========================================
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function () {
            this.classList.toggle('active');
            navLinks.classList.toggle('open');
        });
        
        // Fechar menu ao clicar em um link
        navLinks.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                hamburger.classList.remove('active');
                navLinks.classList.remove('open');
            });
        });
        
        // Fechar menu ao clicar fora
        document.addEventListener('click', function (e) {
            if (!navbar.contains(e.target)) {
                hamburger.classList.remove('active');
                navLinks.classList.remove('open');
            }
        });
    }

    // ========================================
    // FAQ - Accordion
    // ========================================
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(function (item) {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', function () {
            const isActive = item.classList.contains('active');
            
            // Fechar todos os outros itens
            faqItems.forEach(function (otherItem) {
                otherItem.classList.remove('active');
            });
            
            // Se não estava ativo, abrir
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    // ========================================
    // CONTADORES ANIMADOS - Seção de Resultados
    // ========================================
    const resultNumbers = document.querySelectorAll('.result-number');
    
    function animateCounter(element, target, suffix) {
        const duration = 2000; // 2 segundos
        const startTime = performance.now();
        const startValue = 0;
        
        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(startValue + (target - startValue) * eased);
            
            element.textContent = currentValue + (suffix || '');
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target + (suffix || '');
            }
        }
        
        requestAnimationFrame(updateCounter);
    }
    
    // Configuração dos contadores
    const countersConfig = [
        { element: null, target: 40, suffix: '%' },
        { element: null, target: 3, suffix: 'x' },
        { element: null, target: 60, suffix: '%' },
        { element: null, target: 100, suffix: '%' }
    ];
    
    // Intersection Observer para ativar contadores quando visíveis
    const resultsSection = document.querySelector('.results');
    
    if (resultsSection && resultNumbers.length > 0) {
        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    // Associar elementos
                    resultNumbers.forEach(function (el, index) {
                        const target = countersConfig[index] ? countersConfig[index].target : 0;
                        const suffix = countersConfig[index] ? (countersConfig[index].suffix || '') : '';
                        
                        // Extrair o valor do atributo data-target se existir
                        const dataTarget = el.getAttribute('data-target');
                        const dataSuffix = el.getAttribute('data-suffix') || '';
                        
                        const finalTarget = dataTarget ? parseInt(dataTarget) : target;
                        const finalSuffix = dataSuffix || suffix;
                        
                        setTimeout(function () {
                            animateCounter(el, finalTarget, finalSuffix);
                        }, index * 300); // Delay entre cada contador
                    });
                    
                    // Desconectar após animar
                    observer.unobserve(resultsSection);
                }
            });
        }, { threshold: 0.3 });
        
        observer.observe(resultsSection);
    }

    // ========================================
    // BACK TO TOP BUTTON
    // ========================================
    const backToTopBtn = document.querySelector('.back-to-top');
    
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', function () {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // ========================================
    // SCROLL SUAVE PARA ÂNCORAS
    // ========================================
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            
            if (href === '#') return;
            
            const targetElement = document.querySelector(href);
            
            if (targetElement) {
                e.preventDefault();
                
                const navbarHeight = navbar ? navbar.offsetHeight : 0;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ========================================
    // PARALLAX SUTIL NOS CARDS FLUTUANTES
    // ========================================
    const floatingCards = document.querySelectorAll('.floating-card');
    
    if (floatingCards.length > 0) {
        window.addEventListener('mousemove', function (e) {
            const x = e.clientX / window.innerWidth;
            const y = e.clientY / window.innerHeight;
            
            floatingCards.forEach(function (card, index) {
                const speed = index === 0 ? 15 : 20;
                const moveX = (x - 0.5) * speed;
                const moveY = (y - 0.5) * speed;
                
                card.style.transform = 'translate(' + moveX + 'px, ' + moveY + 'px)';
            });
        }, { passive: true });
    }

    // ========================================
    // REVELAR ELEMENTOS NO SCROLL (Fade In)
    // ========================================
    const revealElements = document.querySelectorAll('.problem-card, .benefit-card, .step-card, .demo-item, .testimonial-card, .result-card');
    
    if (revealElements.length > 0) {
        const revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        revealElements.forEach(function (el, index) {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            el.style.transitionDelay = (index % 4) * 0.1 + 's';
            revealObserver.observe(el);
        });
    }

    // ========================================
    // ANIMAÇÃO DE ENTRADA DO HERO (ao carregar)
    // ========================================
    const heroContent = document.querySelector('.hero-content');
    const heroImage = document.querySelector('.hero-image');
    
    if (heroContent) {
        heroContent.style.opacity = '0';
        heroContent.style.transform = 'translateY(30px)';
        
        setTimeout(function () {
            heroContent.style.transition = 'all 0.8s ease';
            heroContent.style.opacity = '1';
            heroContent.style.transform = 'translateY(0)';
        }, 200);
    }
    
    if (heroImage) {
        heroImage.style.opacity = '0';
        heroImage.style.transform = 'translateY(30px)';
        
        setTimeout(function () {
            heroImage.style.transition = 'all 0.8s ease';
            heroImage.style.opacity = '1';
            heroImage.style.transform = 'translateY(0)';
        }, 400);
    }

    console.log('Landing Page PetHub - Inicializada com sucesso!');
});