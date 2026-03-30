/**
 * Osaka Travel Guide - Product Filtering & Sorting
 * Handles category tabs, sort options, and animated transitions
 * Works with Jekyll-rendered product cards via DOM manipulation
 */
(function() {
  'use strict';

  var Filter = {
    currentCategory: 'all',
    currentSort: 'popular',
    animationDuration: 300,

    init: function() {
      this.cacheElements();
      if (!this.productGrid) return;
      this.bindCategoryTabs();
      this.bindSortOptions();
      this.updateProductCount();
    },

    cacheElements: function() {
      this.productGrid = document.querySelector('.product-grid, .products-grid, [data-product-grid]');
      this.categoryTabs = document.querySelectorAll('[data-category]');
      this.sortButtons = document.querySelectorAll('[data-sort]');
      this.countDisplay = document.querySelector('[data-product-count], .product-count');
    },

    bindCategoryTabs: function() {
      var self = this;
      var tabContainer = document.querySelector('.category-tabs, .filter-tabs, [data-category-tabs]');

      if (tabContainer) {
        tabContainer.addEventListener('click', function(e) {
          var tab = e.target.closest('[data-category]');
          if (!tab) return;
          e.preventDefault();
          self.filterByCategory(tab.dataset.category);
          self.setActiveTab(tab);
        });
      } else {
        this.categoryTabs.forEach(function(tab) {
          tab.addEventListener('click', function(e) {
            e.preventDefault();
            self.filterByCategory(tab.dataset.category);
            self.setActiveTab(tab);
          });
        });
      }
    },

    bindSortOptions: function() {
      var self = this;
      var sortContainer = document.querySelector('.sort-options, [data-sort-options]');

      if (sortContainer) {
        sortContainer.addEventListener('click', function(e) {
          var btn = e.target.closest('[data-sort]');
          if (!btn) return;
          e.preventDefault();
          self.sortProducts(btn.dataset.sort);
          self.setActiveSort(btn);
        });
      } else {
        this.sortButtons.forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.preventDefault();
            self.sortProducts(btn.dataset.sort);
            self.setActiveSort(btn);
          });
        });
      }

      // Also handle <select> based sort
      var sortSelect = document.querySelector('[data-sort-select], .sort-select');
      if (sortSelect) {
        sortSelect.addEventListener('change', function() {
          self.sortProducts(sortSelect.value);
          self.currentSort = sortSelect.value;
        });
      }
    },

    setActiveTab: function(activeTab) {
      this.categoryTabs.forEach(function(tab) {
        tab.classList.remove('active');
      });
      activeTab.classList.add('active');
    },

    setActiveSort: function(activeBtn) {
      this.sortButtons.forEach(function(btn) {
        btn.classList.remove('active');
      });
      activeBtn.classList.add('active');
    },

    getProductCards: function() {
      if (!this.productGrid) return [];
      return Array.prototype.slice.call(
        this.productGrid.querySelectorAll('.product-card, [data-product-id]')
      );
    },

    filterByCategory: function(category) {
      this.currentCategory = category;
      var cards = this.getProductCards();
      var self = this;

      // Fade out
      this.productGrid.style.opacity = '0';
      this.productGrid.style.transition = 'opacity ' + this.animationDuration + 'ms ease';

      setTimeout(function() {
        cards.forEach(function(card) {
          if (category === 'all') {
            card.style.display = '';
            card.removeAttribute('data-filtered-out');
          } else {
            var cardCategory = card.dataset.category || '';
            if (cardCategory === category) {
              card.style.display = '';
              card.removeAttribute('data-filtered-out');
            } else {
              card.style.display = 'none';
              card.setAttribute('data-filtered-out', 'true');
            }
          }
        });

        // Apply search filter on top if active
        if (window.Search && window.Search.currentQuery) {
          window.Search.applySearchFilter();
        }

        self.updateProductCount();

        // Fade in
        self.productGrid.style.opacity = '1';
      }, self.animationDuration);
    },

    sortProducts: function(sortType) {
      this.currentSort = sortType;
      var cards = this.getProductCards();
      var self = this;

      if (cards.length === 0) return;

      // Fade out
      this.productGrid.style.opacity = '0';
      this.productGrid.style.transition = 'opacity ' + this.animationDuration + 'ms ease';

      setTimeout(function() {
        var sortedCards = cards.slice().sort(function(a, b) {
          var aData = self.getCardData(a);
          var bData = self.getCardData(b);

          switch (sortType) {
            case 'popular':
              return (bData.purchaseCount || 0) - (aData.purchaseCount || 0);
            case 'rating':
              return (bData.rating || 0) - (aData.rating || 0);
            default:
              return 0;
          }
        });

        // Re-append in sorted order
        sortedCards.forEach(function(card) {
          self.productGrid.appendChild(card);
        });

        // Fade in
        self.productGrid.style.opacity = '1';
      }, self.animationDuration);
    },

    getCardData: function(card) {
      var productId = card.dataset.productId;
      var data = {
        purchaseCount: parseInt(card.dataset.purchaseCount, 10) || 0,
        salePrice: parseInt(card.dataset.salePrice, 10) || 0,
        rating: parseFloat(card.dataset.rating) || 0
      };

      // Fallback: try to find from window.PRODUCTS
      if (window.PRODUCTS && productId) {
        var pid = isNaN(Number(productId)) ? productId : Number(productId);
        var product = window.PRODUCTS.find(function(p) { return p.id === pid; });
        if (product) {
          data.purchaseCount = product.purchaseCount || data.purchaseCount;
          data.salePrice = product.salePrice || data.salePrice;
          data.rating = product.rating || data.rating;
        }
      }

      return data;
    },

    updateProductCount: function() {
      var cards = this.getProductCards();
      var visibleCount = cards.filter(function(card) {
        return card.style.display !== 'none' && !card.hasAttribute('data-filtered-out');
      }).length;

      if (this.countDisplay) {
        this.countDisplay.textContent = visibleCount;
      }

      // Also update any element with data-visible-count
      var altDisplay = document.querySelector('[data-visible-count]');
      if (altDisplay) {
        altDisplay.textContent = visibleCount + '개 상품';
      }

      // Show empty state if no results
      this.toggleEmptyState(visibleCount === 0);
    },

    toggleEmptyState: function(show) {
      var emptyEl = document.querySelector('.products-empty, [data-products-empty]');
      if (emptyEl) {
        emptyEl.style.display = show ? '' : 'none';
      } else if (show && this.productGrid) {
        // Create empty state if it doesn't exist
        var existing = this.productGrid.querySelector('.filter-empty-state');
        if (!existing) {
          var empty = document.createElement('div');
          empty.className = 'filter-empty-state';
          empty.style.cssText = 'text-align:center;padding:3rem 1rem;color:#888;grid-column:1/-1;';
          var icon = document.createElement('div');
          icon.textContent = '🔍';
          icon.style.fontSize = '2rem';
          empty.appendChild(icon);
          var msg = document.createElement('p');
          msg.textContent = '해당 카테고리에 상품이 없습니다.';
          empty.appendChild(msg);
          this.productGrid.appendChild(empty);
        } else {
          existing.style.display = '';
        }
      } else if (!show && this.productGrid) {
        var existingEmpty = this.productGrid.querySelector('.filter-empty-state');
        if (existingEmpty) {
          existingEmpty.style.display = 'none';
        }
      }
    },

    /** Public method: get current visible cards (used by search) */
    getVisibleCards: function() {
      return this.getProductCards().filter(function(card) {
        return card.style.display !== 'none';
      });
    },

    /** Public method: reset filter to show all */
    reset: function() {
      this.currentCategory = 'all';
      this.currentSort = 'popular';
      var allTab = document.querySelector('[data-category="all"]');
      if (allTab) this.setActiveTab(allTab);
      this.filterByCategory('all');
    }
  };

  window.Filter = Filter;

  document.addEventListener('DOMContentLoaded', function() {
    Filter.init();
  });
})();
