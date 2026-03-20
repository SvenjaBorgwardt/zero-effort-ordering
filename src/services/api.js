import { API_BASE } from '../config';

export async function sendeErkennung(fotoBase64, filialeId, mockId = null) {
  const body = { filiale_id: filialeId };
  if (mockId) {
    body.mock_id = mockId;
  } else {
    body.foto_base64 = fotoBase64;
  }

  const res = await fetch(`${API_BASE}/erkennung`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

export async function speichereBestellung(filialeId, filialeName, positionen, sonderbestellungen, kommentar) {
  const res = await fetch(`${API_BASE}/bestellung`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filiale_id: filialeId, filiale_name: filialeName, positionen, sonderbestellungen, kommentar })
  });
  return res.json();
}

export async function ladeBestellungen(datum, filialeId = null) {
  let url = `${API_BASE}/bestellungen?datum=${datum}`;
  if (filialeId) url += `&filiale=${filialeId}`;
  const res = await fetch(url);
  return res.json();
}

export async function ladeStatus(datum) {
  const res = await fetch(`${API_BASE}/status?datum=${datum}`);
  return res.json();
}

export async function ladeGesamt(datum) {
  const res = await fetch(`${API_BASE}/gesamt?datum=${datum}`);
  return res.json();
}

export async function ladeFilialen() {
  const res = await fetch(`${API_BASE}/filialen`);
  return res.json();
}

export async function ladeKatalog() {
  const res = await fetch(`${API_BASE}/katalog`);
  return res.json();
}

export async function healthCheck() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

// === Kassen-API (Sprach-POS) ===

export async function transkribiere(audioBase64, mimeType = 'audio/webm') {
  const res = await fetch(`${API_BASE}/kasse/transkribiere`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio_base64: audioBase64, mime_type: mimeType })
  });
  return res.json();
}

export async function erkenneSprache(transkription) {
  const res = await fetch(`${API_BASE}/kasse/erkenne`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transkription })
  });
  return res.json();
}
