/**
 * Osaka Travel Guide - Product Comparison
 * Checkbox-based selection (max 3), floating bar, comparison modal
 * Persists selection in sessionStorage
 */
(function() {
  'use strict';

  var Compare = {
    maxItems: 3,
    storageKey: 'osaka_compare',
    selectedIds: [],

    init: function() {
      this.loadFromStorage();
      this.createFloatingBar();
      this.syncCheckboxes();
      this.bindEvents();
    },

    // --- Storage ---
    loadFromStorage: function() {
      try {
        var stored = sessionStorage.getItem(this.storageKey);
        this.selectedIds = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(this.selectedIds)) this.selectedIds = [];
      } catch (e) {
        this.selectedIds = [];
      }
    },

    saveToStorage: function() {
      try {
        sessionStorage.setItem(this.storageKey, JSON.stringify(this.selectedIds));
      } catch (e) {
        // sessionStorage unavailable
      }
    },

    // --- Floating Bar ---
    createFloatingBar: function() {
      // Check if bar already exists in HTML
      this.bar = document.getElementById('compareBar');
      if (this.bar) {
        this.barCount = this.bar.querySelector('[data-compare-count]') || this.bar.querySelector('.compare-bar-count');
        this.barItems = this.bar.querySelector('[data-compare-items]') || this.bar.querySelector('.compare-bar-items');
        this.barAction = this.bar.querySelector('[data-compare-action]') || this.bar.querySelector('.compare-bar-action');
        this.barClear = this.bar.querySelector('[data-compare-clear]') || this.bar.querySelector('.compare-bar-clear');
        this.bindBarEvents();
        this.updateBar();
        return;
      }

      // Create the floating bar
      this.bar = document.createElement('div');
      this.bar.id = 'compareBar';
      this.bar.className = 'compare-bar';
      this.bar.style.cssText = [
        'position:fixed;bottom:-80px;left:0;right:0;z-index:1000;',
        'background:#fff;border-top:2px solid #4a90d9;',
        'box-shadow:0 -4px 20px rgba(0,0,0,0.15);',
        'padding:12px 20px;display:flex;align-items:center;gap:12px;',
        'transition:bottom 0.3s ease;'
      ].join('');

      // Count label
      var countLabel = document.createElement('span');
      countLabel.style.cssText = 'font-weight:600;white-space:nowrap;font-size:0.9rem;';
      this.barCount = document.createElement('span');
      this.barCount.textContent = '0';
      countLabel.appendChild(this.barCount);
      countLabel.appendChild(document.createTextNode('개 선택'));
      this.bar.appendChild(countLabel);

      // Items preview container
      this.barItems = document.createElement('div');
      this.barItems.style.cssText = 'display:flex;gap:8px;flex:1;overflow-x:auto;';
      this.bar.appendChild(this.barItems);

      // Action buttons container
      var btnWrap = document.createElement('div');
      btnWrap.style.cssText = 'display:flex;gap:8px;white-space:nowrap;';

      this.barClear = document.createElement('button');
      this.barClear.type = 'button';
      this.barClear.textContent = '선택 초기화';
      this.barClear.style.cssText = 'padding:8px 14px;border:1px solid #ddd;border-radius:6px;background:#f5f5f5;cursor:pointer;font-size:0.85rem;';
      btnWrap.appendChild(this.barClear);

      this.barAction = document.createElement('button');
      this.barAction.type = 'button';
      this.barAction.textContent = '비교하기';
      this.barAction.style.cssText = 'padding:8px 18px;border:none;border-radius:6px;background:#4a90d9;color:#fff;cursor:pointer;font-weight:600;font-size:0.85rem;';
      this.barAction.disabled = true;
      btnWrap.appendChild(this.barAction);

      this.bar.appendChild(btnWrap);
      document.body.appendChild(this.bar);

      this.bindBarEvents();
      this.updateBar();
    },

    bindBarEvents: function() {
      var self = this;

      if (this.barClear) {
        this.barClear.addEventListener('click', function() {
          self.clearAll();
        });
      }

      if (this.barAction) {
        this.barAction.addEventListener('click', function() {
          if (self.selectedIds.length >= 2) {
            self.showCompareModal();
          }
        });
      }
    },

    // --- Event Binding ---
    bindEvents: function() {
      var self = this;

      // Event delegation for checkboxes
      document.addEventListener('change', function(e) {
        var cb = e.target.closest('.compare-checkbox, [data-compare-checkbox]');
        if (!cb) return;

        var pid = self.parseProductId(cb.dataset.productId);
        if (pid === null) return;

        if (cb.checked) {
          if (self.selectedIds.length >= self.maxItems) {
            cb.checked = false;
            self.showMaxAlert();
            return;
          }
          self.addItem(pid);
        } else {
          self.removeItem(pid);
        }
      });

      // Close modal on Escape
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          self.closeModal();
        }
      });
    },

    // --- Item Management ---
    addItem: function(pid) {
      if (this.selectedIds.indexOf(pid) === -1 && this.selectedIds.length < this.maxItems) {
        this.selectedIds.push(pid);
        this.saveToStorage();
        this.updateBar();
        this.syncCheckboxes();
      }
    },

    removeItem: function(pid) {
      this.selectedIds = this.selectedIds.filter(function(id) { return id !== pid; });
      this.saveToStorage();
      this.updateBar();
      this.syncCheckboxes();
    },

    clearAll: function() {
      this.selectedIds = [];
      this.saveToStorage();
      this.updateBar();
      this.syncCheckboxes();
    },

    // --- UI Updates ---
    syncCheckboxes: function() {
      var self = this;
      document.querySelectorAll('.compare-checkbox, [data-compare-checkbox]').forEach(function(cb) {
        var pid = self.parseProductId(cb.dataset.productId);
        cb.checked = self.selectedIds.indexOf(pid) !== -1;
      });
    },

    updateBar: function() {
      var count = this.selectedIds.length;

      // Show/hide bar
      if (this.bar) {
        this.bar.style.bottom = count > 0 ? '0' : '-80px';
      }

      // Update count
      if (this.barCount) {
        this.barCount.textContent = count;
      }

      // Update action button
      if (this.barAction) {
        this.barAction.disabled = count < 2;
      }

      // Update items preview
      this.renderBarItems();
    },

    renderBarItems: function() {
      if (!this.barItems) return;
      var self = this;

      while (this.barItems.firstChild) {
        this.barItems.removeChild(this.barItems.firstChild);
      }

      if (!window.PRODUCTS) return;

      this.selectedIds.forEach(function(pid) {
        var product = window.PRODUCTS.find(function(p) { return p.id === pid; });
        if (!product) return;

        var item = document.createElement('div');
        item.style.cssText = 'display:flex;align-items:center;gap:6px;background:#f0f4ff;border-radius:6px;padding:4px 8px;flex-shrink:0;';

        var img = document.createElement('img');
        img.src = product.image;
        img.alt = '';
        img.style.cssText = 'width:32px;height:32px;border-radius:4px;object-fit:cover;';
        item.appendChild(img);

        var name = document.createElement('span');
        name.style.cssText = 'font-size:0.8rem;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        name.textContent = product.name;
        item.appendChild(name);

        var removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = '\u00d7';
        removeBtn.style.cssText = 'border:none;background:none;cursor:pointer;font-size:1.1rem;color:#999;padding:0 2px;line-height:1;';
        removeBtn.setAttribute('aria-label', '제거');
        removeBtn.addEventListener('click', function() {
          self.removeItem(pid);
        });
        item.appendChild(removeBtn);

        self.barItems.appendChild(item);
      });
    },

    showMaxAlert: function() {
      // Create a subtle toast instead of alert
      var toast = document.createElement('div');
      toast.style.cssText = [
        'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:10001;',
        'background:#333;color:#fff;padding:10px 20px;border-radius:8px;',
        'font-size:0.9rem;box-shadow:0 4px 12px rgba(0,0,0,0.2);',
        'animation:compareToastIn 0.3s ease;'
      ].join('');
      toast.textContent = '최대 ' + this.maxItems + '개까지 비교할 수 있습니다.';
      document.body.appendChild(toast);

      setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(function() {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
      }, 2000);
    },

    // --- Comparison Modal ---
    showCompareModal: function() {
      if (!window.PRODUCTS) return;

      var self = this;
      var items = [];
      this.selectedIds.forEach(function(pid) {
        var p = window.PRODUCTS.find(function(pr) { return pr.id === pid; });
        if (p) items.push(p);
      });

      if (items.length < 2) return;

      // Check for existing modal in HTML first
      var existingModal = document.getElementById('compareModal');
      var existingWrap = document.getElementById('compareTableWrap');
      if (existingModal && existingWrap) {
        this.buildCompareTable(existingWrap, items);
        existingModal.classList.add('open');
        return;
      }

      // Create modal
      this.closeModal(); // Remove any existing dynamic modal

      var overlay = document.createElement('div');
      overlay.id = 'compareModalDynamic';
      overlay.style.cssText = [
        'position:fixed;top:0;left:0;right:0;bottom:0;z-index:10000;',
        'background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;',
        'padding:20px;animation:compareModalFadeIn 0.3s ease;'
      ].join('');

      var modal = document.createElement('div');
      modal.style.cssText = [
        'background:#fff;border-radius:12px;max-width:900px;width:100%;',
        'max-height:90vh;overflow-y:auto;position:relative;padding:0;'
      ].join('');

      // Header
      var header = document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #eee;position:sticky;top:0;background:#fff;border-radius:12px 12px 0 0;z-index:1;';

      var title = document.createElement('h3');
      title.style.cssText = 'margin:0;font-size:1.1rem;';
      title.textContent = '상품 비교';
      header.appendChild(title);

      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = '\u00d7';
      closeBtn.style.cssText = 'border:none;background:none;font-size:1.5rem;cursor:pointer;color:#666;padding:0;line-height:1;';
      closeBtn.setAttribute('aria-label', '닫기');
      closeBtn.addEventListener('click', function() {
        self.closeModal();
      });
      header.appendChild(closeBtn);
      modal.appendChild(header);

      // Table container
      var tableWrap = document.createElement('div');
      tableWrap.style.cssText = 'padding:20px;overflow-x:auto;';
      this.buildCompareTable(tableWrap, items);
      modal.appendChild(tableWrap);

      overlay.appendChild(modal);

      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          self.closeModal();
        }
      });

      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';
    },

    buildCompareTable: function(container, items) {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      var table = document.createElement('table');
      table.className = 'compare-table';
      table.style.cssText = 'width:100%;border-collapse:collapse;';

      var rows = [
        { label: '상품', key: 'image' },
        { label: '상품명', key: 'name' },
        { label: '카테고리', key: 'category' },
        { label: '할인율', key: 'discountText' },
        { label: '평점', key: 'rating' },
        { label: '리뷰', key: 'reviewCount' },
        { label: '최저가 보장', key: 'isMinPriceGuarantee' }
      ];

      var cellStyle = 'padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:0.9rem;';
      var thStyle = cellStyle + 'text-align:left;font-weight:600;background:#fafafa;white-space:nowrap;width:100px;';

      rows.forEach(function(row) {
        var tr = document.createElement('tr');

        var th = document.createElement('th');
        th.style.cssText = thStyle;
        th.textContent = row.label;
        tr.appendChild(th);

        items.forEach(function(p) {
          var td = document.createElement('td');
          td.style.cssText = cellStyle;

          switch (row.key) {
            case 'image':
              var img = document.createElement('img');
              img.src = p.image;
              img.alt = p.name;
              img.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:8px;';
              td.appendChild(img);
              break;

            case 'name':
              var nameText = document.createElement('strong');
              nameText.textContent = p.name;
              nameText.style.fontSize = '0.85rem';
              td.appendChild(nameText);
              break;

            case 'rating':
              var starSpan = document.createElement('span');
              starSpan.textContent = '★ ' + (p.rating || '-');
              starSpan.style.color = '#f6a623';
              td.appendChild(starSpan);
              break;

            case 'reviewCount':
              td.textContent = (p.reviewCount || 0).toLocaleString() + '건';
              break;

            case 'isMinPriceGuarantee':
              if (p.isMinPriceGuarantee) {
                var badge = document.createElement('span');
                badge.textContent = '최저가 보장';
                badge.style.cssText = 'background:#e8f5e9;color:#2e7d32;padding:3px 8px;border-radius:4px;font-size:0.8rem;font-weight:600;';
                td.appendChild(badge);
              } else {
                td.textContent = '-';
              }
              break;

            default:
              td.textContent = String(p[row.key] || '-');
          }

          tr.appendChild(td);
        });

        table.appendChild(tr);
      });

      // Booking row
      var bookingTr = document.createElement('tr');
      var bookingTh = document.createElement('th');
      bookingTh.style.cssText = thStyle;
      bookingTh.textContent = '예약';
      bookingTr.appendChild(bookingTh);

      items.forEach(function(p) {
        var td = document.createElement('td');
        td.style.cssText = cellStyle;
        var link = document.createElement('a');
        link.href = p.affiliateUrl || '#';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'btn-cta btn-cta-primary';
        link.style.cssText = 'display:inline-block;padding:8px 16px;background:#4a90d9;color:#fff;border-radius:6px;text-decoration:none;font-size:0.85rem;font-weight:600;';
        link.textContent = '예약하기';
        td.appendChild(link);
        bookingTr.appendChild(td);
      });
      table.appendChild(bookingTr);

      container.appendChild(table);
    },

    closeModal: function() {
      // Close dynamic modal
      var dynamic = document.getElementById('compareModalDynamic');
      if (dynamic && dynamic.parentNode) {
        dynamic.parentNode.removeChild(dynamic);
        document.body.style.overflow = '';
      }

      // Close HTML-based modal
      var existing = document.getElementById('compareModal');
      if (existing) {
        existing.classList.remove('open');
      }
    },

    // --- Utility ---
    parseProductId: function(raw) {
      if (raw === undefined || raw === null) return null;
      var num = Number(raw);
      return isNaN(num) ? raw : num;
    }
  };

  window.Compare = Compare;

  document.addEventListener('DOMContentLoaded', function() {
    Compare.init();
  });
})();
