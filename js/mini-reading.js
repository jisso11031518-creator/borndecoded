/**
 * Born Decoded — Mini Reading (Free Hero)
 * Form submission, loading animation, result card rendering, GA4 events
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('miniForm');
  if (!form) return;

  const heroSection = document.getElementById('miniHero');
  const resultSection = document.getElementById('miniResult');
  const loadingSection = document.getElementById('miniLoading');
  const loadingText = document.getElementById('loadingText');
  const submitBtn = document.getElementById('miniSubmitBtn');

  // ---- Populate dropdowns ----
  const yearSel = form.querySelector('[name="year"]');
  const monthSel = form.querySelector('[name="month"]');
  const daySel = form.querySelector('[name="day"]');

  for (let y = 2012; y >= 1920; y--) {
    yearSel.innerHTML += `<option value="${y}">${y}</option>`;
  }
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  months.forEach((m, i) => {
    monthSel.innerHTML += `<option value="${i + 1}">${m}</option>`;
  });
  for (let d = 1; d <= 31; d++) {
    daySel.innerHTML += `<option value="${d}">${d}</option>`;
  }

  // ---- Form validation ----
  function validateForm() {
    const name = form.name.value.trim();
    const year = form.year.value;
    const month = form.month.value;
    const day = form.day.value;
    const gender = form.gender.value;
    const valid = name && year && month && day && gender;
    submitBtn.disabled = !valid;
    submitBtn.classList.toggle('disabled', !valid);
    return valid;
  }

  form.addEventListener('input', validateForm);
  form.addEventListener('change', validateForm);

  // ---- Loading stages ----
  const LOADING_STAGES = [
    "Reading your birth chart...",
    "Calculating your Five Elements...",
    "Decoding your Day Master...",
    "Almost there..."
  ];

  function startLoading() {
    heroSection.style.display = 'none';
    loadingSection.style.display = 'flex';
    resultSection.style.display = 'none';

    let stage = 0;
    loadingText.textContent = LOADING_STAGES[0];

    const interval = setInterval(() => {
      stage++;
      if (stage < LOADING_STAGES.length) {
        loadingText.style.opacity = '0';
        setTimeout(() => {
          loadingText.textContent = LOADING_STAGES[stage];
          loadingText.style.opacity = '1';
        }, 200);
      }
    }, 1200);

    return interval;
  }

  // ---- Element bar colors ----
  const ELEMENT_COLORS = {
    Wood: '#4A7C59',
    Fire: '#C75B3F',
    Earth: '#B8976A',
    Metal: '#8C8C8C',
    Water: '#4A6FA5',
  };

  const ELEMENT_ICONS = {
    Wood: '\u{1F333}',
    Fire: '\u{1F525}',
    Earth: '\u{26F0}\uFE0F',
    Metal: '\u{2699}\uFE0F',
    Water: '\u{1F4A7}',
  };

  // ---- Element insight descriptions ----
  const ELEMENT_INSIGHTS = {
    Wood:    { high: 'Growth-driven · always reaching', missing: 'Lacks flexibility and fresh starts' },
    Fire:    { high: 'Magnetic presence · impossible to ignore', missing: 'Lacks warmth, passion, and visibility' },
    Earth:   { high: 'Grounded · everyone leans on you', missing: 'Lacks stability and inner security' },
    Metal:   { high: 'Sharp mind · cuts through noise', missing: 'Lacks boundaries and decisiveness' },
    Water:   { high: 'Deep feeler · reads every room', missing: 'Lacks flow, intuition, and adaptability' },
  };

  // ---- Render result card ----
  function renderResult(data) {
    const resultCard = document.getElementById('resultCard');
    const ctaCard = document.getElementById('resultCTA');

    // Day Master badge — element-colored
    const dmBadge = resultCard.querySelector('.dm-badge');
    const elColor = ELEMENT_COLORS[data.dayMasterElement] || '#C9A96E';
    dmBadge.innerHTML = `
      <span class="dm-icon-lg">${ELEMENT_ICONS[data.dayMasterElement] || ''}</span>
      <div class="dm-text">
        <span class="dm-name">${data.dayMaster}</span>
        <span class="dm-hanja-inline">${data.dayMasterHanja}</span>
      </div>
    `;
    dmBadge.style.borderColor = elColor;
    dmBadge.style.background = `linear-gradient(135deg, ${elColor}12, ${elColor}06)`;

    // Name line
    resultCard.querySelector('.dm-intro').textContent = `${form.name.value.trim()}, you are`;

    // Element bars
    const barsContainer = resultCard.querySelector('.element-bars');
    barsContainer.innerHTML = '';
    const elements = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
    const maxPercent = Math.max(...elements.map(e => data.elementDistribution[e]), 1);

    // Find dominant element
    const dominantEl = elements.reduce((a, b) =>
      data.elementDistribution[a] >= data.elementDistribution[b] ? a : b
    );

    for (const el of elements) {
      const pct = data.elementDistribution[el];
      const isMissing = pct === 0;
      const isDominant = el === dominantEl && pct > 0;
      const barWidth = isMissing ? 0 : Math.max((pct / maxPercent) * 100, 4);
      const insight = ELEMENT_INSIGHTS[el];

      // Build insight text
      let insightText = '';
      if (isMissing) {
        insightText = `<span class="element-insight element-insight-missing">\u26A0 ${insight.missing}</span>`;
      } else if (isDominant) {
        insightText = `<span class="element-insight element-insight-dominant">\u2605 ${insight.high}</span>`;
      }

      const row = document.createElement('div');
      row.className = 'element-row' + (isMissing ? ' element-row-missing' : '') + (isDominant ? ' element-row-dominant' : '');
      row.innerHTML = `
        <span class="element-label">${ELEMENT_ICONS[el]} ${el}</span>
        <div class="element-bar-wrap">
          <div class="element-track">
            <div class="element-fill" style="width:0%;background:${ELEMENT_COLORS[el]};"></div>
          </div>
          <span class="element-pct">${pct}%</span>
        </div>
        ${insightText}
      `;
      barsContainer.appendChild(row);

      // Animate bar after append
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          row.querySelector('.element-fill').style.width = barWidth + '%';
        });
      });
    }

    // Personality & forecast
    resultCard.querySelector('.truth-text').textContent = `"${data.personality}"`;
    resultCard.querySelector('.forecast-text').textContent = `"${data.forecast2026}"`;

    // Show result
    loadingSection.style.display = 'none';
    resultSection.style.display = 'block';
    resultSection.classList.add('fade-in');

    // Smooth scroll to result
    setTimeout(() => {
      resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    // GA4: result shown
    if (typeof gtag === 'function') {
      gtag('event', 'mini_reading_result_shown', {
        day_master: data.dayMaster,
      });
    }
  }

  // ---- Form submit ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const loadingInterval = startLoading();
    const startTime = Date.now();

    // GA4: form submit
    if (typeof gtag === 'function') {
      gtag('event', 'mini_reading_submit', {
        form_name: 'mini_reading',
      });
    }

    try {
      const payload = {
        name: form.name.value.trim(),
        year: parseInt(form.year.value),
        month: parseInt(form.month.value),
        day: parseInt(form.day.value),
        gender: form.gender.value,
      };

      const response = await fetch('/api/mini-reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      // Ensure minimum 2s loading
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(2000 - elapsed, 0);

      setTimeout(() => {
        clearInterval(loadingInterval);
        renderResult(data);

        // GA4 with source
        if (typeof gtag === 'function') {
          gtag('event', 'mini_reading_submit', {
            day_master: data.dayMaster,
            source: data.source,
          });
        }
      }, remaining);

    } catch (err) {
      clearInterval(loadingInterval);
      loadingSection.style.display = 'none';
      heroSection.style.display = 'block';

      // Show error
      const errorEl = document.getElementById('miniError');
      if (errorEl) {
        errorEl.textContent = err.message || 'Something went wrong. Please try again.';
        errorEl.style.display = 'block';
        setTimeout(() => { errorEl.style.display = 'none'; }, 5000);
      }
    }
  });

  // ---- CTA click tracking ----
  document.addEventListener('click', (e) => {
    const ctaBtn = e.target.closest('.mini-cta-btn');
    if (!ctaBtn) return;
    if (typeof gtag === 'function') {
      gtag('event', 'mini_reading_cta_click', {
        cta_type: ctaBtn.dataset.cta || 'saju',
      });
    }
  });
});
