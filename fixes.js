// Keep workout/measurement records tied to the user's local calendar day,
// rather than the UTC day returned by Date#toISOString.
key = function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
render();
