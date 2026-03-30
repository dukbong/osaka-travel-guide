/**
 * Osaka Travel Guide - Trip Planner
 * HTML5 Drag & Drop, day timeline, cost calculator, localStorage persistence
 * Mobile: tap-to-add fallback for touch devices
 */
(function() {
  'use strict';

  var STORAGE_KEY = 'osaka_planner';
  var DEFAULT_DAYS = 3;

  var Planner = {
    days: {},         // { '1': [pid, pid, ...], '2': [...], ... }
    dayCount: DEFAULT_DAYS,
    draggedPid: null,
    dragSourceDay: null,
    dragSourceIndex: null,
    isMobile: false,

    init: function() {
      this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      this.plannerContainer = document.querySelector('[data-planner], .planner-container, #plannerContainer');
      if (!this.plannerContainer) return;

      this.loadFromStorage();
      this.render();
      this.bindGlobalEvents();
    },

    // --- Storage ---
    loadFromStorage: function() {
      try {
        var stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
          this.days = stored;
          // Determine dayCount from stored keys
          var maxDay = 0;
          Object.keys(this.days).forEach(function(key) {
            var n = parseInt(key, 10);
            if (n > maxDay) maxDay = n;
          });
          this.dayCount = Math.max(maxDay, DEFAULT_DAYS);
        } else {
          this.initDefaultDays();
        }
      } catch (e) {
        this.initDefaultDays();
      }

      // Also handle legacy format from app.js ('osakaPlanner')
      if (Object.keys(this.days).length === 0 || this.isAllEmpty()) {
        try {
          var legacy = JSON.parse(localStorage.getItem('osakaPlanner'));
          if (legacy && typeof legacy === 'object') {
            var hasData = false;
            Object.keys(legacy).forEach(function(k) {
              if (Array.isArray(legacy[k]) && legacy[k].length > 0) hasData = true;
            });
            if (hasData) {
              this.days = legacy;
              this.saveToStorage();
            }
          }
        } catch (e) {
          // ignore
        }
      }

      // Ensure all day slots exist
      for (var i = 1; i <= this.dayCount; i++) {
        if (!Array.isArray(this.days[String(i)])) {
          this.days[String(i)] = [];
        }
      }
    },

    isAllEmpty: function() {
      var days = this.days;
      return Object.keys(days).every(function(k) {
        return !Array.isArray(days[k]) || days[k].length === 0;
      });
    },

    initDefaultDays: function() {
      this.days = {};
      this.dayCount = DEFAULT_DAYS;
      for (var i = 1; i <= DEFAULT_DAYS; i++) {
        this.days[String(i)] = [];
      }
    },

    saveToStorage: function() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.days));
        // Also sync to osakaPlanner for app.js compatibility
        localStorage.setItem('osakaPlanner', JSON.stringify(this.days));
      } catch (e) {
        // storage full
      }
    },

    // --- Product Lookup ---
    getProduct: function(pid) {
      if (!window.PRODUCTS) return null;
      return window.PRODUCTS.find(function(p) { return p.id === pid; }) || null;
    },

    parseProductId: function(raw) {
      if (raw === undefined || raw === null) return null;
      var num = Number(raw);
      return isNaN(num) ? raw : num;
    },

    // --- Rendering ---
    render: function() {
      var container = this.plannerContainer;
      if (!container) return;

      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      // Toolbar
      container.appendChild(this.createToolbar());

      // Day columns
      var daysWrap = document.createElement('div');
      daysWrap.className = 'planner-days';
      daysWrap.style.cssText = 'display:flex;flex-direction:column;gap:16px;';

      for (var i = 1; i <= this.dayCount; i++) {
        daysWrap.appendChild(this.createDaySlot(String(i)));
      }

      container.appendChild(daysWrap);

      // Total cost
      container.appendChild(this.createCostSummary());

      // Booking section
      container.appendChild(this.createBookingSection());

      // Product sidebar (search + add)
      this.renderSidebar();
    },

    createToolbar: function() {
      var self = this;
      var toolbar = document.createElement('div');
      toolbar.className = 'planner-toolbar';
      toolbar.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;align-items:center;';

      // Add Day button
      var addDayBtn = document.createElement('button');
      addDayBtn.type = 'button';
      addDayBtn.className = 'planner-btn';
      addDayBtn.style.cssText = 'padding:8px 14px;border:1px solid #4a90d9;background:#fff;color:#4a90d9;border-radius:6px;cursor:pointer;font-size:0.85rem;font-weight:600;';
      addDayBtn.textContent = '+ 일정 추가';
      addDayBtn.addEventListener('click', function() {
        self.addDay();
      });
      toolbar.appendChild(addDayBtn);

      // Remove Day button
      var removeDayBtn = document.createElement('button');
      removeDayBtn.type = 'button';
      removeDayBtn.className = 'planner-btn';
      removeDayBtn.style.cssText = 'padding:8px 14px;border:1px solid #ddd;background:#fff;color:#666;border-radius:6px;cursor:pointer;font-size:0.85rem;';
      removeDayBtn.textContent = '- 일정 삭제';
      removeDayBtn.addEventListener('click', function() {
        self.removeDay();
      });
      toolbar.appendChild(removeDayBtn);

      // Spacer
      var spacer = document.createElement('div');
      spacer.style.flex = '1';
      toolbar.appendChild(spacer);

      // Load from wishlist
      var wishlistBtn = document.createElement('button');
      wishlistBtn.type = 'button';
      wishlistBtn.className = 'planner-btn';
      wishlistBtn.style.cssText = 'padding:8px 14px;border:1px solid #e91e63;background:#fff;color:#e91e63;border-radius:6px;cursor:pointer;font-size:0.85rem;';
      wishlistBtn.textContent = '위시리스트에서 추가';
      wishlistBtn.addEventListener('click', function() {
        self.showWishlistPicker();
      });
      toolbar.appendChild(wishlistBtn);

      // Reset button
      var resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'planner-btn planner-btn-danger';
      resetBtn.style.cssText = 'padding:8px 14px;border:1px solid #e53e3e;background:#fff;color:#e53e3e;border-radius:6px;cursor:pointer;font-size:0.85rem;';
      resetBtn.textContent = '일정 초기화';
      resetBtn.addEventListener('click', function() {
        self.resetPlanner();
      });
      toolbar.appendChild(resetBtn);

      return toolbar;
    },

    createDaySlot: function(dayKey) {
      var self = this;
      var items = this.days[dayKey] || [];

      var slot = document.createElement('div');
      slot.className = 'planner-day';
      slot.dataset.day = dayKey;
      slot.style.cssText = 'border:2px dashed #ddd;border-radius:10px;padding:16px;min-height:100px;background:#fafafa;transition:background 0.2s,border-color 0.2s;';

      // Day header
      var header = document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';

      var dayTitle = document.createElement('h4');
      dayTitle.style.cssText = 'margin:0;font-size:1rem;color:#333;';
      dayTitle.textContent = 'Day ' + dayKey;
      header.appendChild(dayTitle);


      slot.appendChild(header);

      // Items container
      var itemsContainer = document.createElement('div');
      itemsContainer.className = 'planner-day-items';
      itemsContainer.dataset.day = dayKey;

      if (items.length === 0) {
        var placeholder = document.createElement('div');
        placeholder.className = 'planner-placeholder';
        placeholder.style.cssText = 'text-align:center;color:#bbb;padding:20px;font-size:0.85rem;';
        placeholder.textContent = this.isMobile
          ? '상품을 탭하여 이 일정에 추가하세요'
          : '상품을 여기에 드래그하세요';
        itemsContainer.appendChild(placeholder);
      } else {
        items.forEach(function(pid, index) {
          itemsContainer.appendChild(self.createMiniCard(pid, dayKey, index));
        });
      }

      slot.appendChild(itemsContainer);

      // Drag & Drop events
      if (!this.isMobile) {
        slot.addEventListener('dragover', function(e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          slot.style.background = '#e8f0fe';
          slot.style.borderColor = '#4a90d9';
        });

        slot.addEventListener('dragleave', function(e) {
          // Only reset if actually leaving the slot
          if (!slot.contains(e.relatedTarget)) {
            slot.style.background = '#fafafa';
            slot.style.borderColor = '#ddd';
          }
        });

        slot.addEventListener('drop', function(e) {
          e.preventDefault();
          slot.style.background = '#fafafa';
          slot.style.borderColor = '#ddd';

          var pid = self.draggedPid;
          if (pid === null) return;

          // If reordering within same day
          if (self.dragSourceDay === dayKey && self.dragSourceIndex !== null) {
            // Calculate drop position
            var dropIndex = self.getDropIndex(itemsContainer, e.clientY);
            self.reorderInDay(dayKey, self.dragSourceIndex, dropIndex);
          } else {
            // Moving from source day or from product list
            if (self.dragSourceDay && self.dragSourceDay !== dayKey) {
              self.removeFromDay(self.dragSourceDay, self.dragSourceIndex);
            }
            self.addToDay(dayKey, pid);
          }

          self.draggedPid = null;
          self.dragSourceDay = null;
          self.dragSourceIndex = null;
        });
      }

      return slot;
    },

    createMiniCard: function(pid, dayKey, index) {
      var self = this;
      var product = this.getProduct(pid);

      var card = document.createElement('div');
      card.className = 'planner-mini-card';
      card.dataset.productId = pid;
      card.dataset.index = index;
      card.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px;background:#fff;border:1px solid #eee;border-radius:8px;margin-bottom:6px;cursor:grab;transition:box-shadow 0.2s;';

      if (!this.isMobile) {
        card.draggable = true;

        card.addEventListener('dragstart', function(e) {
          self.draggedPid = pid;
          self.dragSourceDay = dayKey;
          self.dragSourceIndex = index;
          card.style.opacity = '0.5';
          e.dataTransfer.effectAllowed = 'move';
          try {
            e.dataTransfer.setData('text/plain', String(pid));
          } catch (err) {
            // IE fallback
          }
        });

        card.addEventListener('dragend', function() {
          card.style.opacity = '1';
          self.draggedPid = null;
          self.dragSourceDay = null;
          self.dragSourceIndex = null;
          // Reset all slot styles
          document.querySelectorAll('.planner-day').forEach(function(s) {
            s.style.background = '#fafafa';
            s.style.borderColor = '#ddd';
          });
        });
      }

      // Drag handle
      var handle = document.createElement('span');
      handle.className = 'planner-drag-handle';
      handle.style.cssText = 'cursor:grab;color:#ccc;font-size:1.1rem;flex-shrink:0;user-select:none;';
      handle.textContent = '⠿';
      handle.setAttribute('aria-hidden', 'true');
      card.appendChild(handle);

      if (product) {
        var img = document.createElement('img');
        img.src = product.image;
        img.alt = '';
        img.style.cssText = 'width:44px;height:44px;object-fit:cover;border-radius:6px;flex-shrink:0;';
        card.appendChild(img);

        var info = document.createElement('div');
        info.style.cssText = 'flex:1;min-width:0;';

        var name = document.createElement('div');
        name.style.cssText = 'font-size:0.8rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        name.textContent = product.name;
        info.appendChild(name);

        card.appendChild(info);
      } else {
        var unknown = document.createElement('span');
        unknown.style.cssText = 'flex:1;font-size:0.8rem;color:#999;';
        unknown.textContent = '상품 정보 없음 (ID: ' + pid + ')';
        card.appendChild(unknown);
      }

      // Remove button
      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'planner-remove-btn';
      removeBtn.textContent = '\u00d7';
      removeBtn.style.cssText = 'border:none;background:none;cursor:pointer;font-size:1.2rem;color:#999;padding:2px 6px;flex-shrink:0;line-height:1;';
      removeBtn.setAttribute('aria-label', '제거');
      removeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        self.removeFromDay(dayKey, index);
        self.saveToStorage();
        self.render();
      });
      card.appendChild(removeBtn);

      return card;
    },

    createCostSummary: function() {
      var wrap = document.createElement('div');
      wrap.className = 'planner-cost-summary';
      return wrap;
    },

    createBookingSection: function() {
      var self = this;
      var allItems = this.getAllItems();

      var section = document.createElement('div');
      section.className = 'planner-booking';
      section.style.cssText = 'margin-top:20px;';

      if (allItems.length === 0) return section;

      var title = document.createElement('h4');
      title.style.cssText = 'margin:0 0 12px;font-size:1rem;';
      title.textContent = '예약하기';
      section.appendChild(title);

      // Deduplicate products for booking links
      var seen = {};
      allItems.forEach(function(pid) {
        if (seen[pid]) return;
        seen[pid] = true;

        var product = self.getProduct(pid);
        if (!product) return;

        var item = document.createElement('div');
        item.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #eee;border-radius:8px;margin-bottom:8px;';

        var img = document.createElement('img');
        img.src = product.image;
        img.alt = '';
        img.style.cssText = 'width:48px;height:48px;object-fit:cover;border-radius:6px;flex-shrink:0;';
        item.appendChild(img);

        var info = document.createElement('div');
        info.style.cssText = 'flex:1;min-width:0;';

        var name = document.createElement('div');
        name.style.cssText = 'font-size:0.85rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        name.textContent = product.name;
        info.appendChild(name);

        item.appendChild(info);

        var link = document.createElement('a');
        link.href = product.affiliateUrl || '#';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.cssText = 'display:inline-block;padding:8px 16px;background:#4a90d9;color:#fff;border-radius:6px;text-decoration:none;font-size:0.8rem;font-weight:600;white-space:nowrap;flex-shrink:0;';
        link.textContent = '예약하기';
        item.appendChild(link);

        section.appendChild(item);
      });

      return section;
    },

    // --- Sidebar: Product Search/Filter for Planner Page ---
    renderSidebar: function() {
      var sidebar = document.querySelector('[data-planner-sidebar], .planner-sidebar, #plannerSidebar');
      if (!sidebar || !window.PRODUCTS) return;

      var self = this;

      while (sidebar.firstChild) {
        sidebar.removeChild(sidebar.firstChild);
      }

      // Search input
      var searchWrap = document.createElement('div');
      searchWrap.style.cssText = 'margin-bottom:12px;';

      var searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = '상품 검색...';
      searchInput.style.cssText = 'width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:0.9rem;box-sizing:border-box;';
      searchWrap.appendChild(searchInput);
      sidebar.appendChild(searchWrap);

      // Product list container
      var listContainer = document.createElement('div');
      listContainer.className = 'planner-sidebar-products';
      listContainer.style.cssText = 'max-height:60vh;overflow-y:auto;';
      sidebar.appendChild(listContainer);

      function renderProducts(query) {
        while (listContainer.firstChild) {
          listContainer.removeChild(listContainer.firstChild);
        }

        var products = window.PRODUCTS;
        if (query) {
          var q = query.toLowerCase();
          products = products.filter(function(p) {
            return p.name.toLowerCase().indexOf(q) !== -1;
          });
        }

        if (products.length === 0) {
          var empty = document.createElement('div');
          empty.style.cssText = 'text-align:center;padding:20px;color:#999;font-size:0.85rem;';
          empty.textContent = '검색 결과가 없습니다.';
          listContainer.appendChild(empty);
          return;
        }

        products.forEach(function(product) {
          var item = document.createElement('div');
          item.className = 'planner-sidebar-item';
          item.dataset.productId = product.id;
          item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #eee;border-radius:8px;margin-bottom:6px;cursor:pointer;transition:background 0.15s;';

          if (!self.isMobile) {
            item.draggable = true;
            item.addEventListener('dragstart', function(e) {
              self.draggedPid = product.id;
              self.dragSourceDay = null;
              self.dragSourceIndex = null;
              item.style.opacity = '0.5';
              e.dataTransfer.effectAllowed = 'copy';
              try {
                e.dataTransfer.setData('text/plain', String(product.id));
              } catch (err) {
                // fallback
              }
            });
            item.addEventListener('dragend', function() {
              item.style.opacity = '1';
            });
          }

          var img = document.createElement('img');
          img.src = product.image;
          img.alt = '';
          img.style.cssText = 'width:40px;height:40px;object-fit:cover;border-radius:6px;flex-shrink:0;';
          item.appendChild(img);

          var info = document.createElement('div');
          info.style.cssText = 'flex:1;min-width:0;';

          var name = document.createElement('div');
          name.style.cssText = 'font-size:0.8rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
          name.textContent = product.name;
          info.appendChild(name);

          item.appendChild(info);

          // Mobile: tap to add with day selector
          if (self.isMobile) {
            item.addEventListener('click', function() {
              self.showDayPicker(product.id);
            });
          }

          // Desktop: click to add to Day 1
          if (!self.isMobile) {
            var addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.textContent = '+';
            addBtn.style.cssText = 'border:1px solid #4a90d9;background:#fff;color:#4a90d9;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:1rem;line-height:1;flex-shrink:0;';
            addBtn.setAttribute('aria-label', 'Day 1에 추가');
            addBtn.addEventListener('click', function(e) {
              e.stopPropagation();
              self.addToDay('1', product.id);
              self.saveToStorage();
              self.render();
            });
            item.appendChild(addBtn);
          }

          listContainer.appendChild(item);
        });
      }

      // Initial render
      renderProducts('');

      // Debounced search
      var searchTimer = null;
      searchInput.addEventListener('input', function() {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function() {
          renderProducts(searchInput.value.trim());
        }, 300);
      });
    },

    // --- Day Management ---
    addDay: function() {
      this.dayCount++;
      this.days[String(this.dayCount)] = [];
      this.saveToStorage();
      this.render();
    },

    removeDay: function() {
      if (this.dayCount <= 1) return;

      var lastDay = String(this.dayCount);
      var items = this.days[lastDay] || [];

      if (items.length > 0) {
        if (!confirm('Day ' + this.dayCount + '에 추가된 상품이 삭제됩니다. 계속하시겠습니까?')) {
          return;
        }
      }

      delete this.days[lastDay];
      this.dayCount--;
      this.saveToStorage();
      this.render();
    },

    resetPlanner: function() {
      if (!confirm('모든 일정이 초기화됩니다. 계속하시겠습니까?')) return;
      this.initDefaultDays();
      this.saveToStorage();
      this.render();
    },

    // --- Item Operations ---
    addToDay: function(dayKey, pid) {
      if (!this.days[dayKey]) {
        this.days[dayKey] = [];
      }
      this.days[dayKey].push(pid);
      this.saveToStorage();
    },

    removeFromDay: function(dayKey, index) {
      if (!this.days[dayKey]) return;
      if (index !== null && index !== undefined && index >= 0) {
        this.days[dayKey].splice(index, 1);
      }
    },

    reorderInDay: function(dayKey, fromIndex, toIndex) {
      var items = this.days[dayKey];
      if (!items) return;

      if (fromIndex === toIndex) return;
      var item = items.splice(fromIndex, 1)[0];
      if (toIndex > fromIndex) toIndex--;
      items.splice(toIndex, 0, item);

      this.saveToStorage();
      this.render();
    },

    getDropIndex: function(container, clientY) {
      var cards = Array.prototype.slice.call(container.querySelectorAll('.planner-mini-card'));
      if (cards.length === 0) return 0;

      for (var i = 0; i < cards.length; i++) {
        var rect = cards[i].getBoundingClientRect();
        var midY = rect.top + rect.height / 2;
        if (clientY < midY) return i;
      }
      return cards.length;
    },

    // --- Cost Calculation ---
    calculateDayTotal: function(dayKey) {
      var self = this;
      var items = this.days[dayKey] || [];
      var total = 0;
      items.forEach(function(pid) {
        var p = self.getProduct(pid);
        if (p) total += (p.salePrice || 0);
      });
      return total;
    },

    calculateTotal: function() {
      var self = this;
      var total = 0;
      Object.keys(this.days).forEach(function(dayKey) {
        total += self.calculateDayTotal(dayKey);
      });
      return total;
    },

    getAllItems: function() {
      var all = [];
      var days = this.days;
      Object.keys(days).forEach(function(dayKey) {
        if (Array.isArray(days[dayKey])) {
          days[dayKey].forEach(function(pid) {
            all.push(pid);
          });
        }
      });
      return all;
    },

    // --- Mobile Day Picker ---
    showDayPicker: function(pid) {
      var self = this;

      // Remove existing picker
      var existing = document.getElementById('plannerDayPicker');
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }

      var overlay = document.createElement('div');
      overlay.id = 'plannerDayPicker';
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:10000;background:rgba(0,0,0,0.5);display:flex;align-items:flex-end;justify-content:center;';

      var panel = document.createElement('div');
      panel.style.cssText = 'background:#fff;border-radius:16px 16px 0 0;padding:20px;width:100%;max-width:480px;';

      var title = document.createElement('h4');
      title.style.cssText = 'margin:0 0 16px;text-align:center;font-size:1rem;';
      title.textContent = '일정 선택';
      panel.appendChild(title);

      var btnWrap = document.createElement('div');
      btnWrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

      for (var i = 1; i <= self.dayCount; i++) {
        (function(dayKey) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.style.cssText = 'padding:14px;border:1px solid #ddd;border-radius:8px;background:#fff;font-size:0.95rem;cursor:pointer;text-align:left;';
          var count = (self.days[dayKey] || []).length;
          btn.textContent = 'Day ' + dayKey + (count > 0 ? ' (' + count + '개 상품)' : '');
          btn.addEventListener('click', function() {
            self.addToDay(dayKey, pid);
            self.saveToStorage();
            self.render();
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          });
          btnWrap.appendChild(btn);
        })(String(i));
      }

      panel.appendChild(btnWrap);

      var cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.style.cssText = 'width:100%;padding:14px;border:none;background:#f5f5f5;border-radius:8px;margin-top:12px;font-size:0.9rem;cursor:pointer;color:#666;';
      cancelBtn.textContent = '취소';
      cancelBtn.addEventListener('click', function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      });
      panel.appendChild(cancelBtn);

      overlay.appendChild(panel);
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          overlay.parentNode.removeChild(overlay);
        }
      });

      document.body.appendChild(overlay);
    },

    // --- Wishlist Picker ---
    showWishlistPicker: function() {
      var self = this;
      var wishlistItems = [];

      // Get wishlist products
      if (window.Wishlist && typeof window.Wishlist.getProducts === 'function') {
        wishlistItems = window.Wishlist.getProducts();
      } else {
        // Fallback: read from localStorage directly
        try {
          var ids = JSON.parse(localStorage.getItem('osakaWishlist') || '[]');
          if (window.PRODUCTS && Array.isArray(ids)) {
            wishlistItems = window.PRODUCTS.filter(function(p) {
              return ids.indexOf(p.id) !== -1;
            });
          }
        } catch (e) {
          // ignore
        }
      }

      // Remove existing picker
      var existing = document.getElementById('plannerWishlistPicker');
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }

      var overlay = document.createElement('div');
      overlay.id = 'plannerWishlistPicker';
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:10000;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:20px;';

      var modal = document.createElement('div');
      modal.style.cssText = 'background:#fff;border-radius:12px;max-width:500px;width:100%;max-height:80vh;overflow-y:auto;padding:0;';

      // Header
      var header = document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #eee;position:sticky;top:0;background:#fff;border-radius:12px 12px 0 0;';

      var title = document.createElement('h4');
      title.style.cssText = 'margin:0;font-size:1rem;';
      title.textContent = '위시리스트에서 추가';
      header.appendChild(title);

      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = '\u00d7';
      closeBtn.style.cssText = 'border:none;background:none;font-size:1.5rem;cursor:pointer;color:#666;padding:0;line-height:1;';
      closeBtn.addEventListener('click', function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      });
      header.appendChild(closeBtn);
      modal.appendChild(header);

      // Content
      var content = document.createElement('div');
      content.style.cssText = 'padding:16px 20px;';

      if (wishlistItems.length === 0) {
        var empty = document.createElement('div');
        empty.style.cssText = 'text-align:center;padding:30px;color:#999;';
        empty.textContent = '위시리스트가 비어있습니다.';
        content.appendChild(empty);
      } else {
        wishlistItems.forEach(function(product) {
          var item = document.createElement('div');
          item.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #eee;border-radius:8px;margin-bottom:8px;';

          var img = document.createElement('img');
          img.src = product.image;
          img.alt = '';
          img.style.cssText = 'width:48px;height:48px;object-fit:cover;border-radius:6px;flex-shrink:0;';
          item.appendChild(img);

          var info = document.createElement('div');
          info.style.cssText = 'flex:1;min-width:0;';

          var name = document.createElement('div');
          name.style.cssText = 'font-size:0.85rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
          name.textContent = product.name;
          info.appendChild(name);

          item.appendChild(info);

          // Day selector buttons
          var addWrap = document.createElement('div');
          addWrap.style.cssText = 'display:flex;gap:4px;flex-shrink:0;flex-wrap:wrap;';

          for (var d = 1; d <= self.dayCount; d++) {
            (function(dayKey) {
              var addBtn = document.createElement('button');
              addBtn.type = 'button';
              addBtn.style.cssText = 'padding:4px 8px;border:1px solid #4a90d9;background:#fff;color:#4a90d9;border-radius:4px;cursor:pointer;font-size:0.7rem;white-space:nowrap;';
              addBtn.textContent = 'D' + dayKey;
              addBtn.addEventListener('click', function() {
                self.addToDay(dayKey, product.id);
                self.saveToStorage();
                addBtn.style.background = '#4a90d9';
                addBtn.style.color = '#fff';
                addBtn.textContent = '추가됨';
                setTimeout(function() {
                  addBtn.style.background = '#fff';
                  addBtn.style.color = '#4a90d9';
                  addBtn.textContent = 'D' + dayKey;
                }, 800);
              });
              addWrap.appendChild(addBtn);
            })(String(d));
          }

          item.appendChild(addWrap);
          content.appendChild(item);
        });
      }

      modal.appendChild(content);

      // Footer with done button
      var footer = document.createElement('div');
      footer.style.cssText = 'padding:12px 20px;border-top:1px solid #eee;text-align:right;position:sticky;bottom:0;background:#fff;border-radius:0 0 12px 12px;';

      var doneBtn = document.createElement('button');
      doneBtn.type = 'button';
      doneBtn.style.cssText = 'padding:10px 24px;border:none;border-radius:6px;background:#4a90d9;color:#fff;cursor:pointer;font-weight:600;font-size:0.9rem;';
      doneBtn.textContent = '완료';
      doneBtn.addEventListener('click', function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        self.render();
      });
      footer.appendChild(doneBtn);
      modal.appendChild(footer);

      overlay.appendChild(modal);

      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          overlay.parentNode.removeChild(overlay);
          self.render();
        }
      });

      document.body.appendChild(overlay);
    },

    // --- Global Events ---
    bindGlobalEvents: function() {
      var self = this;

      // Listen for "add to planner" buttons from product cards / detail pages
      document.addEventListener('click', function(e) {
        var btn = e.target.closest('.btn-add-planner, .btn-add-planner-detail, [data-planner-add]');
        if (!btn) return;
        // Only handle if planner page is active (has container)
        if (!self.plannerContainer) return;

        e.preventDefault();
        e.stopPropagation();

        var pid = self.parseProductId(btn.dataset.productId);
        if (pid === null) return;

        if (self.isMobile) {
          self.showDayPicker(pid);
        } else {
          self.addToDay('1', pid);
          self.saveToStorage();
          self.render();
        }
      });

      // Keyboard: Escape to close pickers
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          var picker = document.getElementById('plannerDayPicker');
          if (picker && picker.parentNode) picker.parentNode.removeChild(picker);
          var wPicker = document.getElementById('plannerWishlistPicker');
          if (wPicker && wPicker.parentNode) {
            wPicker.parentNode.removeChild(wPicker);
            self.render();
          }
        }
      });
    },

    // --- Public API ---
    /** Add product to a specific day (called externally) */
    addProduct: function(pid, dayKey) {
      dayKey = dayKey || '1';
      this.addToDay(dayKey, pid);
      this.saveToStorage();
      if (this.plannerContainer) {
        this.render();
      }
    },

    /** Get the full planner data */
    getData: function() {
      return JSON.parse(JSON.stringify(this.days));
    }
  };

  window.Planner = Planner;

  document.addEventListener('DOMContentLoaded', function() {
    Planner.init();
  });
})();
