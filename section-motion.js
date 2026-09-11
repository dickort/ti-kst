/* Shared, progressive section motion; no frame loop or scroll interception. */
(() => {
  function init() {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sections = [...document.querySelectorAll('main > section')]
      .filter(node => !node.matches('.hero,.direction-hero,.service-hero'));
    const selectors = [
      '.value-item', '.section-heading > *', '.manifesto-copy', '.manifesto-text',
      '.direction-column-head', '.service-row', '.standards-sticky', '.standard-card',
      '.process-head > *', '.process-step', '.brand-rail span',
      '.work-placeholder', '.works-request', '.works-signal', '.contact-main', '.contact-data',
      '.direction-intro > *', '.direction-services-head > *', '.direction-service-card',
      '.direction-standard-copy', '.direction-cta > *', '.intro-grid > *',
      '.standards-copy', '.standard-list article', '.portfolio-head > *',
      '.portfolio-card', '.cta-grid > *'
    ].join(',');
    const items = sections.flatMap(section => [...section.querySelectorAll(selectors)]);
    let observer;
    const showAll = () => {
      observer?.disconnect();
      items.forEach(item => item.classList.add('motion-visible'));
      sections.forEach(section => section.classList.add('section-entered'));
    };
    sections.forEach(section => section.classList.add('section-animated'));
    // Read positions first, then write classes. Hash landings start readable.
    const positions = items.map(item => item.getBoundingClientRect());
    items.forEach((item,index) => {
      const siblings = [...item.parentElement.children].filter(node => items.includes(node));
      item.style.setProperty('--enter-delay', `${Math.min(siblings.indexOf(item),2) * 65}ms`);
      item.classList.add('motion-item');
      if (positions[index].top < innerHeight && positions[index].bottom > 0) {
        item.classList.add('motion-visible');
        item.closest('main > section')?.classList.add('section-entered');
      }
    });
    if (motion.matches || !('IntersectionObserver' in window)) { showAll(); return; }
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('motion-visible');
        entry.target.closest('main > section')?.classList.add('section-entered');
        observer.unobserve(entry.target);
      });
    }, {threshold: .06, rootMargin: '0px 0px -24px 0px'});
    items.filter(item => !item.classList.contains('motion-visible')).forEach(item => observer.observe(item));
    motion.addEventListener('change', event => { if (event.matches) showAll(); });
    // Keyboard users reach the readable final state immediately.
    document.addEventListener('focusin', event => {
      const item = event.target.closest('.motion-item');
      if (item) { item.classList.add('motion-visible'); observer.unobserve(item); }
    });
    window.addEventListener('beforeprint', showAll);

    const navLinks = [...document.querySelectorAll('.desktop-nav a[href^="#"]')];
    const navTargets = navLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
    if (navTargets.length) {
      const activeObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          navLinks.forEach(link => {
            if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current','location');
            else link.removeAttribute('aria-current');
          });
        });
      }, {rootMargin: '-15% 0px -65% 0px', threshold: 0});
      navTargets.forEach(target => activeObserver.observe(target));
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
