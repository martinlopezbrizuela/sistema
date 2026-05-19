const BIN_ID = "6a090b2fadc21f119aaf5293";
const API_KEY = "$2a$10$7rFsw/Rs1i.Z39Kt2LYdVuNmfJc0OR5xy706GRKw28q1wUi3tVChK";

let _saveTimeout = null;

async function loadCloud() {
  try {
    const response = await fetch(
      `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`,
      { headers: { "X-Master-Key": API_KEY } }
    );
    const data = await response.json();
    return data.record;
  } catch(error) {
    console.error("loadCloud error:", error);
    return null;
  }
}

async function saveCloud(data) {
  // Debounce: espera 1.5s antes de guardar para no spamear la API
  if (_saveTimeout) clearTimeout(_saveTimeout);
  _saveTimeout = setTimeout(async () => {
    try {
      const response = await fetch(
        `https://api.jsonbin.io/v3/b/${BIN_ID}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Master-Key": API_KEY
          },
          body: JSON.stringify(data)
        }
      );
      if (!response.ok) {
        console.error("saveCloud error:", response.status);
      }
    } catch(error) {
      console.error("saveCloud error:", error);
    }
  }, 1500);
}
