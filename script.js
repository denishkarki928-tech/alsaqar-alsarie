(function(){
  var root = document.documentElement;

  // ---- theme toggle ----
  var themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function(){
      var isDark = root.classList.toggle('dark');
      try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch(e){}
    });
  }

  // ---- sticky nav shadow ----
  var nav = document.getElementById('siteNav');
  var onScroll = function(){
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 8);
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- mobile menu ----
  var burger = document.getElementById('navBurger');
  var mobileMenu = document.getElementById('mobileMenu');
  var burgerIcon = document.getElementById('burgerIcon');
  if (burger && mobileMenu) {
    burger.addEventListener('click', function(){
      var open = mobileMenu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burgerIcon.innerHTML = open
        ? '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>'
        : '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>';
    });
    mobileMenu.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        mobileMenu.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        burgerIcon.innerHTML = '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>';
      });
    });
  }

  // ---- FAQ accordion ----
  document.querySelectorAll('.faq-item').forEach(function(item){
    var q = item.querySelector('.faq-q');
    q.addEventListener('click', function(){
      var wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function(el){ el.classList.remove('open'); });
      if (!wasOpen) item.classList.add('open');
    });
  });

  // ---- scroll reveal ----
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function(el){ el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function(el){ io.observe(el); });
  }

  // ---- enquiry form -> WhatsApp ----
  var enquiryForm = document.getElementById('enquiryForm');
  if (enquiryForm) {
    enquiryForm.addEventListener('submit', function(e){
      e.preventDefault();
      var name = enquiryForm.name.value.trim();
      var phone = enquiryForm.phone.value.trim();
      var message = enquiryForm.message.value.trim();

      var text = 'Hi AlSaqar AlSarie, I\'d like to enquire about cleaning services.\n\n'
        + 'Name: ' + name + '\n'
        + 'Phone: ' + phone
        + (message ? '\nDetails: ' + message : '');

      window.open('https://wa.me/971504198901?text=' + encodeURIComponent(text), '_blank', 'noopener');
      enquiryForm.reset();
    });
  }

  // ---- footer year ----
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
