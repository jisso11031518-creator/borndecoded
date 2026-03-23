/**
 * Born Decoded — Compatibility Form Logic
 * Populates dropdowns, validates, submits to n8n webhook
 */

const N8N_WEBHOOK_URL = ''; // Set your n8n webhook base URL here

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('compatForm');
  if (!form) return;

  const submitBtn = document.getElementById('submitBtn');
  const emailError = document.getElementById('emailError');
  const formMessage = document.getElementById('formMessage');

  // ---- Populate all dropdowns ----
  form.querySelectorAll('.birth-year').forEach(sel => {
    for (let y = 2010; y >= 1940; y--) sel.innerHTML += `<option value="${y}">${y}</option>`;
  });
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  form.querySelectorAll('.birth-month').forEach(sel => {
    months.forEach((m, i) => sel.innerHTML += `<option value="${i + 1}">${m}</option>`);
  });
  form.querySelectorAll('.birth-day').forEach(sel => {
    for (let d = 1; d <= 31; d++) sel.innerHTML += `<option value="${d}">${d}</option>`;
  });
  form.querySelectorAll('.birth-hour').forEach(sel => {
    for (let h = 0; h <= 23; h++) sel.innerHTML += `<option value="${h}">${String(h).padStart(2,'0')}:00</option>`;
  });
  form.querySelectorAll('.birth-minute').forEach(sel => {
    for (let m = 0; m <= 59; m += 5) sel.innerHTML += `<option value="${m}">${String(m).padStart(2,'0')}</option>`;
  });

  // ---- "I don't know birth time" checkboxes ----
  form.querySelectorAll('.no-time-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const target = cb.dataset.target;
      const hourSel = form.querySelector(`[name="${target}BirthHour"]`);
      const minSel = form.querySelector(`[name="${target}BirthMinute"]`);
      [hourSel, minSel].forEach(s => {
        s.disabled = cb.checked;
        s.value = '';
        s.style.opacity = cb.checked ? '0.4' : '1';
      });
    });
  });

  // ---- Validate ----
  form.addEventListener('input', validateForm);
  form.addEventListener('change', validateForm);

  function validateForm() {
    const p1name = form.person1Name.value.trim();
    const p1year = form.person1BirthYear.value;
    const p1month = form.person1BirthMonth.value;
    const p1day = form.person1BirthDay.value;
    const p1city = form.person1BirthCity.value.trim();
    const p1gender = form.person1Gender.value;

    const p2name = form.person2Name.value.trim();
    const p2year = form.person2BirthYear.value;
    const p2month = form.person2BirthMonth.value;
    const p2day = form.person2BirthDay.value;
    const p2city = form.person2BirthCity.value.trim();
    const p2gender = form.person2Gender.value;

    const relType = getRadioValue(form, 'relationshipType');
    const email = form.email.value.trim();
    const emailConfirm = form.emailConfirm.value.trim();
    const agree1 = form.agreeEntertainment.checked;
    const agree2 = form.agreeRefund.checked;

    const emailsMatch = email && emailConfirm && email === emailConfirm;
    const emailsDontMatch = email && emailConfirm && email !== emailConfirm;
    emailError.classList.toggle('show', emailsDontMatch);

    const valid = p1name && p1year && p1month && p1day && p1city && p1gender &&
                  p2name && p2year && p2month && p2day && p2city && p2gender &&
                  relType && emailsMatch && agree1 && agree2;

    submitBtn.disabled = !valid;
    submitBtn.classList.toggle('disabled', !valid);
  }

  // ---- Submit ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const p1noTime = form.querySelector('.no-time-check[data-target="person1"]').checked;
    const p2noTime = form.querySelector('.no-time-check[data-target="person2"]').checked;

    const payload = {
      product: 'compatibility',
      person1: {
        name: form.person1Name.value.trim(),
        birthYear: parseInt(form.person1BirthYear.value),
        birthMonth: parseInt(form.person1BirthMonth.value),
        birthDay: parseInt(form.person1BirthDay.value),
        birthHour: p1noTime ? null : (form.person1BirthHour.value ? parseInt(form.person1BirthHour.value) : null),
        birthMinute: p1noTime ? null : (form.person1BirthMinute.value ? parseInt(form.person1BirthMinute.value) : 0),
        birthTimeUnknown: p1noTime,
        birthCity: form.person1BirthCity.value.trim(),
        gender: form.person1Gender.value,
      },
      person2: {
        name: form.person2Name.value.trim(),
        birthYear: parseInt(form.person2BirthYear.value),
        birthMonth: parseInt(form.person2BirthMonth.value),
        birthDay: parseInt(form.person2BirthDay.value),
        birthHour: p2noTime ? null : (form.person2BirthHour.value ? parseInt(form.person2BirthHour.value) : null),
        birthMinute: p2noTime ? null : (form.person2BirthMinute.value ? parseInt(form.person2BirthMinute.value) : 0),
        birthTimeUnknown: p2noTime,
        birthCity: form.person2BirthCity.value.trim(),
        gender: form.person2Gender.value,
      },
      relationshipType: getRadioValue(form, 'relationshipType'),
      question1: form.question1.value.trim(),
      question2: form.question2.value.trim(),
      email: form.email.value.trim(),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    formMessage.style.display = 'none';

    try {
      if (!N8N_WEBHOOK_URL) {
        console.log('Compatibility order payload:', payload);
        window.location.href = 'success.html';
        return;
      }

      const res = await fetch(`${N8N_WEBHOOK_URL}/compatibility-order`, {
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
      submitBtn.textContent = 'Pay $5 — Get Your Compatibility Reading →';
    }
  });
});

function getRadioValue(form, name) {
  const el = form.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '';
}
