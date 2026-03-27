/**
 * Born Decoded — Saju Form Logic
 * Google Places Autocomplete + validation + PayPal checkout
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

  // ---- Google Places Autocomplete (New API) ----
  let cityData = { longitude: null, timezone: null };

  function initAutocomplete() {
    if (typeof google === 'undefined' || !google.maps?.places) {
      setTimeout(initAutocomplete, 500);
      return;
    }

    const inputEl = document.getElementById('birthCityInput');
    const container = inputEl.parentElement;

    // Create PlaceAutocompleteElement
    const placeAuto = new google.maps.places.PlaceAutocompleteElement({
      types: ['(cities)'],
    });
    placeAuto.style.width = '100%';

    // Hide original input, insert Place element after it
    inputEl.style.display = 'none';
    container.appendChild(placeAuto);

    // Style the Place element to match form
    const style = document.createElement('style');
    style.textContent = `
      gmp-place-autocomplete { width: 100%; font-size: 1rem; padding: 10px 14px;
        border: 1px solid rgba(201,169,110,0.3); border-radius: 8px;
        background: white; color: #3C322D; }
    `;
    document.head.appendChild(style);

    placeAuto.addEventListener('gmp-placeselect', async (e) => {
      const place = e.place;
      await place.fetchFields({ fields: ['location', 'utcOffsetMinutes', 'formattedAddress'] });

      if (place.location) {
        const lng = place.location.lng();
        cityData.longitude = lng;

        if (place.utcOffsetMinutes !== undefined && place.utcOffsetMinutes !== null) {
          cityData.timezone = utcOffsetToTimezone(place.utcOffsetMinutes, place.formattedAddress || '');
        } else {
          cityData.timezone = guessTimezone(lng);
        }

        inputEl.value = place.formattedAddress || '';
        document.getElementById('longitude').value = cityData.longitude;
        document.getElementById('timezone').value = cityData.timezone;
      }
      validateForm();
    });

    placeAuto.addEventListener('gmp-placeclear', () => {
      cityData = { longitude: null, timezone: null };
      inputEl.value = '';
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

  let formIsValid = false;

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
    const agree3 = form.agreeTerms?.checked;

    const emailsMatch = email && emailConfirm && email === emailConfirm;
    const emailsDontMatch = email && emailConfirm && email !== emailConfirm;
    emailError.classList.toggle('show', emailsDontMatch);

    formIsValid = name && year && month && day && city && hasGeo && gender && emailsMatch && agree1 && agree2 && agree3;

    // Show/hide PayPal buttons based on validity
    const paypalContainer = document.getElementById('paypal-button-container');
    if (paypalContainer) {
      paypalContainer.style.display = formIsValid ? 'block' : 'none';
      submitBtn.style.display = formIsValid ? 'none' : '';
    }
    submitBtn.disabled = !formIsValid;
    submitBtn.classList.toggle('disabled', !formIsValid);
  }

  // ---- Prevent default form submit ----
  form.addEventListener('submit', (e) => {
    e.preventDefault();
  });

  // ---- PayPal Buttons ----
  let paypalRendered = false;

  function initPayPal() {
    if (typeof paypal === 'undefined') {
      setTimeout(initPayPal, 500);
      return;
    }
    if (paypalRendered) return;
    paypalRendered = true;

    // Create PayPal button container
    const container = document.createElement('div');
    container.id = 'paypal-button-container';
    container.style.display = 'none';
    container.style.marginTop = '4px';
    container.style.maxWidth = '400px';
    container.style.margin = '4px auto 0';
    submitBtn.parentElement.insertBefore(container, submitBtn);

    paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 45 },

      createOrder: async () => {
        if (!formIsValid) throw new Error('Please complete the form first');

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
          contextJob: (form.contextJob?.value || '').trim(),
          contextCurious: getRadioValue(form, 'contextCurious'),
          question1: form.question1.value.trim(),
          question2: form.question2.value.trim(),
          question3: form.question3.value.trim(),
          email: form.email.value.trim(),
        };

        // Save order to KV
        const orderRes = await fetch('/api/saju-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!orderRes.ok) {
          const err = await orderRes.json().catch(() => ({}));
          throw new Error(err.error || 'Server error');
        }
        const { orderId } = await orderRes.json();

        // Store orderId for capture step
        form.dataset.orderId = orderId;

        // Create PayPal order
        const ppRes = await fetch('/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, product: 'saju' }),
        });
        if (!ppRes.ok) throw new Error('Failed to create payment');
        const { paypalOrderId } = await ppRes.json();
        return paypalOrderId;
      },

      onApprove: async (data) => {
        formMessage.textContent = 'Completing payment...';
        formMessage.style.color = 'var(--gold)';
        formMessage.style.display = 'block';

        const orderId = form.dataset.orderId;
        const res = await fetch('/api/capture-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paypalOrderId: data.orderID, orderId }),
        });

        if (!res.ok) {
          formMessage.textContent = 'Payment verification failed. Please contact borndecoded@gmail.com';
          formMessage.style.color = 'var(--fire)';
          return;
        }

        if (typeof gtag === 'function') gtag('event', 'purchase', { value: 9.99, currency: 'USD' });
        window.location.href = 'success.html';
      },

      onCancel: () => {
        formMessage.textContent = 'Payment was cancelled. You can try again.';
        formMessage.style.color = 'var(--brown-light)';
        formMessage.style.display = 'block';
      },

      onError: (err) => {
        console.error('PayPal error:', err);
        formMessage.textContent = 'Payment error. Please try again.';
        formMessage.style.color = 'var(--fire)';
        formMessage.style.display = 'block';
      },
    }).render('#paypal-button-container');
  }
  initPayPal();
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

  const maxBirthYear = new Date().getFullYear() - 19;
  for (let y = maxBirthYear; y >= 1940; y--) {
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
