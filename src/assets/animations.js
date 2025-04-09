document.addEventListener('DOMContentLoaded', function() {
    // Animate elements when they enter the viewport
    const animateOnScroll = (elements, className) => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add(className);
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      });
      
      elements.forEach(el => observer.observe(el));
    };
  
    // Apply fade-in animation to sections
    const sections = document.querySelectorAll('.home-section, .about-section');
    if (sections.length) {
      sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
      });
      
      animateOnScroll(sections, 'visible');
    }
  
    // Add CSS class for visible elements
    const style = document.createElement('style');
    style.innerHTML = `
      .visible {
        opacity: 1 !important;
        transform: translateY(0) !important;
      }
    `;
    document.head.appendChild(style);
  
    // Add hover effect to navigation items
    const navItems = document.querySelectorAll('.nav-item a');
    navItems.forEach(item => {
      item.addEventListener('mouseenter', function() {
        this.style.transition = 'all 0.3s ease';
        this.style.textShadow = '0 0 8px rgba(122, 162, 247, 0.5)';
      });
      
      item.addEventListener('mouseleave', function() {
        this.style.textShadow = 'none';
      });
    });
  });