/* ============================================================
   Vitrio — скрипты лендинга
   1. Демо генерации по кнопке
   2. Туториал: плеер грузится только по клику
   3. Промо: счётчик участников
   ============================================================ */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     1. Демо генерации

     Сама анимация — CSS. Возврат к исходнику проигрывается тем же
     переходом в обратную сторону через класс is-reverting.
     JS держит три состояния: показан исходник → идёт прогон →
     показан результат. Повторный клик на результате возвращает
     исходник, чтобы можно было запустить ещё раз.
  --------------------------------------------------------- */
  function initGen(root) {
    var btn = root.querySelector('.gen__run');
    if (!btn) return;

    var LABEL_RUN = 'Сделать карточку товара';
    var LABEL_BUSY = 'Генерируем<span class="dots"></span>';
    var LABEL_AGAIN = 'Показать исходник';

    var fallback = null;
    var revertTimer = null;

    // состояние читаем из классов, а не держим в переменной: так подпись
    // на кнопке не может разойтись с тем, что показано на экране
    function state() {
      if (root.classList.contains('is-running')) return 'running';
      return root.classList.contains('is-done') ? 'done' : 'src';
    }

    function stopRevert() {
      clearTimeout(revertTimer);
      root.classList.remove('is-reverting');
    }

    function setSrc() {
      clearTimeout(fallback);
      var wasDone = root.classList.contains('is-done');
      root.classList.remove('is-running', 'is-done');
      btn.disabled = false;
      btn.innerHTML = LABEL_RUN;
      if (!wasDone) return;

      // возвращаемся к исходнику не рывком, а тем же переходом назад
      stopRevert();
      void root.offsetWidth;
      root.classList.add('is-reverting');

      var layer = root.querySelector('.gen__layer--src');
      var d = layer ? parseFloat(getComputedStyle(layer).animationDuration) * 1000 : NaN;
      if (!isFinite(d) || d < 60) d = 700;
      revertTimer = setTimeout(stopRevert, d + 120);
    }

    function setDone() {
      clearTimeout(fallback);
      stopRevert();
      root.classList.remove('is-running');
      root.classList.add('is-done');
      btn.disabled = false;
      btn.innerHTML = LABEL_AGAIN;
    }

    function run() {
      stopRevert();
      root.classList.remove('is-done', 'is-running');
      // без принудительного пересчёта браузер не перезапустит анимацию,
      // если класс снят и возвращён в одном кадре
      void root.offsetWidth;
      root.classList.add('is-running');
      btn.disabled = true;
      btn.innerHTML = LABEL_BUSY;

      // Страховка. animationend может не прийти вообще: в фоновой вкладке
      // браузер не проигрывает анимации, а при системном «уменьшить
      // движение» длительность схлопывается почти в ноль. Без этого
      // кнопка навсегда зависла бы в состоянии «Генерируем».
      clearTimeout(fallback);
      var layer = root.querySelector('.gen__layer--done');
      var dur = layer ? parseFloat(getComputedStyle(layer).animationDuration) * 1000 : NaN;
      if (!isFinite(dur) || dur < 0) dur = 3200;
      fallback = setTimeout(setDone, dur + 300);
    }

    btn.addEventListener('click', function () {
      var now = state();
      if (now === 'running') return;
      if (now === 'done') { setSrc(); return; }
      run();
    });

    // ждём проявление карточки; у вспышки, лучей, искр и плашек свои
    // анимации, их события тоже всплывают сюда — фильтруем по имени.
    // Имя зависит от режима движения, поэтому сверяем по префиксу.
    root.addEventListener('animationend', function (e) {
      if (e.animationName.indexOf('gen-emerge') === 0) setDone();
    });

    /* Наклон за курсором — только там, где есть настоящий курсор.
       На тач-экранах pointermove приходит от пальца, и блок дёргался
       бы при скролле. */
    var tilt = root.querySelector('.gen__tilt');
    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (tilt && canHover && !reduceMotion) {
      var MAX = 8;
      root.addEventListener('pointermove', function (e) {
        var r = root.getBoundingClientRect();
        var dx = (e.clientX - r.left) / r.width - 0.5;
        var dy = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.setProperty('--ry', (dx * MAX * 2).toFixed(2) + 'deg');
        tilt.style.setProperty('--rx', (-dy * MAX * 2).toFixed(2) + 'deg');
      });
      root.addEventListener('pointerleave', function () {
        tilt.style.setProperty('--ry', '0deg');
        tilt.style.setProperty('--rx', '0deg');
      });
    }

    setSrc();
  }

  /* ---------------------------------------------------------
     2. Туториал

     Плеер вставляем только по клику: до этого страница не делает
     ни одного запроса на сторонний домен и не тянет его скрипты.
  --------------------------------------------------------- */
  function initTutorial(box) {
    var cover = box.querySelector('.tutorial__cover');
    var src = box.getAttribute('data-embed');
    if (!cover || !src) return;

    cover.addEventListener('click', function () {
      var frame = document.createElement('iframe');
      frame.src = src;
      frame.title = box.getAttribute('data-embed-title') || 'Видео';
      frame.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      box.innerHTML = '';
      box.appendChild(frame);
    });
  }

  /* ---------------------------------------------------------
     3. Промо: счётчик участников

     Таймера здесь намеренно нет: вместо обратного отсчёта в блоке
     стоит текст «Предложение действует ограниченное время».
     Число участников выводится, только если задано настоящее —
     атрибут data-participants; пустой атрибут прячет строку.
  --------------------------------------------------------- */
  function initPromo(card) {
    var participants = (card.getAttribute('data-participants') || '').trim();
    var box = card.querySelector('[data-role="participants"]');
    var text = card.querySelector('[data-role="participants-text"]');
    if (!box || !text) return;
    if (participants && !isNaN(Number(participants))) {
      text.textContent = Number(participants).toLocaleString('ru-RU') +
        ' человек уже открыли подарок';
      box.hidden = false;
    }
  }

  /* --------------------------------------------------------- */
  document.querySelectorAll('.gen').forEach(initGen);
  document.querySelectorAll('.tutorial__box').forEach(initTutorial);
  document.querySelectorAll('.promo__card').forEach(initPromo);
})();
