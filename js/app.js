/**
 * SEDİRPAK YÖNETİM & TEMİZLİK
 * Interactive Application & Discovery Calculator Logic
 */

/* ==========================================================================
   0A. SMART SCROLL POSITION RESTORATION
   Preserves exact scroll position across page reloads/refreshes.
   ========================================================================== */
const pageKey = (window.location.pathname.split('/').pop() || 'index').replace(/\.html$/, '');
const SCROLL_POS_KEY = 'sedirpak_scroll_' + pageKey;
const IS_RELOADING_KEY = 'sedirpak_is_reloading_' + pageKey;

// Detect if this session is a reload / refresh
const navEntry = (typeof performance !== 'undefined' && performance.getEntriesByType)
  ? performance.getEntriesByType('navigation')[0]
  : null;

const isPageReload = (navEntry && navEntry.type === 'reload') ||
                     (window.performance && window.performance.navigation && window.performance.navigation.type === 1) ||
                     (sessionStorage.getItem(IS_RELOADING_KEY) === 'true');

function getSavedScrollPosition() {
  try {
    const val = sessionStorage.getItem(SCROLL_POS_KEY);
    return val ? parseInt(val, 10) : 0;
  } catch (e) {
    return 0;
  }
}

function restoreScrollPosition(instant = true) {
  const savedY = getSavedScrollPosition();
  if (savedY > 30) {
    const htmlEl = document.documentElement;
    const prevBehavior = htmlEl.style.scrollBehavior;
    if (instant) {
      htmlEl.style.scrollBehavior = 'auto';
    }
    window.scrollTo(0, savedY);
    if (instant) {
      requestAnimationFrame(() => {
        htmlEl.style.scrollBehavior = prevBehavior || '';
      });
    }
  }
}

function initScrollRestoration() {
  // Tell browser not to execute default scroll restoration which can conflict
  if ('scrollRestoration' in history) {
    try {
      history.scrollRestoration = 'manual';
    } catch (e) {}
  }

  // If page was refreshed with a preserved position, restore immediately
  if (isPageReload) {
    restoreScrollPosition(true);
    try {
      sessionStorage.removeItem(IS_RELOADING_KEY);
    } catch (e) {}
  }

  // Continuous passive scroll tracking (throttled with rAF for max performance)
  let isScrollTicking = false;
  window.addEventListener('scroll', () => {
    if (!isScrollTicking) {
      isScrollTicking = true;
      requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(SCROLL_POS_KEY, String(Math.round(window.scrollY)));
        } catch (e) {}
        isScrollTicking = false;
      });
    }
  }, { passive: true });

  // Mark reload and record position right before unload or pagehide
  window.addEventListener('beforeunload', () => {
    try {
      sessionStorage.setItem(IS_RELOADING_KEY, 'true');
      sessionStorage.setItem(SCROLL_POS_KEY, String(Math.round(window.scrollY)));
    } catch (e) {}
  });

  window.addEventListener('pagehide', () => {
    try {
      sessionStorage.setItem(IS_RELOADING_KEY, 'true');
      sessionStorage.setItem(SCROLL_POS_KEY, String(Math.round(window.scrollY)));
    } catch (e) {}
  });

  // Re-verify after DOM and assets load to counter any async image/font layout shifts
  document.addEventListener('DOMContentLoaded', () => {
    if (isPageReload && getSavedScrollPosition() > 30) {
      restoreScrollPosition(true);
    }
  });

  window.addEventListener('load', () => {
    if (isPageReload && getSavedScrollPosition() > 30) {
      restoreScrollPosition(true);
    }
  });
}

// Initialize scroll restoration and preloader immediately
initScrollRestoration();
initPreloader();

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initCalculator();
  initServiceFilters();
  initPortfolioFilters();
  initScrollTop();
  initPortfolioLightbox();
  initHeroShowcase();
  initFaqAccordion();
});

// Phone number for Sedirpak
const SEDIRPAK_PHONE = "905398471384";

/* ==========================================================================
   0. SITE PRELOADER (MINIMAL SWEEDING ANIMATION)
   ========================================================================== */
function initPreloader() {
  const preloader = document.getElementById('sitePreloader');
  if (!preloader) return;

  const savedY = getSavedScrollPosition();

  // If user refreshed the page while scrolled down, bypass preloader completely
  // so they instantly continue reading where they left off without delay
  if (isPageReload && savedY > 50) {
    preloader.style.display = 'none';
    preloader.classList.add('fade-out');
    document.body.classList.add('page-loaded');
    restoreScrollPosition(true);
    return;
  }

  const startTime = Date.now();
  const minDisplayTime = 1100; // minimum duration to show left and right dust sweeps

  function dismiss() {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, minDisplayTime - elapsed);

    setTimeout(() => {
      if (preloader.classList.contains('fade-out')) return;
      preloader.classList.add('fade-out');
      setTimeout(() => {
        preloader.style.display = 'none';
        document.body.classList.add('page-loaded');

        // Only smoothly scroll to hash if present in URL and NOT a reload with saved position
        if (window.location.hash && (!isPageReload || savedY <= 50)) {
          try {
            const target = document.querySelector(window.location.hash);
            if (target) {
              const header = document.getElementById('main-header');
              const headerHeight = header ? header.offsetHeight : 70;
              const targetTop = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
              window.scrollTo({
                top: Math.max(0, Math.round(targetTop)),
                behavior: 'smooth'
              });
            }
          } catch (err) {}
        } else if (isPageReload && savedY > 30) {
          restoreScrollPosition(true);
        }
      }, 500);
    }, remaining);
  }

  if (document.readyState === 'complete') {
    dismiss();
  } else {
    window.addEventListener('load', dismiss);
  }

  // Safety fallback
  setTimeout(dismiss, 2200);

  // Click to dismiss immediately
  preloader.addEventListener('click', () => {
    preloader.classList.add('fade-out');
    setTimeout(() => {
      preloader.style.display = 'none';
      document.body.classList.add('page-loaded');
      if (isPageReload && savedY > 30) {
        restoreScrollPosition(true);
      }
    }, 400);
  });
}

/* ==========================================================================
   1. NAVBAR & MOBILE DRAWER LOGIC
   ========================================================================== */
function initNavbar() {
  const header = document.getElementById('main-header');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');
  const drawerLinks = document.querySelectorAll('.drawer-link');

  // Dynamic sticky navbar state on scroll
  const updateNavbarState = () => {
    const scrollPos = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
    if (scrollPos > 25) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', updateNavbarState, { passive: true });
  updateNavbarState();

  const floatingGroup = document.querySelector('.floating-action-group');

  // Open Drawer
  const openDrawer = () => {
    mobileDrawer.classList.add('open');
    drawerBackdrop.classList.add('show');
    if (mobileMenuBtn) mobileMenuBtn.classList.add('active');
    if (floatingGroup) floatingGroup.style.opacity = '0';
    document.body.style.overflow = 'hidden';
  };

  // Close Drawer
  const closeDrawer = () => {
    mobileDrawer.classList.remove('open');
    drawerBackdrop.classList.remove('show');
    if (mobileMenuBtn) mobileMenuBtn.classList.remove('active');
    if (floatingGroup) floatingGroup.style.opacity = '';
    document.body.style.overflow = '';
  };

  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openDrawer);
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

  // Close drawer on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileDrawer && mobileDrawer.classList.contains('open')) {
      closeDrawer();
    }
  });

  // Smooth and Exact Offset Scrolling for All Anchor Links
  const isHomePage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
  const anchorSelector = isHomePage ? 'a[href^="#"], a[href^="index.html#"]' : 'a[href^="#"]';

  document.querySelectorAll(anchorSelector).forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const rawHref = this.getAttribute('href');
      const hashIndex = rawHref.indexOf('#');
      if (hashIndex === -1) return;
      const targetId = rawHref.substring(hashIndex);
      if (!targetId || targetId === '#' || targetId.length <= 1) return;
      const targetElement = document.querySelector(targetId);
      if (!targetElement) return;

      e.preventDefault();

      // If drawer is open, close it
      closeDrawer();

      if (targetId === '#hero') {
        try {
          sessionStorage.setItem(SCROLL_POS_KEY, '0');
        } catch (err) {}
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      } else {
        const header = document.getElementById('main-header');
        const headerHeight = header ? header.offsetHeight : 70;
        const targetTop = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;

        window.scrollTo({
          top: Math.max(0, Math.round(targetTop)),
          behavior: 'smooth'
        });
      }

      if (history.pushState) {
        history.pushState(null, null, targetId);
      }
    });
  });

  // Reset scroll position when brand logo is clicked
  document.querySelectorAll('.brand-logo').forEach(logo => {
    logo.addEventListener('click', (e) => {
      try {
        sessionStorage.setItem(SCROLL_POS_KEY, '0');
        sessionStorage.setItem('sedirpak_scroll_index', '0');
      } catch (err) {}
      if (isHomePage) {
        e.preventDefault();
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
        if (history.pushState) {
          history.pushState(null, null, window.location.pathname);
        }
      }
    });
  });

  // Scrollspy: dynamically update active nav-link based on scroll position
  const sections = document.querySelectorAll('section[id]');
  const desktopNavLinks = document.querySelectorAll('.nav-menu .nav-link');

  window.addEventListener('scroll', () => {
    let currentId = '';
    const scrollPos = window.scrollY + 140;

    sections.forEach(sec => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        currentId = sec.getAttribute('id');
      }
    });

    if (currentId) {
      desktopNavLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref === `#${currentId}` || linkHref === `index.html#${currentId}`) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }
  }, { passive: true });

  // Swipe-to-close touch gesture on mobile drawer
  if (mobileDrawer) {
    let touchStartX = 0;
    let touchEndX = 0;

    mobileDrawer.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    mobileDrawer.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      // If swiped towards right by more than 40px, close drawer
      if (touchEndX - touchStartX > 40) {
        closeDrawer();
      }
    }, { passive: true });
  }
}

/* ==========================================================================
   2. DYNAMIC PRICE & QUOTE CALCULATOR
   ========================================================================== */
function initCalculator() {
  const serviceEl = document.getElementById('calcService');
  const locationEl = document.getElementById('calcLocation');
  const siteNameEl = document.getElementById('calcSiteName');
  const aptCountEl = document.getElementById('calcApartmentCount');
  const aptCountDisplay = document.getElementById('aptCountDisplay');
  const elevatorEl = document.getElementById('calcElevator');
  const poolEl = document.getElementById('calcPool');
  const parkingEl = document.getElementById('calcParking');
  const floorsEl = document.getElementById('calcFloors');
  const frequencyEl = document.getElementById('calcFrequency');
  const urgencyEl = document.getElementById('calcUrgency');

  // Live summary elements
  const evalDescription = document.getElementById('evalDescription');
  const chipServiceText = document.getElementById('chipServiceText');
  const chipAptsText = document.getElementById('chipAptsText');
  const chipCleaningText = document.getElementById('chipCleaningText');
  const chipStaffText = document.getElementById('chipStaffText');
  const sendWhatsappBtn = document.getElementById('sendWhatsappBtn');

  if (!serviceEl || !sendWhatsappBtn) return;

  function updateCalculator() {
    const service = serviceEl.value;
    const location = locationEl.value;
    const siteName = siteNameEl.value.trim() || "Belirtilen Adres";
    const aptCount = parseInt(aptCountEl.value, 10) || 24;
    const elevator = elevatorEl ? elevatorEl.value : "Var (1 Adet)";
    const pool = poolEl ? poolEl.value : "Yok";
    const parking = parkingEl ? parkingEl.value : "Var (Açık Otopark)";
    const floors = floorsEl ? floorsEl.value : "5 - 8 Kat (Standart Apartman)";
    const frequency = frequencyEl ? frequencyEl.value : "Haftada 2 Gün";
    const urgency = urgencyEl.value;

    // Update Slider Label
    if (aptCountDisplay) aptCountDisplay.textContent = `${aptCount} Daire`;

    // Selected Option Text for Clean Chip Display (without arbitrary truncation)
    const selectedOption = serviceEl.options[serviceEl.selectedIndex];
    const serviceName = selectedOption ? selectedOption.textContent.trim() : service;
    if (chipServiceText) chipServiceText.textContent = serviceName;
    if (chipAptsText) chipAptsText.textContent = `${aptCount} Daire / Bölüm`;

    // Dynamic Description & Chips tailored for each service
    let desc = "";

    if (service.includes("Personel Temini")) {
      desc = `<strong>${siteName}</strong> bünyesinde görevlendirilmek üzere; tüm SGK, iş güvenliği (İSG), üniforma ve yasal bordrolama süreçleri SedirPak kurumsal güvencesinde olan eğitimli ve referanslı personel temini (temizlik görevlisi, danışma/karşılama personeli) organize edilecektir.`;
      if (chipCleaningText) chipCleaningText.textContent = frequency.includes("Daimi") ? "Tam Zamanlı (Daimi)" : "Sözleşmeli Personel";
      if (chipStaffText) chipStaffText.textContent = "SGK & Bordrolu Kadro";
    } else if (service.includes("İlaçlama") || service.includes("Dezenfeksiyon")) {
      desc = `<strong>${siteName}</strong> adresindeki ortak alanlar, sığınak, asansör boşlukları, çöp toplama alanları ve çevre hattı için T.C. Sağlık Bakanlığı onaylı biyosidal ruhsatlı ürünlerle garantili periyodik ilaçlama ve dezenfeksiyon planlanacaktır.`;
      if (chipCleaningText) chipCleaningText.textContent = "Biyosidal Ruhsatlı";
      if (chipStaffText) chipStaffText.textContent = "Garantili İlaçlama";
    } else if (service.includes("Havuz")) {
      desc = `<strong>${siteName}</strong> bünyesindeki açık ve kapalı yüzme havuzları için Sağlık Bakanlığı standartlarında periyodik pH/klor kimyasal analizi, filtre ters yıkama, kimyasal dozajlama ve uzman operatör periyodik bakım hizmeti sunulacaktır.`;
      if (chipCleaningText) chipCleaningText.textContent = "pH & Klor Analizi";
      if (chipStaffText) chipStaffText.textContent = "Uzman Havuz Operatörü";
    } else if (service.includes("Komple Tesis") || service.includes("Entegre")) {
      desc = `<strong>${siteName}</strong> lokasyonundaki tesis veya plazanız için idari & mali yönetim, teknik altyapı bakımı, 7/24 danışma, bahçe peyzaj ve endüstriyel hijyeni tek kurumsal çatı altında toplayan anahtar teslim entegre tesis yönetimi sunulacaktır.`;
      if (chipCleaningText) chipCleaningText.textContent = "Entegre Tesis Çözümü";
      if (chipStaffText) chipStaffText.textContent = "Tam Kapsamlı Yönetim";
    } else if (service.includes("İnşaat Sonrası")) {
      desc = `<strong>${siteName}</strong> bünyesindeki ${aptCount} bağımsız bölüm için kaba ve ince inşaat kalıntıları, harç/boya sökümü, endüstriyel zemin yıkama ve detaylı cam temizliği profesyonel ekiplerle anahtar teslim tamamlanacaktır.`;
      if (chipCleaningText) chipCleaningText.textContent = "Anahtar Teslim Temizlik";
      if (chipStaffText) chipStaffText.textContent = "Endüstriyel Temizlik Ekibi";
    } else if (service.includes("Dış Cephe")) {
      desc = `<strong>${siteName}</strong> binasının cephe mimarisi, cam metrajı ve yükseklik kriterlerine uygun İSG belgeli uzman sepetli vinç veya dağcı temizlik planlaması ile lekesiz ve güvenli dış cephe cam temizliği yapılacaktır.`;
      if (chipCleaningText) chipCleaningText.textContent = "Sepetli Vinç / Dağcı";
      if (chipStaffText) chipStaffText.textContent = "İSG Belgeli Uzman Kadro";
    } else if (service.includes("Ortak Alan") || service.includes("Merdiven")) {
      desc = `<strong>${siteName}</strong> adresindeki ${aptCount} dairelik yaşam alanınız için haftalık periyodik merdiven yıkama, asansör içi hijyen, bina girişi ve ortak alanların profesyonel temizliği düzenli mobil ekiplerimizce titizlikle yürütülecektir.`;
      if (chipCleaningText) chipCleaningText.textContent = frequency;
      if (chipStaffText) chipStaffText.textContent = aptCount >= 40 ? "Daimi Görevli" : "Düzenli Mobil Ekip";
    } else {
      // Profesyonel Site ve Apartman Yönetimi
      desc = `<strong>${siteName}</strong> adresindeki ${aptCount} dairelik yaşam alanınız için Kat Mülkiyeti Kanunu'na (KMK) %100 uyumlu şeffaf aidat takibi, resmi defter tutumu, periyodik temizlik planı ve yasal genel kurul divan yönetimi SedirPak güvencesiyle sağlanacaktır.`;
      if (chipCleaningText) chipCleaningText.textContent = frequency;
      if (chipStaffText) {
        if (aptCount >= 60 || frequency.includes("Daimi Görevli")) {
          chipStaffText.textContent = "Daimi Görevli";
        } else if (aptCount >= 20) {
          chipStaffText.textContent = "%100 KMK Mevzuat Uyumu";
        } else {
          chipStaffText.textContent = "Butik Yönetim Desteği";
        }
      }
    }

    if (evalDescription) evalDescription.innerHTML = desc;

    // Generate Structured WhatsApp Message (Matching Cleaning and Management Inquiry)
    const whatsappText = `Merhaba, SedirPak web sitenizdeki fiyat ve ön bilgi formundan ulaşıyorum.

- *Talep Edilen Hizmet:* ${service}
- *Lokasyon / Şube:* ${location}
- *Adres:* ${siteName}
- *Daire / Bağımsız Bölüm Sayısı:* ${aptCount} Birim
- *Blok / Kat Yapısı:* ${floors}
- *Asansör Durumu:* ${elevator}
- *Havuz / Sosyal Alan:* ${pool}
- *Otopark & Çevre:* ${parking}
- *Tercih Edilen Temizlik Sıklığı:* ${frequency}
- *Süreç Aciliyeti:* ${urgency}

Bu projemiz için fiyat teklifi ve ön görüşme randevusu talep ediyorum.`;

    // Build Clickable WhatsApp Link
    const encodedMsg = encodeURIComponent(whatsappText);
    const waUrl = `https://wa.me/${SEDIRPAK_PHONE}?text=${encodedMsg}`;
    sendWhatsappBtn.setAttribute('href', waUrl);
  }

  // Bind inputs to real-time update
  const inputs = [
    serviceEl, locationEl, siteNameEl, aptCountEl, 
    elevatorEl, poolEl, parkingEl, floorsEl, frequencyEl, urgencyEl
  ].filter(Boolean);

  inputs.forEach(input => {
    input.addEventListener('input', updateCalculator);
    input.addEventListener('change', updateCalculator);
  });

  // Run initial calculation
  updateCalculator();

  // Initialize custom accessible selects (prevents mobile/devtools dropdown overflow)
  initCustomSelects();
}

function initCustomSelects() {
  const selects = document.querySelectorAll('.calculator-section select.form-control');
  if (!selects.length) return;

  selects.forEach(select => {
    if (select.dataset.customized === 'true') return;
    select.dataset.customized = 'true';

    // Wrapper container
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';

    // Move select into wrapper and hide natively
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    select.classList.add('custom-select-native');

    // Trigger button
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    trigger.tabIndex = 0;
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const label = document.createElement('span');
    label.className = 'cs-label';
    const selectedOpt = select.options[select.selectedIndex];
    label.textContent = selectedOpt ? selectedOpt.textContent : (select.options[0]?.textContent || '');

    const arrow = document.createElement('i');
    arrow.className = 'fa-solid fa-chevron-down cs-arrow';

    trigger.appendChild(label);
    trigger.appendChild(arrow);
    wrapper.appendChild(trigger);

    // Dropdown list
    const dropdown = document.createElement('div');
    dropdown.className = 'custom-select-dropdown';
    dropdown.setAttribute('role', 'listbox');

    function renderOptions() {
      dropdown.innerHTML = '';
      Array.from(select.options).forEach(opt => {
        const optionEl = document.createElement('div');
        optionEl.className = 'custom-select-option' + (opt.selected ? ' is-selected' : '');
        optionEl.setAttribute('role', 'option');
        optionEl.setAttribute('aria-selected', opt.selected ? 'true' : 'false');
        optionEl.dataset.value = opt.value;

        const optText = document.createElement('span');
        optText.textContent = opt.textContent;

        const checkIcon = document.createElement('i');
        checkIcon.className = 'fa-solid fa-check cs-check';

        optionEl.appendChild(optText);
        optionEl.appendChild(checkIcon);

        optionEl.addEventListener('click', (e) => {
          e.stopPropagation();
          select.value = opt.value;
          label.textContent = opt.textContent;
          wrapper.classList.remove('is-open');
          trigger.setAttribute('aria-expanded', 'false');
          renderOptions();
          select.dispatchEvent(new Event('input', { bubbles: true }));
          select.dispatchEvent(new Event('change', { bubbles: true }));
        });

        dropdown.appendChild(optionEl);
      });
    }

    renderOptions();
    wrapper.appendChild(dropdown);

    // Toggle dropdown on trigger click
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = wrapper.classList.contains('is-open');
      document.querySelectorAll('.custom-select-wrapper.is-open').forEach(w => {
        if (w !== wrapper) {
          w.classList.remove('is-open');
          w.querySelector('.custom-select-trigger')?.setAttribute('aria-expanded', 'false');
        }
      });

      if (isOpen) {
        wrapper.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      } else {
        wrapper.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });

    // Keyboard support
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        trigger.click();
      } else if (e.key === 'Escape') {
        wrapper.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    // Sync when select value changes programmatically
    select.addEventListener('change', () => {
      const curOpt = select.options[select.selectedIndex];
      if (curOpt) {
        label.textContent = curOpt.textContent;
      }
      renderOptions();
    });
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select-wrapper')) {
      document.querySelectorAll('.custom-select-wrapper.is-open').forEach(w => {
        w.classList.remove('is-open');
        w.querySelector('.custom-select-trigger')?.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.custom-select-wrapper.is-open').forEach(w => {
        w.classList.remove('is-open');
        w.querySelector('.custom-select-trigger')?.setAttribute('aria-expanded', 'false');
      });
    }
  });
}

// Global function to quick-select apartment count
window.setApartmentCount = function(count) {
  const aptCountEl = document.getElementById('calcApartmentCount');
  if (aptCountEl) {
    aptCountEl.value = count;
    aptCountEl.dispatchEvent(new Event('input'));
  }
};

// Global function to select service from cards and smooth scroll to calculator
window.selectServiceForCalc = function(serviceName) {
  const serviceEl = document.getElementById('calcService');
  const calcSection = document.getElementById('hesaplayici');
  if (serviceEl && calcSection) {
    serviceEl.value = serviceName;
    serviceEl.dispatchEvent(new Event('change'));

    const header = document.getElementById('main-header');
    const headerHeight = header ? header.offsetHeight : 70;
    const targetTop = calcSection.getBoundingClientRect().top + window.pageYOffset - headerHeight;

    window.scrollTo({
      top: Math.max(0, Math.round(targetTop)),
      behavior: 'smooth'
    });
  }
};

/* ==========================================================================
   3. SERVICES CATEGORY FILTER TABS
   ========================================================================== */
function initServiceFilters() {
  const filterTabs = document.querySelectorAll('.filter-tab');
  const serviceCards = document.querySelectorAll('.service-card');

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.getAttribute('data-filter');

      serviceCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          card.style.display = 'flex';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 50);
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

/* ==========================================================================
   3B. PORTFOLIO CATEGORY FILTER TABS
   ========================================================================== */
function initPortfolioFilters() {
  const pFilterTabs = document.querySelectorAll('.portfolio-filter-tab');
  const portfolioItems = document.querySelectorAll('#portfolioGrid .portfolio-item');
  if (!pFilterTabs.length || !portfolioItems.length) return;

  pFilterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      pFilterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.getAttribute('data-filter');

      portfolioItems.forEach(item => {
        const category = item.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          item.style.display = 'block';
          setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
          }, 30);
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
}

/* ==========================================================================
   4. SCROLL TO TOP & FLOATING ACTIONS
   ========================================================================== */
function initScrollTop() {
  const scrollTopBtn = document.getElementById('scrollTopBtn');
  if (!scrollTopBtn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 350) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  });

  scrollTopBtn.addEventListener('click', () => {
    try {
      sessionStorage.setItem(SCROLL_POS_KEY, '0');
    } catch (err) {}
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

/* ==========================================================================
   5. PORTFOLIO LIGHTBOX MODAL
   ========================================================================== */
function initPortfolioLightbox() {
  const modal = document.getElementById('portfolioLightbox');
  if (!modal) return;

  const backdrop = document.getElementById('lightboxBackdrop');
  const closeBtn = document.getElementById('lightboxCloseBtn');
  const modalImg = document.getElementById('lightboxImg');
  const modalCategory = document.getElementById('lightboxCategory');
  const modalTitle = document.getElementById('lightboxTitle');
  const modalDesc = document.getElementById('lightboxDesc');

  function openLightbox(item) {
    const img = item.querySelector('img');
    const category = item.querySelector('.p-category');
    const title = item.querySelector('.p-title');
    const desc = item.querySelector('.p-desc');

    if (img && modalImg) {
      modalImg.src = img.src;
      modalImg.alt = img.alt || '';
    }
    if (category && modalCategory) modalCategory.textContent = category.textContent;
    if (title && modalTitle) modalTitle.textContent = title.textContent;
    if (desc && modalDesc) modalDesc.textContent = desc.textContent;

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.portfolio-item').forEach(item => {
    item.addEventListener('click', () => openLightbox(item));
  });

  if (backdrop) backdrop.addEventListener('click', closeLightbox);
  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeLightbox();
    }
  });
}

/* ==========================================================================
   6. HERO INTERACTIVE SHOWCASE SLIDER
   ========================================================================== */
let heroSlideTimer = null;
let currentHeroIndex = 0;

window.switchHeroSlide = function(index) {
  const tabs = document.querySelectorAll('.showcase-tab');
  const slides = document.querySelectorAll('.showcase-slide');
  if (!tabs.length || !slides.length) return;

  const validIndex = (index + slides.length) % slides.length;
  currentHeroIndex = validIndex;

  tabs.forEach((tab, i) => {
    const isActive = i === validIndex;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  slides.forEach((slide, i) => {
    slide.classList.toggle('active', i === validIndex);
  });

  restartHeroTimer();
};

function startHeroTimer() {
  stopHeroTimer();
  heroSlideTimer = setInterval(() => {
    const slides = document.querySelectorAll('.showcase-slide');
    if (slides.length > 1) {
      window.switchHeroSlide((currentHeroIndex + 1) % slides.length);
    }
  }, 5000);
}

function stopHeroTimer() {
  if (heroSlideTimer) {
    clearInterval(heroSlideTimer);
    heroSlideTimer = null;
  }
}

function restartHeroTimer() {
  stopHeroTimer();
  startHeroTimer();
}

function initHeroShowcase() {
  const stage = document.querySelector('.hero-showcase-stage');
  if (!stage) return;

  startHeroTimer();

  // Pause on hover so user can read without slide jumping away
  stage.addEventListener('mouseenter', stopHeroTimer);
  stage.addEventListener('mouseleave', startHeroTimer);

  // Pause on mobile touch
  stage.addEventListener('touchstart', stopHeroTimer, { passive: true });
  stage.addEventListener('touchend', startHeroTimer, { passive: true });
}

/* ==========================================================================
   7. SSS (FAQ) ACCORDION, SEARCH & GEO CATEGORY LOGIC
   ========================================================================== */
function initFaqAccordion() {
  const container = document.getElementById('faqAccordion');
  if (!container) return;

  const faqItems = Array.from(container.querySelectorAll('.faq-item'));
  const searchInput = document.getElementById('faqSearchInput');
  const searchClearBtn = document.getElementById('faqSearchClearBtn');
  const resetSearchBtn = document.getElementById('faqResetSearchBtn');
  const catButtons = Array.from(document.querySelectorAll('.faq-cat-btn'));
  const countNumber = document.getElementById('faqCountNumber');
  const toggleAllBtn = document.getElementById('faqToggleAllBtn');
  const toggleAllText = document.getElementById('toggleAllText');
  const toggleAllIcon = document.getElementById('toggleAllIcon');
  const emptyState = document.getElementById('faqEmptyState');

  let activeCategory = 'all';
  let searchQuery = '';

  // Listen to native toggle events on details elements
  faqItems.forEach(item => {
    item.addEventListener('toggle', () => {
      item.classList.toggle('active', item.open);
      updateToggleAllButtonState();
    });
  });

  // Filter items based on activeCategory and searchQuery
  function filterItems() {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('tr');
    let visibleCount = 0;

    faqItems.forEach(item => {
      const itemCategory = item.getAttribute('data-category');
      const matchesCategory = activeCategory === 'all' || itemCategory === activeCategory;

      let matchesSearch = true;
      if (normalizedQuery.length > 0) {
        const titleText = item.querySelector('.faq-question-title')?.textContent.toLocaleLowerCase('tr') || '';
        const bodyText = item.querySelector('.faq-answer-inner')?.textContent.toLocaleLowerCase('tr') || '';
        const tagText = item.querySelector('.faq-cat-tag')?.textContent.toLocaleLowerCase('tr') || '';
        matchesSearch = titleText.includes(normalizedQuery) || bodyText.includes(normalizedQuery) || tagText.includes(normalizedQuery);
      }

      const isVisible = matchesCategory && matchesSearch;
      if (isVisible) {
        item.style.display = 'block';
        visibleCount++;
        // If user searched for a specific term, auto-expand the matched question
        if (normalizedQuery.length > 1 && matchesSearch) {
          item.open = true;
          item.classList.add('active');
        }
      } else {
        item.style.display = 'none';
      }
    });

    if (countNumber) {
      countNumber.textContent = visibleCount;
    }

    if (emptyState) {
      emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
    }

    updateToggleAllButtonState();
  }

  // Category filter tabs
  catButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      catButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      activeCategory = btn.getAttribute('data-category') || 'all';
      filterItems();
    });
  });

  // Live search handler
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (searchClearBtn) {
        searchClearBtn.style.display = searchQuery.length > 0 ? 'block' : 'none';
      }
      filterItems();
    });
  }

  // Clear search button
  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      searchQuery = '';
      searchClearBtn.style.display = 'none';
      filterItems();
    });
  }

  // Reset search button inside empty state
  if (resetSearchBtn) {
    resetSearchBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchQuery = '';
      if (searchClearBtn) searchClearBtn.style.display = 'none';

      // Reset to 'all' tab
      catButtons.forEach((b, idx) => {
        const isFirst = idx === 0;
        b.classList.toggle('active', isFirst);
        b.setAttribute('aria-selected', isFirst ? 'true' : 'false');
      });
      activeCategory = 'all';

      filterItems();
    });
  }

  // Toggle all expand/collapse
  function updateToggleAllButtonState() {
    if (!toggleAllBtn || !toggleAllText || !toggleAllIcon) return;
    const visibleItems = faqItems.filter(item => item.style.display !== 'none');
    if (!visibleItems.length) return;

    const allOpen = visibleItems.every(item => item.open);
    if (allOpen) {
      toggleAllText.textContent = 'Tümünü Kapat';
      toggleAllIcon.className = 'fa-solid fa-angles-up';
    } else {
      toggleAllText.textContent = 'Tümünü Genişlet';
      toggleAllIcon.className = 'fa-solid fa-angles-down';
    }
  }

  if (toggleAllBtn) {
    toggleAllBtn.addEventListener('click', () => {
      const visibleItems = faqItems.filter(item => item.style.display !== 'none');
      const allOpen = visibleItems.every(item => item.open);
      visibleItems.forEach(item => {
        item.open = !allOpen;
        item.classList.toggle('active', !allOpen);
      });
      updateToggleAllButtonState();
    });
  }

  // Deep linking: If URL has hash e.g. #soru-ucretsiz-inceleme
  if (window.location.hash) {
    const targetHash = window.location.hash.substring(1);
    const targetItem = document.getElementById(targetHash);
    if (targetItem && (targetItem.classList.contains('faq-item') || targetItem.tagName === 'DETAILS')) {
      setTimeout(() => {
        targetItem.open = true;
        targetItem.classList.add('active');
        targetItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 350);
    }
  }
}




