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

  function addImportControl() {
    const header = document.querySelector('.app-header');
    if (!header || document.getElementById('importDataBtn')) return;

    const button = document.createElement('button');
    button.id = 'importDataBtn';
    button.type = 'button';
    button.className = 'secondary-btn';
    button.textContent = 'Import Data';
    button.style.marginLeft = 'auto';
    button.style.whiteSpace = 'nowrap';

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.hidden = true;

    button.addEventListener('click', () => input.click());
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const incoming = JSON.parse(await file.text());
        if (!incoming || typeof incoming !== 'object' || !incoming.profile) {
          throw new Error('This does not look like a BodyForge50 data file.');
        }
        const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const merged = mergeState(current, incoming);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        alert('BodyForge50 data imported. Your existing workout logs were preserved.');
        location.reload();
      } catch (error) {
        alert(`Import failed: ${error.message}`);
      } finally {
        input.value = '';
      }
    });

    header.appendChild(button);
    header.appendChild(input);
  }

  addImportControl();
})();
