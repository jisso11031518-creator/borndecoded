/**
 * Born Decoded — Saju Form Logic
 * Google Places Autocomplete + validation + submit to /api/saju-order
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('sajuForm');
  if (!form) return;

  const submitBtn = document.getElementById('submitBtn');
  const emailError = document.getElementById('emailError');
  const formMessage = document.getElementById('formMessage');

  // ---- Populate Dropdowns ----
  populateDateDropdowns(form);
  populateTimeDropdowns(form);

  // ---- "I don't know my birth time" ----
  const noTimeCheck = document.getElementById('noTimeCheck');
  const timeFields = document.getElementById('timeFields');
  noTimeCheck.addEventListener('change', () => {
    const disabled = noTimeCheck.checked;
    timeFields.querySelectorAll('select').forEach(s => {
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
      // Retry after Google Maps loads
      setTimeout(initAutocomplete, 500);
      return;
    }
    const input = document.getElementById('birthCityInput');
    const autocomplete = new google.maps.places.Autocomplete(input, {
      types: ['(cities)'],
      fields: ['geometry', 'utc_offset_minutes', 'formatted_address'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const lng = place.geometry.location.lng();
        cityData.longitude = lng;

        // Estimate timezone from UTC offset (Google provides utc_offset_minutes)
        if (place.utc_offset_minutes !== undefined) {
          cityData.timezone = utcOffsetToTimezone(place.utc_offset_minutes, place.formatted_address);
        } else {
          cityData.timezone = guessTimezone(lng);
        }

        document.getElementById('longitude').value = cityData.longitude;
        document.getElementById('timezone').value = cityData.timezone;
      }
      validateForm();
    });

    // Clear geo data if user manually edits
    input.addEventListener('input', () => {
      cityData = { longitude: null, timezone: null };
      document.getElementById('longitude').value = '';
      document.getElementById('timezone').value = '';
      validateForm();
    });
  }
  initAutocomplete();

  // ---- GA4 Event: form_start ----
  let formStarted = false;
  form.addEventListener('focusin', () => {
    if (!formStarted && typeof gtag === 'function') {
      gtag('event', 'form_start', { form_name: 'saju' });
      formStarted = true;
    }
  });

  // ---- Validate on input ----
  form.addEventListener('input', validateForm);
  form.addEventListener('change', validateForm);

  function validateForm() {
    const name = form.name.value.trim();
    const year = form.birthYear.value;
    const month = form.birthMonth.value;
    const day = form.birthDay.value;
    const city = form.birthCity.value.trim();
    const hasGeo = cityData.longitude !== null;
    const gender = form.gender.value;
    const email = form.email.value.trim();
    const emailConfirm = form.emailConfirm.value.trim();
    const agree1 = form.agreeEntertainment.checked;
    const agree2 = form.agreeRefund.checked;

    const emailsMatch = email && emailConfirm && email === emailConfirm;
    const emailsDontMatch = email && emailConfirm && email !== emailConfirm;
    emailError.classList.toggle('show', emailsDontMatch);

    const valid = name && year && month && day && city && hasGeo && gender && emailsMatch && agree1 && agree2;
    submitBtn.disabled = !valid;
    submitBtn.classList.toggle('disabled', !valid);
  }

  // ---- Submit ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // GA4 event
    if (typeof gtag === 'function') gtag('event', 'form_submit', { form_name: 'saju' });

    const noTime = noTimeCheck.checked;

    const payload = {
      product: 'saju',
      name: form.name.value.trim(),
      birthYear: parseInt(form.birthYear.value),
      birthMonth: parseInt(form.birthMonth.value),
      birthDay: parseInt(form.birthDay.value),
      birthHour: noTime ? null : (form.birthHour.value ? parseInt(form.birthHour.value) : null),
      birthMinute: noTime ? null : (form.birthMinute.value ? parseInt(form.birthMinute.value) : 0),
      birthTimeUnknown: noTime,
      birthCity: form.birthCity.value.trim(),
      longitude: parseFloat(document.getElementById('longitude').value),
      timezone: document.getElementById('timezone').value,
      gender: form.gender.value,
      contextRelationship: getRadioValue(form, 'contextRelationship'),
      contextCareer: getRadioValue(form, 'contextCareer'),
      contextCurious: getRadioValue(form, 'contextCurious'),
      question1: form.question1.value.trim(),
      question2: form.question2.value.trim(),
      question3: form.question3.value.trim(),
      email: form.email.value.trim(),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    formMessage.style.display = 'none';

    try {
      const res = await fetch('/api/saju-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Server error');
      }

      const data = await res.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        window.location.href = 'success.html';
      }
    } catch (err) {
      formMessage.textContent = err.message || 'Something went wrong. Please try again.';
      formMessage.style.color = 'var(--fire)';
      formMessage.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Pay $5 — Get Your Reading →';
    }
  });
});

// ---- Helpers ----
function getRadioValue(form, name) {
  const el = form.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '';
}

function populateDateDropdowns(form) {
  const yearSel = form.querySelector('[name="birthYear"]');
  const monthSel = form.querySelector('[name="birthMonth"]');
  const daySel = form.querySelector('[name="birthDay"]');

  for (let y = 2010; y >= 1940; y--) {
    yearSel.innerHTML += `<option value="${y}">${y}</option>`;
  }
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  months.forEach((m, i) => {
    monthSel.innerHTML += `<option value="${i + 1}">${m}</option>`;
  });
  for (let d = 1; d <= 31; d++) {
    daySel.innerHTML += `<option value="${d}">${d}</option>`;
  }
}

function populateTimeDropdowns(form) {
  const hourSel = form.querySelector('[name="birthHour"]');
  const minSel = form.querySelector('[name="birthMinute"]');

  for (let h = 0; h <= 23; h++) {
    hourSel.innerHTML += `<option value="${h}">${String(h).padStart(2, '0')}:00</option>`;
  }
  for (let m = 0; m <= 59; m += 5) {
    minSel.innerHTML += `<option value="${m}">${String(m).padStart(2, '0')}</option>`;
  }
}

// Estimate IANA timezone from UTC offset + address hint
function utcOffsetToTimezone(offsetMinutes, address) {
  const addr = (address || '').toLowerCase();
  // Common mappings
  if (addr.includes('korea')) return 'Asia/Seoul';
  if (addr.includes('japan') || addr.includes('tokyo')) return 'Asia/Tokyo';
  if (addr.includes('australia') || addr.includes('sydney')) return offsetMinutes === 600 ? 'Australia/Sydney' : 'Australia/Perth';
  if (addr.includes('london') || addr.includes('united kingdom')) return 'Europe/London';

  // US timezone guessing by offset
  const hours = offsetMinutes / 60;
  const US_MAP = { '-5': 'America/New_York', '-6': 'America/Chicago', '-7': 'America/Denver', '-8': 'America/Los_Angeles' };
  if (US_MAP[String(hours)]) return US_MAP[String(hours)];

  // Fallback: use Intl
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
  return `UTC${hours >= 0 ? '+' : ''}${hours}`;
}

function guessTimezone(longitude) {
  const offset = Math.round(longitude / 15);
  return `UTC${offset >= 0 ? '+' : ''}${offset}`;
}
