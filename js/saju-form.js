/**
 * Born Decoded — Saju Form Logic
 * Populates dropdowns, validates, submits to n8n webhook
 */

// ---- Config ----
const N8N_WEBHOOK_URL = ''; // Set your n8n webhook base URL here

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
    const gender = form.gender.value;
    const email = form.email.value.trim();
    const emailConfirm = form.emailConfirm.value.trim();
    const agree1 = form.agreeEntertainment.checked;
    const agree2 = form.agreeRefund.checked;

    // Email match check
    const emailsMatch = email && emailConfirm && email === emailConfirm;
    const emailsDontMatch = email && emailConfirm && email !== emailConfirm;
    emailError.classList.toggle('show', emailsDontMatch);

    const valid = name && year && month && day && city && gender && emailsMatch && agree1 && agree2;
    submitBtn.disabled = !valid;
    submitBtn.classList.toggle('disabled', !valid);
  }

  // ---- Submit ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

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
      if (!N8N_WEBHOOK_URL) {
        // Demo mode: show data and redirect to success
        console.log('Saju order payload:', payload);
        window.location.href = 'success.html';
        return;
      }

      const res = await fetch(`${N8N_WEBHOOK_URL}/saju-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Server error');

      const data = await res.json();

      if (data.stripe_url) {
        window.location.href = data.stripe_url;
      } else {
        window.location.href = 'success.html';
      }
    } catch (err) {
      formMessage.textContent = 'Something went wrong. Please try again.';
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
    const label = `${String(h).padStart(2, '0')}:00`;
    hourSel.innerHTML += `<option value="${h}">${label}</option>`;
  }
  for (let m = 0; m <= 59; m += 5) {
    minSel.innerHTML += `<option value="${m}">${String(m).padStart(2, '0')}</option>`;
  }
}
