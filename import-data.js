(() => {
  const STORAGE_KEY = 'bodyforge50-v1';

  function mergeMeasurements(existing = [], incoming = []) {
    const byDate = new Map();
    incoming.forEach(item => item?.date && byDate.set(item.date, item));
    existing.forEach(item => item?.date && byDate.set(item.date, item));
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  function mergeState(current, incoming) {
    return {
      ...current,
      ...incoming,
      profile: { ...(current.profile || {}), ...(incoming.profile || {}) },
      measurements: mergeMeasurements(current.measurements, incoming.measurements),
      readiness: { ...(incoming.readiness || {}), ...(current.readiness || {}) },
      workouts: { ...(incoming.workouts || {}), ...(current.workouts || {}) },
      overrides: { ...(incoming.overrides || {}), ...(current.overrides || {}) },
      notes: [...(incoming.notes || []), ...(current.notes || [])]
    };
  }

  async function importFile(file) {
    const incoming = JSON.parse(await file.text());
    if (!incoming || typeof incoming !== 'object' || !incoming.profile) {
      throw new Error('This does not look like a BodyForge50 data file.');
    }
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const merged = mergeState(current, incoming);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }

  function appendDataControls() {
    const app = document.getElementById('app');
    if (!app || document.getElementById('importDataBtn')) return;

    const cards = [...app.querySelectorAll('.card')];
    const dataCard = cards.find(card => card.querySelector('h2')?.textContent.trim() === 'Data');
    if (!dataCard) return;

    const privacy = document.createElement('p');
    privacy.className = 'note';
    privacy.innerHTML = '<strong>Privacy:</strong> imported profile and health data stay in this browser. They are not uploaded to the public GitHub repository.';

    const row = document.createElement('div');
    row.className = 'btn-row';
    row.style.marginTop = '12px';

    const button = document.createElement('button');
    button.id = 'importDataBtn';
    button.type = 'button';
    button.className = 'primary-btn';
    button.textContent = 'Import Data';

    const input = document.createElement('input');
    input.id = 'importDataFile';
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.hidden = true;

    button.addEventListener('click', () => input.click());
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        await importFile(file);
        alert('BodyForge50 data imported successfully. Existing workout logs were preserved.');
        location.reload();
      } catch (error) {
        alert(`Import failed: ${error.message}`);
      } finally {
        input.value = '';
      }
    });

    dataCard.insertBefore(privacy, dataCard.querySelector('#exportBtn'));
    row.appendChild(button);
    row.appendChild(input);
    const exportBtn = dataCard.querySelector('#exportBtn');
    if (exportBtn) row.appendChild(exportBtn);
    dataCard.appendChild(row);
  }

  if (typeof window.renderProfile === 'function') {
    const originalRenderProfile = window.renderProfile;
    window.renderProfile = function (...args) {
      const result = originalRenderProfile.apply(this, args);
      appendDataControls();
      return result;
    };
  } else if (typeof renderProfile === 'function') {
    const originalRenderProfile = renderProfile;
    renderProfile = function (...args) {
      const result = originalRenderProfile.apply(this, args);
      appendDataControls();
      return result;
    };
  }

  // If Profile is already visible when this script loads, enhance it immediately.
  appendDataControls();
})();
