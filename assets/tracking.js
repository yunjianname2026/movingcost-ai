(function () {
  'use strict';

  var MEASUREMENT_ID = 'G-22NEPD9J8R';
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

  function captureUtms() {
    try {
      var params = new URLSearchParams(window.location.search);
      UTM_KEYS.forEach(function (key) {
        var value = params.get(key);
        if (value) sessionStorage.setItem('mc_' + key, value);
      });
    } catch (e) {}
  }

  function getUtms() {
    var utms = {};
    UTM_KEYS.forEach(function (key) {
      try {
        var value = sessionStorage.getItem('mc_' + key);
        if (value) utms[key] = value;
      } catch (e) {}
    });
    return utms;
  }

  function sanitizeParams(params) {
    if (!params || typeof params !== 'object') return {};
    var clean = {};
    Object.keys(params).forEach(function (key) {
      if (/email/i.test(key)) return;
      var value = params[key];
      if (value == null) return;
      if (typeof value === 'string') {
        if (value.indexOf('@') !== -1) return;
        if (value.length > 120) value = value.slice(0, 120);
      }
      clean[key] = value;
    });
    return clean;
  }

  function initGa() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
    script.onerror = function () {};
    document.head.appendChild(script);
    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID, {
      anonymize_ip: true,
      send_page_view: true
    });
  }

  window.trackEvent = function (name, params) {
    try {
      if (typeof window.gtag !== 'function' || !name) return;
      var payload = sanitizeParams(params || {});
      var utms = getUtms();
      Object.keys(utms).forEach(function (key) {
        if (payload[key] == null) payload[key] = utms[key];
      });
      window.gtag('event', name, payload);
    } catch (e) {}
  };

  function pagePath() {
    var path = window.location.pathname || '/';
    if (path.endsWith('/index.html')) path = path.replace(/index\.html$/, '');
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return path || '/';
  }

  function blogSlug() {
    var match = pagePath().match(/\/blog\/([^/]+)/);
    if (match) return match[1];
    if (pagePath() === '/blog') return 'blog_index';
    return '';
  }

  function ctaLocation(link) {
    var section = link.closest('section[id]');
    if (section && section.id) return 'homepage_' + section.id;
    if (link.closest('.hero')) return 'homepage_hero';
    if (link.closest('nav')) return 'nav';
    if (link.closest('footer')) return 'footer';
    return 'homepage_other';
  }

  function partnerApplyLocation(link) {
    if (link.closest('.partner-card')) return 'partner_program';
    var block = link.closest('.cat-block[id]');
    if (block && block.id) return 'category_' + block.id;
    if (link.closest('.partner-slot')) return 'category_slot';
    return 'services_other';
  }

  function onDocumentClick(event) {
    var link = event.target.closest('a[href]');
    if (!link) return;

    var href = link.getAttribute('href') || '';
    var path = pagePath();

    if (path === '/' && link.classList.contains('svc-card') && href.indexOf('/services#') === 0) {
      window.trackEvent('homepage_service_click', {
        service_category: href.split('#')[1] || 'unknown',
        link_url: href
      });
      return;
    }

    if (path === '/' && link.classList.contains('why-card')) {
      window.trackEvent('homepage_benefit_click', {
        benefit_name: (link.querySelector('.why-title') || {}).textContent || 'unknown',
        link_url: href
      });
      return;
    }

    if (path === '/' && link.classList.contains('guide-read') && href.indexOf('/blog/') === 0) {
      window.trackEvent('homepage_guide_click', {
        article_slug: href.replace(/^\/blog\//, ''),
        link_url: href
      });
      return;
    }

    if ((path === '/services' || path.endsWith('/services.html')) && link.classList.contains('cat-card') && href.charAt(0) === '#') {
      window.trackEvent('services_category_click', {
        category_id: href.slice(1) || 'unknown',
        link_url: href
      });
      return;
    }

    if ((path === '/services' || path.endsWith('/services.html')) && href === '/contact' && link.closest('.partner-card, .partner-slot, .partner-cta-wrap, .partner-trust-zone')) {
      window.trackEvent('services_partner_apply_click', {
        location: partnerApplyLocation(link),
        link_url: href
      });
      return;
    }

    if (blogSlug() && link.classList.contains('cta-btn')) {
      var target = 'other';
      if (href.indexOf('/planner') === 0) target = 'planner';
      else if (href.indexOf('/earthsoul') === 0) target = 'earthsoul';
      window.trackEvent('blog_cta_click', {
        article_slug: blogSlug(),
        cta_target: target,
        link_url: href
      });
      return;
    }

    if (path === '/' && (href === '/planner' || href.indexOf('/planner') === 0 || href === '/services' || href.indexOf('/earthsoul') === 0 || href.indexOf('/blog/') === 0)) {
      window.trackEvent('cta_click', {
        cta_location: ctaLocation(link),
        link_url: href,
        cta_label: (link.textContent || '').trim().slice(0, 80)
      });
    }
  }

  captureUtms();
  initGa();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      document.addEventListener('click', onDocumentClick, true);
    });
  } else {
    document.addEventListener('click', onDocumentClick, true);
  }
})();
