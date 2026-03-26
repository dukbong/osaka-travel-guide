(function() {
  'use strict';

  var table = document.getElementById('comparisonTable');
  if (!table) return;

  // =====================
  // Column Sorting
  // =====================
  var thead = table.querySelector('thead');
  var tbody = table.querySelector('tbody');
  var sortHeaders = thead.querySelectorAll('th.sortable');
  var currentSortCol = null;
  var currentSortDir = 'asc';

  sortHeaders.forEach(function(th) {
    th.addEventListener('click', function() {
      var sortKey = th.dataset.sort;
      if (currentSortCol === sortKey) {
        currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortCol = sortKey;
        currentSortDir = 'asc';
      }

      sortHeaders.forEach(function(h) {
        h.classList.remove('sort-asc', 'sort-desc');
      });
      th.classList.add(currentSortDir === 'asc' ? 'sort-asc' : 'sort-desc');

      var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
      var colIndex = Array.prototype.indexOf.call(th.parentElement.children, th);

      rows.sort(function(a, b) {
        var aVal, bVal;
        if (sortKey === 'price') {
          aVal = parseFloat(a.dataset.price) || 0;
          bVal = parseFloat(b.dataset.price) || 0;
        } else if (sortKey === 'duration') {
          aVal = parseFloat(a.dataset.duration) || 0;
          bVal = parseFloat(b.dataset.duration) || 0;
        } else if (sortKey === 'height') {
          aVal = parseFloat(a.dataset.height) || 0;
          bVal = parseFloat(b.dataset.height) || 0;
        } else if (sortKey === 'travel') {
          aVal = parseFloat(a.dataset.travel) || 0;
          bVal = parseFloat(b.dataset.travel) || 0;
        } else if (sortKey === 'attractions') {
          aVal = parseFloat(a.dataset.attractions) || 0;
          bVal = parseFloat(b.dataset.attractions) || 0;
        } else {
          var aCells = a.querySelectorAll('td');
          var bCells = b.querySelectorAll('td');
          aVal = aCells[colIndex] ? aCells[colIndex].textContent.trim() : '';
          bVal = bCells[colIndex] ? bCells[colIndex].textContent.trim() : '';
          var aNum = parseFloat(aVal.replace(/[^0-9.\-]/g, ''));
          var bNum = parseFloat(bVal.replace(/[^0-9.\-]/g, ''));
          if (!isNaN(aNum) && !isNaN(bNum)) {
            aVal = aNum;
            bVal = bNum;
          }
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return currentSortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }
        var comp = String(aVal).localeCompare(String(bVal), 'ko');
        return currentSortDir === 'asc' ? comp : -comp;
      });

      rows.forEach(function(row) {
        tbody.appendChild(row);
      });
    });
  });

  // =====================
  // Sticky Compare Bar
  // =====================
  var stickyBar = document.getElementById('stickyCompareBar');
  var stickyItems = document.getElementById('stickyCompareItems');
  var stickyCount = document.getElementById('stickyCount');
  var stickyCompareBtn = document.getElementById('stickyCompareBtn');
  var stickyClearBtn = document.getElementById('stickyClearBtn');
  var checkboxes = table.querySelectorAll('.sticky-compare-check');
  var maxCompare = 3;
  var checkedIds = [];

  function updateStickyBar() {
    checkedIds = [];
    checkboxes.forEach(function(cb) {
      if (cb.checked) {
        checkedIds.push(parseInt(cb.dataset.productId, 10));
      }
    });

    stickyCount.textContent = String(checkedIds.length);
    stickyCompareBtn.disabled = checkedIds.length < 2;

    if (checkedIds.length > 0) {
      stickyBar.style.display = 'block';
    } else {
      stickyBar.style.display = 'none';
    }

    while (stickyItems.firstChild) stickyItems.removeChild(stickyItems.firstChild);
    checkedIds.forEach(function(pid) {
      var product = window.ALL_PRODUCTS[pid];
      if (!product) return;
      var item = document.createElement('span');
      item.className = 'sticky-compare-item';
      item.textContent = product.name.substring(0, 15) + '...';
      stickyItems.appendChild(item);
    });
  }

  checkboxes.forEach(function(cb) {
    cb.addEventListener('change', function() {
      if (cb.checked && checkedIds.length >= maxCompare) {
        cb.checked = false;
        return;
      }
      updateStickyBar();
    });
  });

  if (stickyClearBtn) {
    stickyClearBtn.addEventListener('click', function() {
      checkboxes.forEach(function(cb) { cb.checked = false; });
      updateStickyBar();
    });
  }

  if (stickyCompareBtn) {
    stickyCompareBtn.addEventListener('click', function() {
      if (checkedIds.length < 2) return;
      showCompareModal(checkedIds);
    });
  }

  // =====================
  // Compare Modal (DOM-based, no innerHTML)
  // =====================
  function createEl(tag, className, attrs) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (attrs) {
      Object.keys(attrs).forEach(function(k) { el.setAttribute(k, attrs[k]); });
    }
    return el;
  }

  function showCompareModal(ids) {
    var existing = document.getElementById('guideCompareModal');
    if (existing) existing.remove();

    var modal = createEl('div', 'guide-compare-modal', { id: 'guideCompareModal' });
    var content = createEl('div', 'guide-compare-modal-content');

    var header = createEl('div', 'guide-compare-modal-header');
    var h2 = document.createElement('h2');
    h2.textContent = '\uC0C1\uD488 \uBE44\uAD50';
    header.appendChild(h2);
    var closeBtn = createEl('button', 'guide-compare-close', { id: 'guideCompareClose' });
    closeBtn.textContent = '\u00D7';
    header.appendChild(closeBtn);
    content.appendChild(header);

    var body = createEl('div', 'guide-compare-body');
    var grid = createEl('div', 'guide-compare-grid');

    var guideProducts = window.GUIDE_PRODUCTS || [];

    ids.forEach(function(pid) {
      var product = window.ALL_PRODUCTS[pid];
      if (!product) return;
      var meta = null;
      guideProducts.forEach(function(gp) {
        if (gp.id === pid) meta = gp;
      });

      var card = createEl('div', 'guide-compare-card');

      var img = createEl('img', null, { src: product.image, alt: product.name, loading: 'lazy' });
      card.appendChild(img);

      var title = document.createElement('h3');
      title.textContent = meta ? meta.label : product.name;
      card.appendChild(title);

      if (meta && meta.summary) {
        var desc = createEl('p', 'compare-card-desc');
        desc.textContent = meta.summary;
        card.appendChild(desc);
      }

      var priceDiv = createEl('div', 'compare-card-price');
      priceDiv.textContent = product.salePrice.toLocaleString('ko-KR') + '\uC6D0';
      card.appendChild(priceDiv);

      var ratingDiv = createEl('div', 'compare-card-rating');
      ratingDiv.textContent = '\uD3C9\uC810 ' + product.rating;
      card.appendChild(ratingDiv);

      var buyLink = createEl('a', 'btn-cta btn-cta-primary compare-card-buy', {
        href: product.affiliateUrl,
        target: '_blank',
        rel: 'noopener'
      });
      buyLink.textContent = '\uC608\uC57D\uD558\uAE30';
      card.appendChild(buyLink);

      grid.appendChild(card);
    });

    body.appendChild(grid);
    content.appendChild(body);
    modal.appendChild(content);
    document.body.appendChild(modal);
    modal.style.display = 'flex';

    closeBtn.addEventListener('click', function() {
      modal.style.display = 'none';
    });

    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.style.display = 'none';
    });
  }

  // =====================
  // Accordion tracking
  // =====================
  var accordions = document.querySelectorAll('.review-accordion');
  accordions.forEach(function(details) {
    details.addEventListener('toggle', function() {
      // Analytics hook point for accordion open tracking
    });
  });

})();
