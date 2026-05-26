const RAILWAY_URL = "https://sistema-sistema.up.railway.app";

let _saveTimeout = null;

async function loadCloud() {
  try {
    const res = await fetch(`${RAILWAY_URL}/api/data`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log('☁️ Datos cargados desde Railway');
    return data;
  } catch (err) {
    console.warn('⚠️ loadCloud error:', err.message);
    return null;
  }
}

async function saveCloud(data) {
  if (_saveTimeout) clearTimeout(_saveTimeout);
  _saveTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`${RAILWAY_URL}/api/data`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log('💾 Guardado en Railway ✓');
    } catch (err) {
      console.warn('⚠️ saveCloud error:', err.message);
    }
  }, 1500);
}
