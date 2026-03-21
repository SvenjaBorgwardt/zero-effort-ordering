import { API_BASE } from '../config';

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

export async function speichereKassenBestellung(positionen, kommentar, transkription) {
  const res = await fetch(`${API_BASE}/kasse/bestellung`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ positionen, kommentar, transkription })
  });
  return res.json();
}

// === Stammdaten ===

export async function ladeKatalog() {
  const res = await fetch(`${API_BASE}/katalog`);
  return res.json();
}

export async function healthCheck() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

// === Backup: Foto-Erkennung (für spätere Nutzung) ===

export async function sendeErkennung(fotoBase64) {
  const res = await fetch(`${API_BASE}/erkennung`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ foto_base64: fotoBase64 })
  });
  return res.json();
}
