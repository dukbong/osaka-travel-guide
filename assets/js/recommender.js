(function() {
  'use strict';

  var container = document.getElementById('quizContainer');
  if (!container) return;

  var questions = JSON.parse(container.dataset.questions);
  var recommendations = JSON.parse(container.dataset.recommendations);
  var questionEls = document.querySelectorAll('.quiz-question');
  var progressFill = document.getElementById('quizProgressFill');
  var stepLabel = document.getElementById('quizStepLabel');
  var resultSection = document.getElementById('result');
  var resultProducts = document.getElementById('resultProducts');
  var resultSummary = document.getElementById('resultSummary');
  var retakeBtn = document.getElementById('retakeQuiz');

  var currentStep = 0;
  var answers = {};
  var totalSteps = questions.length;

  function updateProgress() {
    var pct = ((currentStep + 1) / totalSteps) * 100;
    progressFill.style.width = pct + '%';
    stepLabel.textContent = '\uC9C8\uBB38 ' + (currentStep + 1) + '/' + totalSteps;
  }

  function showQuestion(index) {
    questionEls.forEach(function(el, i) {
      el.style.display = i === index ? 'block' : 'none';
      if (i === index) {
        el.classList.add('quiz-question-enter');
        setTimeout(function() { el.classList.remove('quiz-question-enter'); }, 400);
      }
    });
    updateProgress();
  }

  function createEl(tag, className, attrs) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (attrs) {
      Object.keys(attrs).forEach(function(k) { el.setAttribute(k, attrs[k]); });
    }
    return el;
  }

  // Find best matching recommendation based on answers
  function findRecommendation() {
    // recommendations is an array of {condition: {}, productIds: [], reason: ""}
    if (!Array.isArray(recommendations) || recommendations.length === 0) return null;

    var bestMatch = null;
    var bestScore = -1;

    recommendations.forEach(function(rec) {
      var cond = rec.condition || {};
      var score = 0;
      var total = Object.keys(cond).length;

      Object.keys(cond).forEach(function(key) {
        if (answers[key] === cond[key]) {
          score++;
        }
      });

      if (score > bestScore) {
        bestScore = score;
        bestMatch = rec;
      }
    });

    return bestMatch;
  }

  function showResult() {
    var rec = findRecommendation();
    var recIds = rec ? rec.productIds : [];
    var reason = rec ? rec.reason : '';

    // Clear previous results
    while (resultSummary.firstChild) resultSummary.removeChild(resultSummary.firstChild);
    while (resultProducts.firstChild) resultProducts.removeChild(resultProducts.firstChild);

    var summaryP = createEl('p', 'result-summary-text');
    summaryP.textContent = reason || '\uC120\uD0DD\uD558\uC2E0 \uC870\uAC74\uC5D0 \uAC00\uC7A5 \uB9DE\uB294 \uC0C1\uD488\uC744 \uCD94\uCC9C\uD569\uB2C8\uB2E4.';
    resultSummary.appendChild(summaryP);

    recIds.forEach(function(pid) {
      var product = window.ALL_PRODUCTS[pid];
      if (!product) return;

      var guideMeta = null;
      window.GUIDE_PRODUCTS.forEach(function(gp) {
        if (gp.id === pid) guideMeta = gp;
      });

      var card = createEl('div', 'result-product-card');

      var img = createEl('img', null, { src: product.image, alt: product.name, loading: 'lazy' });
      card.appendChild(img);

      var info = createEl('div', 'result-product-info');

      var name = createEl('h3');
      name.textContent = guideMeta ? guideMeta.label : product.name;
      info.appendChild(name);

      if (guideMeta && guideMeta.summary) {
        var desc = createEl('p', 'result-product-desc');
        desc.textContent = guideMeta.summary;
        info.appendChild(desc);
      }

      var price = createEl('span', 'result-product-price');
      price.textContent = product.salePrice.toLocaleString('ko-KR') + '\uC6D0';
      info.appendChild(price);

      var buyBtn = createEl('a', 'btn-cta btn-cta-primary result-buy-btn', {
        href: product.affiliateUrl,
        target: '_blank',
        rel: 'noopener'
      });
      buyBtn.textContent = '\uC608\uC57D\uD558\uAE30';
      info.appendChild(buyBtn);

      card.appendChild(info);
      resultProducts.appendChild(card);
    });

    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    highlightRecommended(recIds);
  }

  function highlightRecommended(ids) {
    var table = document.getElementById('comparisonTable');
    if (!table) return;
    var rows = table.querySelectorAll('tbody tr');
    rows.forEach(function(row) {
      var pid = parseInt(row.dataset.productId, 10);
      if (ids.indexOf(pid) !== -1) {
        row.classList.add('highlighted');
      } else {
        row.classList.remove('highlighted');
      }
    });
  }

  function handleOptionClick(e) {
    var btn = e.target.closest('.quiz-option-btn');
    if (!btn) return;

    var qId = btn.dataset.question;
    var value = btn.dataset.value;
    answers[qId] = value;

    var siblings = btn.parentElement.querySelectorAll('.quiz-option-btn');
    siblings.forEach(function(s) { s.classList.remove('selected'); });
    btn.classList.add('selected');

    setTimeout(function() {
      if (currentStep < totalSteps - 1) {
        currentStep++;
        showQuestion(currentStep);
      } else {
        showResult();
      }
    }, 300);
  }

  container.addEventListener('click', handleOptionClick);

  if (retakeBtn) {
    retakeBtn.addEventListener('click', function() {
      currentStep = 0;
      answers = {};
      resultSection.style.display = 'none';

      var allBtns = container.querySelectorAll('.quiz-option-btn');
      allBtns.forEach(function(b) { b.classList.remove('selected'); });

      var table = document.getElementById('comparisonTable');
      if (table) {
        table.querySelectorAll('tbody tr').forEach(function(row) {
          row.classList.remove('highlighted');
        });
      }

      showQuestion(0);
      document.getElementById('quiz').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  showQuestion(0);
})();
