/**
 * Born Decoded — Mini Reading (Free Hero)
 * Form with birth time + city, loading animation, result card, GA4
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('miniForm');
  if (!form) return;

  const heroSection = document.getElementById('miniHero');
  const resultSection = document.getElementById('miniResult');
  const loadingSection = document.getElementById('miniLoading');
  const loadingText = document.getElementById('loadingText');
  const submitBtn = document.getElementById('miniSubmitBtn');
  const noTimeCheck = document.getElementById('miniNoTime');
  const hourSel = document.getElementById('miniHour');
  const minuteSel = document.getElementById('miniMinute');

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
  for (let h = 0; h <= 23; h++) {
    hourSel.innerHTML += `<option value="${h}">${String(h).padStart(2, '0')}:00</option>`;
  }
  for (let m = 0; m <= 59; m += 5) {
    minuteSel.innerHTML += `<option value="${m}">${String(m).padStart(2, '0')}</option>`;
  }

  // ---- "I don't know my birth time" checkbox ----
  noTimeCheck.addEventListener('change', () => {
    const disabled = noTimeCheck.checked;
    [hourSel, minuteSel].forEach(s => {
      s.disabled = disabled;
      s.value = '';
      s.style.opacity = disabled ? '0.4' : '1';
    });
    validateForm();
  });

  // ---- Google Places Autocomplete ----
  let cityData = { longitude: null, timezone: null };

  function initAutocomplete() {
    if (typeof google === 'undefined' || !google.maps?.places) {
      setTimeout(initAutocomplete, 500);
      return;
    }
    const input = document.getElementById('miniBirthCity');
    const autocomplete = new google.maps.places.Autocomplete(input, {
      types: ['(cities)'],
      fields: ['geometry', 'utc_offset_minutes', 'formatted_address'],
    });
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const lng = place.geometry.location.lng();
        cityData.longitude = lng;
        cityData.timezone = place.utc_offset_minutes !== undefined
          ? utcOffsetToTimezone(place.utc_offset_minutes, place.formatted_address)
          : guessTimezone(lng);
        document.getElementById('miniLongitude').value = cityData.longitude;
        document.getElementById('miniTimezone').value = cityData.timezone;
      }
      validateForm();
    });
    input.addEventListener('input', () => {
      cityData = { longitude: null, timezone: null };
      document.getElementById('miniLongitude').value = '';
      document.getElementById('miniTimezone').value = '';
      validateForm();
    });
  }
  initAutocomplete();

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

  // ---- Render result card ----
  function renderResult(data) {
    const resultCard = document.getElementById('resultCard');
    const elColor = ELEMENT_COLORS[data.dayMasterElement] || '#C9A96E';

    // Day Master badge
    const dmBadge = resultCard.querySelector('.dm-badge');
    dmBadge.innerHTML = `
      <div class="dm-text">
        <span class="dm-name">${data.dayMaster}</span>
        <span class="dm-hanja-inline">${data.dayMasterHanja}</span>
      </div>
    `;
    dmBadge.style.borderColor = elColor;
    dmBadge.style.background = `linear-gradient(135deg, ${elColor}12, ${elColor}06)`;

    resultCard.querySelector('.dm-intro').textContent = `${form.name.value.trim()}, you are`;

    // Element bars
    const barsContainer = resultCard.querySelector('.element-bars');
    barsContainer.innerHTML = '';
    const elements = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
    const maxPercent = Math.max(...elements.map(e => data.elementDistribution[e]), 1);

    for (const el of elements) {
      const pct = data.elementDistribution[el];
      const isMissing = pct === 0;
      const barWidth = isMissing ? 0 : Math.max((pct / maxPercent) * 100, 4);
      const row = document.createElement('div');
      row.className = 'element-row';
      row.innerHTML = `
        <span class="element-label">${el}</span>
        <div class="element-track">
          <div class="element-fill" style="width:0%;background:${ELEMENT_COLORS[el]};"></div>
        </div>
        <span class="element-pct">${isMissing ? 'Missing' : pct + '%'}</span>
      `;
      barsContainer.appendChild(row);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          row.querySelector('.element-fill').style.width = barWidth + '%';
        });
      });
    }

    // Reading
    resultCard.querySelector('.reading-text').textContent = `"${data.reading}"`;

    // Show result
    loadingSection.style.display = 'none';
    resultSection.style.display = 'block';
    resultSection.classList.add('fade-in');
    setTimeout(() => {
      resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    if (typeof gtag === 'function') {
      gtag('event', 'mini_reading_result_shown', { day_master: data.dayMaster });
    }
  }

  // ---- Form submit ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const loadingInterval = startLoading();
    const startTime = Date.now();

    if (typeof gtag === 'function') {
      gtag('event', 'mini_reading_submit', { form_name: 'mini_reading' });
    }

    try {
      const noTime = noTimeCheck.checked;
      const payload = {
        name: form.name.value.trim(),
        year: parseInt(form.year.value),
        month: parseInt(form.month.value),
        day: parseInt(form.day.value),
        gender: form.gender.value,
        hour: noTime ? null : (hourSel.value ? parseInt(hourSel.value) : null),
        minute: noTime ? null : (minuteSel.value ? parseInt(minuteSel.value) : 0),
        birthCity: form.birthCity?.value?.trim() || '',
        longitude: document.getElementById('miniLongitude').value ? parseFloat(document.getElementById('miniLongitude').value) : null,
        timezone: document.getElementById('miniTimezone').value || null,
      };

      const response = await fetch('/api/mini-reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Something went wrong');

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(2000 - elapsed, 0);

      setTimeout(() => {
        clearInterval(loadingInterval);
        renderResult(data);
        if (typeof gtag === 'function') {
          gtag('event', 'mini_reading_submit', { day_master: data.dayMaster, source: data.source });
        }
      }, remaining);

    } catch (err) {
      clearInterval(loadingInterval);
      loadingSection.style.display = 'none';
      heroSection.style.display = 'block';
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
      gtag('event', 'mini_reading_cta_click', { cta_type: ctaBtn.dataset.cta || 'saju' });
    }
  });
});

// ---- Timezone helpers (from saju-form.js) ----
function utcOffsetToTimezone(offsetMinutes, address) {
  const addr = (address || '').toLowerCase();
  if (addr.includes('korea')) return 'Asia/Seoul';
  if (addr.includes('japan') || addr.includes('tokyo')) return 'Asia/Tokyo';
  if (addr.includes('london') || addr.includes('united kingdom')) return 'Europe/London';
  if (addr.includes('paris') || addr.includes('france')) return 'Europe/Paris';
  if (addr.includes('berlin') || addr.includes('germany')) return 'Europe/Berlin';
  if (addr.includes('sydney')) return 'Australia/Sydney';
  if (addr.includes('melbourne')) return 'Australia/Melbourne';
  if (addr.includes('brisbane')) return 'Australia/Brisbane';
  if (addr.includes('perth')) return 'Australia/Perth';
  if (addr.includes('australia')) return offsetMinutes === 600 ? 'Australia/Sydney' : 'Australia/Perth';
  const hours = offsetMinutes / 60;
  const OFFSET_MAP = {
    '-10':'Pacific/Honolulu','-9':'America/Anchorage','-8':'America/Los_Angeles',
    '-7':'America/Denver','-6':'America/Chicago','-5':'America/New_York',
    '-4':'America/Halifax','-3':'America/Sao_Paulo','0':'Europe/London',
    '1':'Europe/Paris','2':'Europe/Berlin','3':'Europe/Moscow','4':'Asia/Dubai',
    '5':'Asia/Karachi','5.5':'Asia/Kolkata','7':'Asia/Bangkok','8':'Asia/Shanghai',
    '9':'Asia/Seoul','10':'Australia/Sydney','11':'Pacific/Auckland','12':'Pacific/Auckland',
  };
  if (OFFSET_MAP[String(hours)]) return OFFSET_MAP[String(hours)];
  return `UTC${hours >= 0 ? '+' : ''}${hours}`;
}

function guessTimezone(longitude) {
  const offset = Math.round(longitude / 15);
  return `UTC${offset >= 0 ? '+' : ''}${offset}`;
}
