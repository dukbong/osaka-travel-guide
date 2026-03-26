/**
 * Osaka Travel Guide - Main Application JS
 * Handles: navigation, wishlist, compare, planner buttons
 */
(function() {
  'use strict';

  var App = {
    compareList: [],
    maxCompare: 3,

    init: function() {
      this.initHamburger();
      this.initWishlistButtons();
      this.initCompareCheckboxes();
      this.initPlannerButtons();
      this.initComparePanel();
      this.updateWishlistCount();
    },

    // --- Hamburger Menu ---
    initHamburger: function() {
      var hamburger = document.getElementById('hamburger');
      var mobileMenu = document.getElementById('mobileMenu');
      if (!hamburger || !mobileMenu) return;

      hamburger.addEventListener('click', function() {
        hamburger.classList.toggle('active');
        mobileMenu.classList.toggle('open');
      });

      // Close on link click
      var links = mobileMenu.querySelectorAll('a');
      links.forEach(function(link) {
        link.addEventListener('click', function() {
          hamburger.classList.remove('active');
          mobileMenu.classList.remove('open');
        });
      });
    },

    // --- Wishlist ---
    getWishlist: function() {
      try {
        return JSON.parse(localStorage.getItem('osakaWishlist') || '[]');
      } catch(e) {
        return [];
      }
    },

    saveWishlist: function(list) {
      localStorage.setItem('osakaWishlist', JSON.stringify(list));
      this.updateWishlistCount();
    },

    toggleWishlist: function(productId) {
      var list = this.getWishlist();
      var idx = list.indexOf(productId);
      if (idx === -1) {
        list.push(productId);
      } else {
        list.splice(idx, 1);
      }
      this.saveWishlist(list);
      return idx === -1; // returns true if added
    },

    updateWishlistCount: function() {
      var count = this.getWishlist().length;
      var el = document.getElementById('navWishlistCount');
      if (el) {
        if (count > 0) {
          el.textContent = count;
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      }
    },

    initWishlistButtons: function() {
      var self = this;
      var wishlist = self.getWishlist();

      document.querySelectorAll('.btn-wishlist').forEach(function(btn) {
        var pid = parseInt(btn.dataset.productId, 10) || btn.dataset.productId;
        // Check if numeric
        if (!isNaN(Number(btn.dataset.productId))) pid = Number(btn.dataset.productId);

        if (wishlist.indexOf(pid) !== -1) {
          btn.classList.add('wishlisted');
        } else {
          btn.classList.remove('wishlisted');
        }

        // Remove old listeners by cloning
        var newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var id = parseInt(newBtn.dataset.productId, 10) || newBtn.dataset.productId;
          if (!isNaN(Number(newBtn.dataset.productId))) id = Number(newBtn.dataset.productId);
          var added = self.toggleWishlist(id);
          if (added) {
            newBtn.classList.add('wishlisted');
            var icon = newBtn.querySelector('.heart-icon');
            if (icon) {
              icon.classList.add('heart-animate');
              setTimeout(function() { icon.classList.remove('heart-animate'); }, 400);
            }
          } else {
            newBtn.classList.remove('wishlisted');
          }
        });
      });

      // Detail page wishlist button
      document.querySelectorAll('.btn-wishlist-detail').forEach(function(btn) {
        var pid = parseInt(btn.dataset.productId, 10) || btn.dataset.productId;
        if (!isNaN(Number(btn.dataset.productId))) pid = Number(btn.dataset.productId);

        if (wishlist.indexOf(pid) !== -1) {
          btn.classList.add('wishlisted');
        }

        btn.addEventListener('click', function(e) {
          e.preventDefault();
          var id = parseInt(btn.dataset.productId, 10) || btn.dataset.productId;
          if (!isNaN(Number(btn.dataset.productId))) id = Number(btn.dataset.productId);
          var added = self.toggleWishlist(id);
          if (added) {
            btn.classList.add('wishlisted');
            var icon = btn.querySelector('.heart-icon');
            if (icon) {
              icon.classList.add('heart-animate');
              setTimeout(function() { icon.classList.remove('heart-animate'); }, 400);
            }
          } else {
            btn.classList.remove('wishlisted');
          }
        });
      });
    },

    // --- Compare ---
    initCompareCheckboxes: function() {
      var self = this;
      document.querySelectorAll('.compare-checkbox').forEach(function(cb) {
        var newCb = cb.cloneNode(true);
        cb.parentNode.replaceChild(newCb, cb);

        newCb.addEventListener('change', function() {
          var pid = parseInt(newCb.dataset.productId, 10) || newCb.dataset.productId;
          if (!isNaN(Number(newCb.dataset.productId))) pid = Number(newCb.dataset.productId);

          if (newCb.checked) {
            if (self.compareList.length >= self.maxCompare) {
              newCb.checked = false;
              alert('\ucd5c\ub300 ' + self.maxCompare + '\uac1c\uae4c\uc9c0 \ube44\uad50\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.');
              return;
            }
            if (self.compareList.indexOf(pid) === -1) {
              self.compareList.push(pid);
            }
          } else {
            self.compareList = self.compareList.filter(function(id) { return id !== pid; });
          }
          self.updateComparePanel();
        });
      });
    },

    initComparePanel: function() {
      var self = this;
      var panel = document.getElementById('comparePanel');
      var closeBtn = document.getElementById('compareClose');
      var actionBtn = document.getElementById('compareAction');
      var modal = document.getElementById('compareModal');
      var modalClose = document.getElementById('compareModalClose');

      if (!panel) return;

      if (closeBtn) {
        closeBtn.addEventListener('click', function() {
          self.compareList = [];
          self.updateComparePanel();
          document.querySelectorAll('.compare-checkbox').forEach(function(cb) {
            cb.checked = false;
          });
        });
      }

      if (actionBtn) {
        actionBtn.addEventListener('click', function() {
          if (self.compareList.length < 2) return;
          self.showCompareModal();
        });
      }

      if (modalClose) {
        modalClose.addEventListener('click', function() {
          modal.classList.remove('open');
        });
      }

      if (modal) {
        modal.addEventListener('click', function(e) {
          if (e.target === modal) modal.classList.remove('open');
        });
      }
    },

    updateComparePanel: function() {
      var panel = document.getElementById('comparePanel');
      var countEl = document.getElementById('compareCount');
      var itemsEl = document.getElementById('compareItems');
      var actionBtn = document.getElementById('compareAction');

      if (!panel) return;

      if (this.compareList.length > 0) {
        panel.classList.add('visible');
      } else {
        panel.classList.remove('visible');
      }

      if (countEl) countEl.textContent = this.compareList.length;
      if (actionBtn) actionBtn.disabled = this.compareList.length < 2;

      if (itemsEl && window.PRODUCTS) {
        itemsEl.textContent = '';
        var self = this;
        this.compareList.forEach(function(pid) {
          var p = window.PRODUCTS.find(function(pr) { return pr.id === pid; });
          if (!p) return;

          var item = document.createElement('div');
          item.className = 'compare-item';

          var img = document.createElement('img');
          img.src = p.image;
          img.alt = '';
          item.appendChild(img);

          var nameSpan = document.createElement('span');
          nameSpan.textContent = p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name;
          item.appendChild(nameSpan);

          var removeBtn = document.createElement('button');
          removeBtn.className = 'compare-item-remove';
          removeBtn.textContent = '\u00d7';
          removeBtn.addEventListener('click', function() {
            self.compareList = self.compareList.filter(function(id) { return id !== pid; });
            self.updateComparePanel();
            document.querySelectorAll('.compare-checkbox[data-product-id="' + pid + '"]').forEach(function(cb) {
              cb.checked = false;
            });
          });
          item.appendChild(removeBtn);

          itemsEl.appendChild(item);
        });
      }
    },

    showCompareModal: function() {
      var modal = document.getElementById('compareModal');
      var wrap = document.getElementById('compareTableWrap');
      if (!modal || !wrap || !window.PRODUCTS) return;

      var items = [];
      var self = this;
      this.compareList.forEach(function(pid) {
        var p = window.PRODUCTS.find(function(pr) { return pr.id === pid; });
        if (p) items.push(p);
      });

      if (items.length < 2) return;

      var table = document.createElement('table');
      table.className = 'compare-table';

      var rows = [
        { label: '\uc0c1\ud488', key: 'image' },
        { label: '\uc0c1\ud488\uba85', key: 'name' },
        { label: '\uce74\ud14c\uace0\ub9ac', key: 'category' },
        { label: '\ud310\ub9e4\uac00', key: 'salePrice' },
        { label: '\uc815\uc0c1\uac00', key: 'originalPrice' },
        { label: '\ud560\uc778\uc728', key: 'discountText' },
        { label: '\ud3c9\uc810', key: 'rating' },
        { label: '\ub9ac\ubdf0', key: 'reviewCount' },
        { label: '\uad6c\ub9e4\uc218', key: 'purchaseCount' }
      ];

      rows.forEach(function(row) {
        var tr = document.createElement('tr');
        var th = document.createElement('th');
        th.textContent = row.label;
        tr.appendChild(th);

        items.forEach(function(p) {
          var td = document.createElement('td');
          if (row.key === 'image') {
            var img = document.createElement('img');
            img.src = p.image;
            img.alt = p.name;
            td.appendChild(img);
          } else if (row.key === 'salePrice' || row.key === 'originalPrice') {
            td.textContent = p[row.key].toLocaleString() + '\uc6d0';
            if (row.key === 'salePrice') td.className = 'compare-price';
          } else if (row.key === 'purchaseCount') {
            td.textContent = p[row.key].toLocaleString();
          } else {
            td.textContent = String(p[row.key] || '-');
          }
          tr.appendChild(td);
        });

        table.appendChild(tr);
      });

      // Booking row
      var bookingTr = document.createElement('tr');
      var bookingTh = document.createElement('th');
      bookingTh.textContent = '\uc608\uc57d';
      bookingTr.appendChild(bookingTh);
      items.forEach(function(p) {
        var td = document.createElement('td');
        var link = document.createElement('a');
        link.href = p.affiliateUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'btn-cta btn-cta-primary';
        link.style.fontSize = '0.8rem';
        link.style.padding = '0.5rem 0.75rem';
        link.textContent = '\uc608\uc57d\ud558\uae30';
        td.appendChild(link);
        bookingTr.appendChild(td);
      });
      table.appendChild(bookingTr);

      wrap.textContent = '';
      wrap.appendChild(table);
      modal.classList.add('open');
    },

    // --- Planner Buttons ---
    initPlannerButtons: function() {
      document.querySelectorAll('.btn-add-planner, .btn-add-planner-detail').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var pid = parseInt(btn.dataset.productId, 10) || btn.dataset.productId;
          if (!isNaN(Number(btn.dataset.productId))) pid = Number(btn.dataset.productId);

          var planner;
          try {
            planner = JSON.parse(localStorage.getItem('osakaPlanner') || '{"1":[],"2":[],"3":[]}');
          } catch(err) {
            planner = {'1':[],'2':[],'3':[]};
          }
          planner['1'].push(pid);
          localStorage.setItem('osakaPlanner', JSON.stringify(planner));

          var pName = '';
          if (window.PRODUCTS) {
            var found = window.PRODUCTS.find(function(p) { return p.id === pid; });
            if (found) pName = found.name;
          }
          alert((pName || '\uc0c1\ud488\uc774') + ' Day 1\uc5d0 \ucd94\uac00\ub418\uc5c8\uc2b5\ub2c8\ub2e4.');
        });
      });
    }
  };

  // Expose for re-init after dynamic rendering
  window.App = App;

  document.addEventListener('DOMContentLoaded', function() {
    App.init();
  });
})();
