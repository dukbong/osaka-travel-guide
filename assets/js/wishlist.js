/**
 * Osaka Travel Guide - Wishlist Management
 * Heart toggle, localStorage persistence, badge count, cross-page sync
 * Uses same storage key as app.js: 'osakaWishlist'
 */
(function() {
  'use strict';

  var STORAGE_KEY = 'osakaWishlist';
  var CUSTOM_EVENT_NAME = 'osakaWishlistChanged';

  var Wishlist = {

    init: function() {
      this.bindEvents();
      this.syncAllButtons();
      this.updateBadge();
      this.listenForStorageChanges();
    },

    // --- Storage ---
    getList: function() {
      try {
        var data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return Array.isArray(data) ? data : [];
      } catch (e) {
        return [];
      }
    },

    saveList: function(list) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch (e) {
        // localStorage full or unavailable
      }
      this.updateBadge();
      this.dispatchChangeEvent();
    },

    isInWishlist: function(pid) {
      return this.getList().indexOf(pid) !== -1;
    },

    toggle: function(pid) {
      var list = this.getList();
      var idx = list.indexOf(pid);
      var added = false;

      if (idx === -1) {
        list.push(pid);
        added = true;
      } else {
        list.splice(idx, 1);
      }

      this.saveList(list);
      return added;
    },

    add: function(pid) {
      var list = this.getList();
      if (list.indexOf(pid) === -1) {
        list.push(pid);
        this.saveList(list);
      }
    },

    remove: function(pid) {
      var list = this.getList();
      var idx = list.indexOf(pid);
      if (idx !== -1) {
        list.splice(idx, 1);
        this.saveList(list);
      }
    },

    clear: function() {
      this.saveList([]);
      this.syncAllButtons();
    },

    // --- Event Binding ---
    bindEvents: function() {
      var self = this;

      // Event delegation for all wishlist heart buttons
      document.addEventListener('click', function(e) {
        var btn = e.target.closest('.btn-wishlist, .btn-wishlist-detail, [data-wishlist-toggle]');
        if (!btn) return;

        e.preventDefault();
        e.stopPropagation();

        var pid = self.parseProductId(btn.dataset.productId);
        if (pid === null) return;

        var added = self.toggle(pid);
        self.updateButton(btn, added);

        if (added) {
          self.animateHeart(btn);
        }

        // Sync other buttons for the same product on the page
        self.syncButtonsForProduct(pid, added);
      });
    },

    // --- UI Updates ---
    updateButton: function(btn, isWishlisted) {
      if (isWishlisted) {
        btn.classList.add('wishlisted');
        btn.setAttribute('aria-label', '위시리스트에서 제거');
      } else {
        btn.classList.remove('wishlisted');
        btn.setAttribute('aria-label', '위시리스트에 추가');
      }
    },

    animateHeart: function(btn) {
      var icon = btn.querySelector('.heart-icon, svg, i');
      if (icon) {
        icon.classList.add('heart-animate');
        setTimeout(function() {
          icon.classList.remove('heart-animate');
        }, 400);
      }

      // Also animate the button itself as fallback
      btn.classList.add('wishlist-pop');
      setTimeout(function() {
        btn.classList.remove('wishlist-pop');
      }, 300);
    },

    syncAllButtons: function() {
      var self = this;
      var list = this.getList();

      document.querySelectorAll('.btn-wishlist, .btn-wishlist-detail, [data-wishlist-toggle]').forEach(function(btn) {
        var pid = self.parseProductId(btn.dataset.productId);
        if (pid === null) return;
        self.updateButton(btn, list.indexOf(pid) !== -1);
      });
    },

    syncButtonsForProduct: function(pid, isWishlisted) {
      var self = this;
      document.querySelectorAll('.btn-wishlist, .btn-wishlist-detail, [data-wishlist-toggle]').forEach(function(btn) {
        var btnPid = self.parseProductId(btn.dataset.productId);
        if (btnPid === pid) {
          self.updateButton(btn, isWishlisted);
        }
      });
    },

    updateBadge: function() {
      var count = this.getList().length;

      // Update all possible badge elements
      var selectors = [
        '#navWishlistCount',
        '.wishlist-badge',
        '[data-wishlist-count]'
      ];

      selectors.forEach(function(sel) {
        var els = document.querySelectorAll(sel);
        els.forEach(function(el) {
          if (count > 0) {
            el.textContent = count > 99 ? '99+' : String(count);
            el.style.display = '';
            el.classList.add('has-items');
          } else {
            el.textContent = '';
            el.style.display = 'none';
            el.classList.remove('has-items');
          }
        });
      });
    },

    // --- Cross-Page Sync ---
    dispatchChangeEvent: function() {
      // Custom event for same-page listeners
      var event;
      try {
        event = new CustomEvent(CUSTOM_EVENT_NAME, {
          detail: { list: this.getList() }
        });
      } catch (e) {
        // Fallback for older browsers
        event = document.createEvent('CustomEvent');
        event.initCustomEvent(CUSTOM_EVENT_NAME, true, true, { list: this.getList() });
      }
      document.dispatchEvent(event);
    },

    listenForStorageChanges: function() {
      var self = this;

      // Listen for changes from other tabs/windows
      window.addEventListener('storage', function(e) {
        if (e.key === STORAGE_KEY) {
          self.syncAllButtons();
          self.updateBadge();
        }
      });

      // Listen for custom event within same page
      document.addEventListener(CUSTOM_EVENT_NAME, function() {
        self.syncAllButtons();
        self.updateBadge();
      });
    },

    // --- Wishlist Page Rendering ---
    renderWishlistPage: function(containerSelector) {
      var container = document.querySelector(containerSelector || '[data-wishlist-container]');
      if (!container || !window.PRODUCTS) return;

      var list = this.getList();
      var self = this;

      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      if (list.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'wishlist-empty';
        empty.style.cssText = 'text-align:center;padding:3rem 1rem;color:#888;';

        var icon = document.createElement('div');
        icon.style.fontSize = '2.5rem';
        icon.textContent = '♡';
        empty.appendChild(icon);

        var title = document.createElement('p');
        title.style.cssText = 'font-size:1.1rem;font-weight:600;margin:0.75rem 0 0.5rem;';
        title.textContent = '위시리스트가 비어있습니다';
        empty.appendChild(title);

        var desc = document.createElement('p');
        desc.style.fontSize = '0.9rem';
        desc.textContent = '마음에 드는 상품의 하트를 눌러 추가해 보세요.';
        empty.appendChild(desc);

        container.appendChild(empty);
        return;
      }

      list.forEach(function(pid) {
        var product = window.PRODUCTS.find(function(p) { return p.id === pid; });
        if (!product) return;

        var card = document.createElement('div');
        card.className = 'wishlist-item';
        card.style.cssText = 'display:flex;gap:12px;padding:12px;border:1px solid #eee;border-radius:8px;margin-bottom:8px;align-items:center;';

        var img = document.createElement('img');
        img.src = product.image;
        img.alt = '';
        img.style.cssText = 'width:64px;height:64px;object-fit:cover;border-radius:6px;flex-shrink:0;';
        card.appendChild(img);

        var info = document.createElement('div');
        info.style.cssText = 'flex:1;min-width:0;';

        var name = document.createElement('div');
        name.style.cssText = 'font-weight:600;font-size:0.9rem;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        name.textContent = product.name;
        info.appendChild(name);

        var price = document.createElement('div');
        price.style.cssText = 'color:#e53e3e;font-weight:700;font-size:0.9rem;';
        price.textContent = (product.salePrice || 0).toLocaleString() + '원';
        info.appendChild(price);

        card.appendChild(info);

        var removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = '\u00d7';
        removeBtn.style.cssText = 'border:none;background:none;font-size:1.3rem;cursor:pointer;color:#999;padding:4px 8px;flex-shrink:0;';
        removeBtn.setAttribute('aria-label', '제거');
        removeBtn.addEventListener('click', function() {
          self.remove(pid);
          self.syncAllButtons();
          self.renderWishlistPage(containerSelector);
        });
        card.appendChild(removeBtn);

        container.appendChild(card);
      });
    },

    // --- Utility ---
    parseProductId: function(raw) {
      if (raw === undefined || raw === null) return null;
      var num = Number(raw);
      return isNaN(num) ? raw : num;
    },

    /** Get product objects for all wishlisted items */
    getProducts: function() {
      if (!window.PRODUCTS) return [];
      var list = this.getList();
      return window.PRODUCTS.filter(function(p) {
        return list.indexOf(p.id) !== -1;
      });
    }
  };

  window.Wishlist = Wishlist;

  document.addEventListener('DOMContentLoaded', function() {
    Wishlist.init();
  });
})();
