/**
 * Osaka Travel Guide - Client-side Product Search
 * Debounced Korean text search with highlighting and filter integration
 */
(function() {
  'use strict';

  var Search = {
    currentQuery: '',
    debounceTimer: null,
    debounceDelay: 300,

    init: function() {
      this.searchInput = document.querySelector('[data-search-input], .search-input, #productSearch');
      this.searchClear = document.querySelector('[data-search-clear], .search-clear');
      this.productGrid = document.querySelector('.product-grid, .products-grid, [data-product-grid]');

      if (!this.searchInput || !this.productGrid) return;

      this.bindEvents();
    },

    bindEvents: function() {
      var self = this;

      this.searchInput.addEventListener('input', function() {
        clearTimeout(self.debounceTimer);
        self.debounceTimer = setTimeout(function() {
          self.handleSearch(self.searchInput.value.trim());
        }, self.debounceDelay);
      });

      this.searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          self.clearSearch();
          self.searchInput.blur();
        }
      });

      if (this.searchClear) {
        this.searchClear.addEventListener('click', function() {
          self.clearSearch();
          self.searchInput.focus();
        });
      }
    },

    handleSearch: function(query) {
      this.currentQuery = query.toLowerCase();

      if (!query) {
        this.clearSearch();
        return;
      }

      this.applySearchFilter();
      this.updateResultCount();

      // Show/hide clear button
      if (this.searchClear) {
        this.searchClear.style.display = query ? '' : 'none';
      }
    },

    applySearchFilter: function() {
      var cards = this.getProductCards();
      var query = this.currentQuery;
      var visibleCount = 0;

      cards.forEach(function(card) {
        // Respect category filter if active
        var filteredByCategory = card.hasAttribute('data-filtered-out');
        if (filteredByCategory) {
          card.style.display = 'none';
          return;
        }

        if (!query) {
          card.style.display = '';
          card.removeAttribute('data-search-hidden');
          Search.removeHighlights(card);
          visibleCount++;
          return;
        }

        var productName = Search.getProductName(card);
        var nameLC = productName.toLowerCase();

        if (nameLC.indexOf(query) !== -1) {
          card.style.display = '';
          card.removeAttribute('data-search-hidden');
          Search.highlightText(card, query);
          visibleCount++;
        } else {
          card.style.display = 'none';
          card.setAttribute('data-search-hidden', 'true');
          Search.removeHighlights(card);
        }
      });

      this.toggleEmptyState(visibleCount === 0 && query.length > 0);
      this.updateFilterCount();
    },

    getProductCards: function() {
      if (!this.productGrid) return [];
      return Array.prototype.slice.call(
        this.productGrid.querySelectorAll('.product-card, [data-product-id]')
      );
    },

    getProductName: function(card) {
      // Try data attribute first
      if (card.dataset.productName) return card.dataset.productName;

      // Try finding the name element
      var nameEl = card.querySelector('.product-name, .product-title, h3, h4');
      return nameEl ? nameEl.textContent : '';
    },

    highlightText: function(card, query) {
      var nameEl = card.querySelector('.product-name, .product-title, h3, h4');
      if (!nameEl) return;

      // Remove previous highlights first
      this.removeHighlights(card);

      var originalText = nameEl.textContent;
      var lowerText = originalText.toLowerCase();
      var matchIndex = lowerText.indexOf(query);

      if (matchIndex === -1) return;

      // Build highlighted content safely using DOM methods
      var fragment = document.createDocumentFragment();

      var beforeText = originalText.substring(0, matchIndex);
      if (beforeText) {
        fragment.appendChild(document.createTextNode(beforeText));
      }

      var mark = document.createElement('mark');
      mark.className = 'search-highlight';
      mark.textContent = originalText.substring(matchIndex, matchIndex + query.length);
      fragment.appendChild(mark);

      var afterText = originalText.substring(matchIndex + query.length);
      if (afterText) {
        fragment.appendChild(document.createTextNode(afterText));
      }

      // Store original text for restoration
      nameEl.setAttribute('data-original-text', originalText);

      // Replace content
      while (nameEl.firstChild) {
        nameEl.removeChild(nameEl.firstChild);
      }
      nameEl.appendChild(fragment);
    },

    removeHighlights: function(card) {
      var nameEl = card.querySelector('.product-name, .product-title, h3, h4');
      if (!nameEl) return;

      var originalText = nameEl.getAttribute('data-original-text');
      if (originalText) {
        nameEl.textContent = originalText;
        nameEl.removeAttribute('data-original-text');
      }
    },

    clearSearch: function() {
      this.currentQuery = '';

      if (this.searchInput) {
        this.searchInput.value = '';
      }

      if (this.searchClear) {
        this.searchClear.style.display = 'none';
      }

      var cards = this.getProductCards();
      cards.forEach(function(card) {
        // Only show cards not hidden by category filter
        if (!card.hasAttribute('data-filtered-out')) {
          card.style.display = '';
        }
        card.removeAttribute('data-search-hidden');
        Search.removeHighlights(card);
      });

      this.toggleEmptyState(false);
      this.updateFilterCount();
    },

    updateResultCount: function() {
      var resultEl = document.querySelector('[data-search-result-count], .search-result-count');
      if (!resultEl) return;

      if (!this.currentQuery) {
        resultEl.style.display = 'none';
        return;
      }

      var visibleCards = this.getProductCards().filter(function(card) {
        return card.style.display !== 'none';
      });

      resultEl.style.display = '';

      // Clear and rebuild with text nodes
      while (resultEl.firstChild) {
        resultEl.removeChild(resultEl.firstChild);
      }

      var querySpan = document.createElement('strong');
      querySpan.textContent = this.currentQuery;

      resultEl.appendChild(document.createTextNode("'"));
      resultEl.appendChild(querySpan);
      resultEl.appendChild(document.createTextNode("' 검색 결과: " + visibleCards.length + '개'));
    },

    updateFilterCount: function() {
      // Sync with Filter module's count display
      if (window.Filter && typeof window.Filter.updateProductCount === 'function') {
        window.Filter.updateProductCount();
      }
    },

    toggleEmptyState: function(show) {
      var existing = this.productGrid
        ? this.productGrid.querySelector('.search-empty-state')
        : null;

      if (show && this.productGrid) {
        if (!existing) {
          var empty = document.createElement('div');
          empty.className = 'search-empty-state';
          empty.style.cssText = 'text-align:center;padding:3rem 1rem;color:#888;grid-column:1/-1;';

          var icon = document.createElement('div');
          icon.style.fontSize = '2.5rem';
          icon.style.marginBottom = '0.75rem';
          icon.textContent = '🔍';
          empty.appendChild(icon);

          var title = document.createElement('p');
          title.style.cssText = 'font-size:1.1rem;font-weight:600;margin-bottom:0.5rem;';
          title.textContent = '검색 결과 없음';
          empty.appendChild(title);

          var desc = document.createElement('p');
          desc.style.cssText = 'font-size:0.9rem;color:#aaa;';
          desc.textContent = '다른 검색어를 입력해 보세요.';
          empty.appendChild(desc);

          this.productGrid.appendChild(empty);
        } else {
          existing.style.display = '';
        }
      } else if (existing) {
        existing.style.display = 'none';
      }
    }
  };

  window.Search = Search;

  document.addEventListener('DOMContentLoaded', function() {
    Search.init();
  });
})();
