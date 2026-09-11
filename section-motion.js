const reduceSectionMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sections = [...document.querySelectorAll('main > section.section-pad')];

sections.forEach((section) => {
  section.classList.add('section-motion-pending');
  const target = section.querySelector('.section-heading, .manifesto-copy, .standards-sticky, .contact-main, .materials .section-heading, .works .section-heading');
  if (target) target.classList.add('section-motion-target');
});

if (reduceSectionMotion || !('IntersectionObserver' in window)) {
  sections.forEach(section => section.classList.add('section-entered'));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('section-entered');
      entry.target.classList.remove('section-motion-pending');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  sections.forEach(section => observer.observe(section));
}
