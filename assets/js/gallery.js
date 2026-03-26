/**
 * Osaka Travel Guide - Image Gallery & Lightbox
 */
(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', function() {
    var mainImg = document.getElementById('galleryMainImg');
    var dots = document.querySelectorAll('.gallery-dot');
    var thumbs = document.querySelectorAll('.gallery-thumb');

    if (!mainImg) return;

    function setActiveImage(src) {
      mainImg.src = src;

      dots.forEach(function(dot) {
        dot.classList.toggle('active', dot.dataset.img === src);
      });

      thumbs.forEach(function(thumb) {
        thumb.classList.toggle('active', thumb.dataset.img === src);
      });
    }

    // Dot clicks
    dots.forEach(function(dot) {
      dot.addEventListener('click', function() {
        setActiveImage(dot.dataset.img);
      });
    });

    // Thumb clicks
    thumbs.forEach(function(thumb) {
      thumb.addEventListener('click', function() {
        setActiveImage(thumb.dataset.img);
      });
    });

    // Lightbox on main image click
    mainImg.style.cursor = 'zoom-in';
    mainImg.addEventListener('click', function() {
      openLightbox(mainImg.src);
    });

    // Collect all images for lightbox navigation
    function getAllImages() {
      var images = [];
      if (dots.length > 0) {
        dots.forEach(function(dot) {
          images.push(dot.dataset.img);
        });
      } else {
        images.push(mainImg.src);
      }
      return images;
    }

    function openLightbox(src) {
      var images = getAllImages();
      var currentIndex = images.indexOf(src);
      if (currentIndex === -1) currentIndex = 0;

      // Create lightbox
      var lightbox = document.createElement('div');
      lightbox.className = 'lightbox open';

      var img = document.createElement('img');
      img.src = src;
      img.alt = '';
      lightbox.appendChild(img);

      var closeBtn = document.createElement('button');
      closeBtn.className = 'lightbox-close';
      closeBtn.textContent = '\u00d7';
      closeBtn.setAttribute('aria-label', '\ub2eb\uae30');
      lightbox.appendChild(closeBtn);

      if (images.length > 1) {
        var prevBtn = document.createElement('button');
        prevBtn.className = 'lightbox-nav prev';
        prevBtn.textContent = '\u2039';
        prevBtn.setAttribute('aria-label', '\uc774\uc804');
        lightbox.appendChild(prevBtn);

        var nextBtn = document.createElement('button');
        nextBtn.className = 'lightbox-nav next';
        nextBtn.textContent = '\u203a';
        nextBtn.setAttribute('aria-label', '\ub2e4\uc74c');
        lightbox.appendChild(nextBtn);

        prevBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          currentIndex = (currentIndex - 1 + images.length) % images.length;
          img.src = images[currentIndex];
          setActiveImage(images[currentIndex]);
        });

        nextBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          currentIndex = (currentIndex + 1) % images.length;
          img.src = images[currentIndex];
          setActiveImage(images[currentIndex]);
        });
      }

      closeBtn.addEventListener('click', function() {
        document.body.removeChild(lightbox);
      });

      lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) {
          document.body.removeChild(lightbox);
        }
      });

      // Keyboard navigation
      function onKeydown(e) {
        if (e.key === 'Escape') {
          document.body.removeChild(lightbox);
          document.removeEventListener('keydown', onKeydown);
        } else if (e.key === 'ArrowLeft' && images.length > 1) {
          currentIndex = (currentIndex - 1 + images.length) % images.length;
          img.src = images[currentIndex];
          setActiveImage(images[currentIndex]);
        } else if (e.key === 'ArrowRight' && images.length > 1) {
          currentIndex = (currentIndex + 1) % images.length;
          img.src = images[currentIndex];
          setActiveImage(images[currentIndex]);
        }
      }
      document.addEventListener('keydown', onKeydown);

      document.body.appendChild(lightbox);
    }
  });
})();
