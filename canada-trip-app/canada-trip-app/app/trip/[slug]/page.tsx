'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useParams } from 'next/navigation';

type GeneralBooking = {
  id: string;
  type: '✈️' | '🚗' | '🚆' | '📄';
  name: string;
  link?: string;
  direction?: 'aller' | 'retour';
  date?: string;
  time?: string;
  pickupDate?: string;
  pickupTime?: string;
  returnDate?: string;
  returnTime?: string;
};

type Activity = { name: string; link?: string };

type Stop = {
  id: string;
  city: string;
  start?: string;
  end?: string;
  driveTime?: string;
  hotelName?: string;
  hotelLink?: string;
  hotelAddress?: string;
  checkin?: string;
  checkout?: string;
  activities?: Activity[];
  cityImage?: string;
  hotelImage?: string;
};

const FALLBACK_START = '2026-08-14';
const FALLBACK_END = '2026-08-30';
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const GENERAL_LABELS: Record<string, string> = { '✈️': 'Vol', '🚗': 'Voiture', '🚆': 'Train', '📄': 'Autre' };

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function fmtDate(d?: string) {
  if (!d) return '';
  const [, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS[parseInt(m) - 1]}`;
}

function mapsLink(address: string) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);
}

function computeTripBounds(generalBookings: GeneralBooking[], stops: Stop[]) {
  let start: string | null = null;
  let end: string | null = null;
  generalBookings.forEach((b) => {
    if (b.type === '✈️' && b.date) {
      if (b.direction === 'aller' && (!start || b.date < start)) start = b.date;
      if (b.direction === 'retour' && (!end || b.date > end)) end = b.date;
    }
    if (b.type === '🚗') {
      if (b.pickupDate && (!start || b.pickupDate < start)) start = b.pickupDate;
      if (b.returnDate && (!end || b.returnDate > end)) end = b.returnDate;
    }
  });
  if (!start || !end) {
    const stopDates = stops.flatMap((s) => [s.start, s.end]).filter(Boolean).sort() as string[];
    if (stopDates.length) {
      if (!start) start = stopDates[0];
      if (!end) end = stopDates[stopDates.length - 1];
    }
  }
  if (!start) start = FALLBACK_START;
  if (!end) end = FALLBACK_END;
  return { start: start as string, end: end as string };
}

function computeCountdown(start: string, end: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const s = new Date(start);
  const e = new Date(end);
  if (today < s) {
    const diff = Math.ceil((s.getTime() - today.getTime()) / 86400000);
    return { n: 'J-' + diff, l: 'avant le départ' };
  } else if (today <= e) {
    const diff = Math.ceil((e.getTime() - today.getTime()) / 86400000);
    return { n: diff <= 0 ? 'Dernier jour' : diff + ' j', l: diff <= 0 ? '' : 'restants sur place' };
  }
  return { n: '✓', l: 'voyage terminé' };
}

function isCurrentStop(stop: Stop) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!stop.start || !stop.end) return false;
  return today >= new Date(stop.start) && today <= new Date(stop.end);
}

function bookingSubtitle(b: GeneralBooking) {
  if (b.type === '✈️') {
    const dir = b.direction === 'retour' ? 'Retour' : 'Aller';
    if (!b.date) return dir;
    return `${dir} · ${fmtDate(b.date)}${b.time ? ' · ' + b.time : ''}`;
  }
  if (b.type === '🚗') {
    const parts: string[] = [];
    if (b.pickupDate) parts.push(`Récup. ${fmtDate(b.pickupDate)}${b.pickupTime ? ' ' + b.pickupTime : ''}`);
    if (b.returnDate) parts.push(`Rendu ${fmtDate(b.returnDate)}${b.returnTime ? ' ' + b.returnTime : ''}`);
    return parts.join(' → ');
  }
  if (b.date) return `${fmtDate(b.date)}${b.time ? ' · ' + b.time : ''}`;
  return '';
}

const emptyGenForm = {
  type: '✈️' as GeneralBooking['type'],
  name: '',
  link: '',
  direction: 'aller' as 'aller' | 'retour',
  date: '',
  time: '',
  pickupDate: '',
  pickupTime: '',
  returnDate: '',
  returnTime: ''
};

const emptyStopForm = {
  city: '',
  start: '',
  end: '',
  driveTime: '',
  hotelName: '',
  hotelLink: '',
  hotelAddress: '',
  checkin: '',
  checkout: '',
  cityImage: '',
  hotelImage: ''
};

function ImagePicker({
  label,
  value,
  uploading,
  onChange,
  onRemove
}: {
  label: string;
  value: string;
  uploading: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  const inputId = 'img-' + label.replace(/\s+/g, '-');
  return (
    <div className="image-picker">
      {value ? (
        <div className="image-picker-preview">
          <img src={value} alt={label} />
          <button type="button" className="image-picker-remove" onClick={onRemove}>×</button>
        </div>
      ) : (
        <label htmlFor={inputId} className="image-picker-empty">
          {uploading ? 'Envoi…' : `+ ${label}`}
        </label>
      )}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onChange}
        disabled={uploading}
      />
    </div>
  );
}

export default function TripPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [generalBookings, setGeneralBookings] = useState<GeneralBooking[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // view (consultation) sheets
  const [viewGeneral, setViewGeneral] = useState<GeneralBooking | null>(null);
  const [viewStop, setViewStop] = useState<Stop | null>(null);

  // edit sheets
  const [genOpen, setGenOpen] = useState(false);
  const [editingGeneralId, setEditingGeneralId] = useState<string | null>(null);
  const [genForm, setGenForm] = useState(emptyGenForm);

  const [stopOpen, setStopOpen] = useState(false);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [stopForm, setStopForm] = useState(emptyStopForm);
  const [activityDraft, setActivityDraft] = useState<Activity[]>([]);
  const [uploadingCity, setUploadingCity] = useState(false);
  const [uploadingHotel, setUploadingHotel] = useState(false);
  const [calculatingDrive, setCalculatingDrive] = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anyBlockingUiOpenRef = useRef(false);
  useEffect(() => {
    anyBlockingUiOpenRef.current = !!(genOpen || stopOpen || viewGeneral || viewStop);
  }, [genOpen, stopOpen, viewGeneral, viewStop]);

  async function fetchTrip(showLoading = false) {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`/api/trip/${slug}`, { cache: 'no-store' });
      const json = await res.json();
      setGeneralBookings(json.generalBookings || []);
      setStops(json.stops || []);
    } catch (e) {
      // silent fail on background poll
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    if (!slug) return;
    fetchTrip(true);
    const interval = setInterval(() => {
      if (!anyBlockingUiOpenRef.current) fetchTrip(false);
    }, 12000);
    const onFocus = () => {
      if (!anyBlockingUiOpenRef.current) fetchTrip(false);
    };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function flashToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1600);
  }

  const { start: tripStart, end: tripEnd } = computeTripBounds(generalBookings, stops);
  const days = Math.round((new Date(tripEnd).getTime() - new Date(tripStart).getTime()) / 86400000) + 1;
  const countdown = computeCountdown(tripStart, tripEnd);

  // ---------- general booking: view ----------
  function openGeneralView(b: GeneralBooking) {
    setViewGeneral(b);
  }
  function closeGeneralView() {
    setViewGeneral(null);
  }

  // ---------- general booking: edit ----------
  function openGeneralEdit(booking?: GeneralBooking) {
    if (booking) {
      setEditingGeneralId(booking.id);
      setGenForm({
        type: booking.type,
        name: booking.name || '',
        link: booking.link || '',
        direction: booking.direction || 'aller',
        date: booking.date || '',
        time: booking.time || '',
        pickupDate: booking.pickupDate || '',
        pickupTime: booking.pickupTime || '',
        returnDate: booking.returnDate || '',
        returnTime: booking.returnTime || ''
      });
    } else {
      setEditingGeneralId(null);
      setGenForm(emptyGenForm);
    }
    setViewGeneral(null);
    setGenOpen(true);
  }
  function closeGeneralEdit() {
    setGenOpen(false);
  }
  async function saveGeneral() {
    if (!genForm.name.trim()) {
      flashToast('Ajoutez un nom');
      return;
    }
    const base: GeneralBooking = {
      id: editingGeneralId || uid(),
      type: genForm.type,
      name: genForm.name.trim(),
      link: genForm.link.trim()
    };
    if (genForm.type === '✈️') {
      base.direction = genForm.direction;
      base.date = genForm.date;
      base.time = genForm.time;
    } else if (genForm.type === '🚗') {
      base.pickupDate = genForm.pickupDate;
      base.pickupTime = genForm.pickupTime;
      base.returnDate = genForm.returnDate;
      base.returnTime = genForm.returnTime;
    } else {
      base.date = genForm.date;
      base.time = genForm.time;
    }

    const isNew = !editingGeneralId;
    setGeneralBookings((prev) => (isNew ? [...prev, base] : prev.map((b) => (b.id === base.id ? base : b))));
    closeGeneralEdit();

    try {
      const res = await fetch(`/api/trip/${slug}/bookings${isNew ? '' : '/' + base.id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(base)
      });
      if (!res.ok) throw new Error('save failed');
      flashToast('Enregistré');
    } catch (e) {
      flashToast('Erreur d\'enregistrement');
      fetchTrip(false);
    }
  }
  async function deleteGeneral() {
    const id = editingGeneralId;
    if (!id) return;
    setGeneralBookings((prev) => prev.filter((b) => b.id !== id));
    closeGeneralEdit();
    try {
      const res = await fetch(`/api/trip/${slug}/bookings/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      flashToast('Supprimé');
    } catch (e) {
      flashToast('Erreur de suppression');
      fetchTrip(false);
    }
  }

  // ---------- stop: view ----------
  function openStopView(s: Stop) {
    setViewStop(s);
  }
  function closeStopView() {
    setViewStop(null);
  }

  // ---------- stop: edit ----------
  function openStopEdit(stop?: Stop) {
    if (stop) {
      setEditingStopId(stop.id);
      setStopForm({
        city: stop.city || '',
        start: stop.start || '',
        end: stop.end || '',
        driveTime: stop.driveTime || '',
        hotelName: stop.hotelName || '',
        hotelLink: stop.hotelLink || '',
        hotelAddress: stop.hotelAddress || '',
        checkin: stop.checkin || '',
        checkout: stop.checkout || '',
        cityImage: stop.cityImage || '',
        hotelImage: stop.hotelImage || ''
      });
      setActivityDraft((stop.activities || []).map((a) => ({ ...a })));
    } else {
      setEditingStopId(null);
      setStopForm(emptyStopForm);
      setActivityDraft([]);
    }
    setViewStop(null);
    setStopOpen(true);
  }
  function closeStopEdit() {
    setStopOpen(false);
  }
  async function saveStop() {
    if (!stopForm.city.trim()) {
      flashToast('Ajoutez une ville');
      return;
    }
    const cleanActivities = activityDraft.filter((a) => a.name && a.name.trim());
    const data: Stop = {
      id: editingStopId || uid(),
      city: stopForm.city.trim(),
      start: stopForm.start,
      end: stopForm.end,
      driveTime: stopForm.driveTime.trim(),
      hotelName: stopForm.hotelName.trim(),
      hotelLink: stopForm.hotelLink.trim(),
      hotelAddress: stopForm.hotelAddress.trim(),
      checkin: stopForm.checkin,
      checkout: stopForm.checkout,
      activities: cleanActivities,
      cityImage: stopForm.cityImage,
      hotelImage: stopForm.hotelImage
    };

    const isNew = !editingStopId;
    setStops((prev) => (isNew ? [...prev, data] : prev.map((s) => (s.id === data.id ? data : s))));
    closeStopEdit();

    try {
      const res = await fetch(`/api/trip/${slug}/stops${isNew ? '' : '/' + data.id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('save failed');
      flashToast('Enregistré');
    } catch (e) {
      flashToast('Erreur d\'enregistrement');
      fetchTrip(false);
    }
  }
  async function deleteStop() {
    const id = editingStopId;
    if (!id) return;
    setStops((prev) => prev.filter((s) => s.id !== id));
    closeStopEdit();
    try {
      const res = await fetch(`/api/trip/${slug}/stops/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      flashToast('Supprimé');
    } catch (e) {
      flashToast('Erreur de suppression');
      fetchTrip(false);
    }
  }

  function updateActivity(i: number, key: 'name' | 'link', value: string) {
    setActivityDraft((prev) => prev.map((a, idx) => (idx === i ? { ...a, [key]: value } : a)));
  }
  function removeActivity(i: number) {
    setActivityDraft((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ---------- images ----------
  async function uploadImage(file: File): Promise<string | null> {
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error('upload failed');
      const json = await res.json();
      return json.url || null;
    } catch (e) {
      flashToast('Erreur d\'envoi de la photo');
      return null;
    }
  }
  async function handleCityImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCity(true);
    const url = await uploadImage(file);
    if (url) setStopForm((f) => ({ ...f, cityImage: url }));
    setUploadingCity(false);
    e.target.value = '';
  }
  async function handleHotelImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHotel(true);
    const url = await uploadImage(file);
    if (url) setStopForm((f) => ({ ...f, hotelImage: url }));
    setUploadingHotel(false);
    e.target.value = '';
  }

  // ---------- temps de trajet automatique ----------
  function findPreviousStop(currentStart?: string) {
    const others = stops
      .filter((s) => s.id !== editingStopId)
      .sort((a, b) => (a.start || '').localeCompare(b.start || ''));
    if (!currentStart) return null;
    const before = others.filter((s) => (s.start || '') && (s.start || '') < currentStart);
    if (before.length === 0) return null;
    return before[before.length - 1];
  }
  async function autoCalcDriveTime() {
    const prev = findPreviousStop(stopForm.start);
    if (!prev || !prev.hotelAddress) {
      flashToast('Adresse de l\'étape précédente manquante');
      return;
    }
    if (!stopForm.hotelAddress.trim()) {
      flashToast('Ajoutez d\'abord l\'adresse de cette étape');
      return;
    }
    setCalculatingDrive(true);
    try {
      const res = await fetch(
        `/api/drive-time?from=${encodeURIComponent(prev.hotelAddress)}&to=${encodeURIComponent(stopForm.hotelAddress)}`
      );
      const json = await res.json();
      if (json.driveTime) {
        setStopForm((f) => ({ ...f, driveTime: json.driveTime }));
        flashToast(`≈ ${json.driveTime} · ${json.distanceKm} km`);
      } else {
        flashToast('Calcul impossible avec ces adresses');
      }
    } catch (e) {
      flashToast('Erreur de calcul');
    } finally {
      setCalculatingDrive(false);
    }
  }

  if (loading) {
    return <div className="loading-screen">Chargement du carnet de route…</div>;
  }

  const sortedStops = [...stops].sort((a, b) => (a.start || '').localeCompare(b.start || ''));

  return (
    <div className="app">
      <header>
        <div className="eyebrow">Carnet de route</div>
        <h1>Canada</h1>
        <div className="subdates">{fmtDate(tripStart)} → {fmtDate(tripEnd)} · {days} jours</div>
        <div className="countdown">
          <span className="n">{countdown.n}</span>
          <span className="l">{countdown.l}</span>
        </div>
      </header>

      <div className="status-bar">
        <span><span className="status-dot" />synchronisé</span>
      </div>

      <div className="section">
        <div className="section-title">
          Vols &amp; voiture <span className="count">{generalBookings.length}</span>
        </div>
        {generalBookings.length === 0 ? (
          <div className="empty">Pas encore de vol ou de voiture enregistré.</div>
        ) : (
          generalBookings.map((b) => (
            <div className="booking-card clickable" key={b.id} onClick={() => openGeneralView(b)}>
              <div className="booking-icon">{b.type}</div>
              <div className="booking-body">
                <div className="booking-label">
                  {GENERAL_LABELS[b.type] || 'Réservation'}
                  {bookingSubtitle(b) ? ' · ' + bookingSubtitle(b) : ''}
                </div>
                <div className="booking-name">{b.name || '—'}</div>
              </div>
              {b.link ? (
                <a
                  className="booking-link"
                  href={b.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >↗</a>
              ) : null}
            </div>
          ))
        )}
        <div className="add-row" onClick={() => openGeneralEdit()}>+ Ajouter une réservation</div>
      </div>

      <div className="section">
        <div className="section-title">
          Étapes du voyage <span className="count">{stops.length}</span>
        </div>
        {stops.length === 0 ? (
          <div className="empty">
            Aucune étape pour l&apos;instant.<br />
            <span className="add-link" onClick={() => openStopEdit()}>Ajouter votre première ville</span>
          </div>
        ) : (
          <div className="timeline">
            {sortedStops.map((s, i) => {
              const current = isCurrentStop(s);
              const activities = s.activities || [];
              return (
                <div key={s.id}>
                  {i > 0 && (
                    <div className="connector">
                      {s.driveTime ? (
                        <>🚗 <b>{s.driveTime}</b> de route jusqu&apos;à {s.city || 'cette étape'}</>
                      ) : (
                        <span className="muted-empty">Temps de trajet non renseigné</span>
                      )}
                    </div>
                  )}
                  <div className={`stop ${current ? 'current' : ''}`}>
                    <div className="stop-dot" />
                    <div className="stop-card clickable" onClick={() => openStopView(s)}>
                      {(s.cityImage || s.hotelImage) && (
                        <div className="stop-images">
                          <div className="stop-image-wrap">
                            {s.cityImage ? (
                              <img className="stop-image" src={s.cityImage} alt={s.city} />
                            ) : (
                              <div className="stop-image stop-image-empty">Ville</div>
                            )}
                          </div>
                          <div className="stop-image-wrap">
                            {s.hotelImage ? (
                              <img className="stop-image" src={s.hotelImage} alt={s.hotelName || 'Logement'} />
                            ) : (
                              <div className="stop-image stop-image-empty">Logement</div>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="stop-top">
                        <div>
                          <div className="stop-city">{s.city || 'Ville à définir'}</div>
                          <div className="stop-dates">{fmtDate(s.start)} → {fmtDate(s.end)}</div>
                        </div>
                        {current && <span className="stop-badge">En cours</span>}
                      </div>

                      <div className="stop-block">
                        <div className="stop-block-label">Hôtel / logement</div>
                        {s.hotelName ? (
                          <div className="item-row">
                            <div className="item-name">{s.hotelName}</div>
                          </div>
                        ) : (
                          <div className="muted-empty">Pas encore renseigné.</div>
                        )}
                      </div>

                      <div className="stop-block">
                        <div className="stop-block-label">Activités ({activities.length})</div>
                        {activities.length === 0 ? (
                          <div className="muted-empty">Aucune activité enregistrée.</div>
                        ) : (
                          <div className="muted-empty">{activities.map((a) => a.name).join(' · ')}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => openStopEdit()} title="Ajouter une étape">+</button>

      {/* GENERAL BOOKING — VIEW (consultation) */}
      <div className={`overlay ${viewGeneral ? 'open' : ''}`}>
        {viewGeneral && (
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="view-header">
              <div className="view-icon">{viewGeneral.type}</div>
              <div>
                <div className="view-kicker">{GENERAL_LABELS[viewGeneral.type] || 'Réservation'}</div>
                <div className="view-title">{viewGeneral.name}</div>
              </div>
            </div>

            <div className="view-rows">
              {bookingSubtitle(viewGeneral) && (
                <div className="view-row">
                  <span className="view-row-label">Quand</span>
                  <span className="view-row-value">{bookingSubtitle(viewGeneral)}</span>
                </div>
              )}
              {viewGeneral.link && (
                <a className="view-row view-row-link" href={viewGeneral.link} target="_blank" rel="noopener noreferrer">
                  <span className="view-row-label">Réservation</span>
                  <span className="view-row-value">Ouvrir le lien ↗</span>
                </a>
              )}
              {!viewGeneral.link && (
                <div className="view-row">
                  <span className="view-row-label">Réservation</span>
                  <span className="view-row-value muted-empty">Pas de lien</span>
                </div>
              )}
            </div>

            <div className="sheet-actions">
              <button className="btn btn-ghost" onClick={closeGeneralView}>Fermer</button>
              <button className="btn btn-primary" onClick={() => openGeneralEdit(viewGeneral)}>Modifier</button>
            </div>
          </div>
        )}
      </div>

      {/* STOP — VIEW (consultation) */}
      <div className={`overlay ${viewStop ? 'open' : ''}`}>
        {viewStop && (
          <div className="sheet">
            <div className="sheet-handle" />
            {(viewStop.cityImage || viewStop.hotelImage) && (
              <div className="stop-images stop-images-large">
                <div className="stop-image-wrap">
                  {viewStop.cityImage ? (
                    <img className="stop-image" src={viewStop.cityImage} alt={viewStop.city} />
                  ) : (
                    <div className="stop-image stop-image-empty">Ville</div>
                  )}
                </div>
                <div className="stop-image-wrap">
                  {viewStop.hotelImage ? (
                    <img className="stop-image" src={viewStop.hotelImage} alt={viewStop.hotelName || 'Logement'} />
                  ) : (
                    <div className="stop-image stop-image-empty">Logement</div>
                  )}
                </div>
              </div>
            )}
            <div className="view-header">
              <div>
                <div className="view-kicker">Étape</div>
                <div className="view-title">{viewStop.city || 'Ville à définir'}</div>
                <div className="view-subtitle">{fmtDate(viewStop.start)} → {fmtDate(viewStop.end)}</div>
              </div>
            </div>

            {viewStop.driveTime && (
              <div className="view-rows">
                <div className="view-row">
                  <span className="view-row-label">Trajet</span>
                  <span className="view-row-value">🚗 {viewStop.driveTime} depuis l&apos;étape précédente</span>
                </div>
              </div>
            )}

            <div className="view-section-title">Hôtel / logement</div>
            {viewStop.hotelName ? (
              <div className="view-rows">
                <div className="view-row">
                  <span className="view-row-label">Nom</span>
                  <span className="view-row-value">{viewStop.hotelName}</span>
                </div>
                {viewStop.hotelLink && (
                  <a className="view-row view-row-link" href={viewStop.hotelLink} target="_blank" rel="noopener noreferrer">
                    <span className="view-row-label">Réservation</span>
                    <span className="view-row-value">Ouvrir le lien ↗</span>
                  </a>
                )}
                {viewStop.hotelAddress && (
                  <a className="view-row view-row-link" href={mapsLink(viewStop.hotelAddress)} target="_blank" rel="noopener noreferrer">
                    <span className="view-row-label">Adresse</span>
                    <span className="view-row-value">{viewStop.hotelAddress} 🗺️</span>
                  </a>
                )}
                {(viewStop.checkin || viewStop.checkout) && (
                  <div className="view-row">
                    <span className="view-row-label">Horaires</span>
                    <span className="view-row-value">
                      {viewStop.checkin ? `Check-in ${viewStop.checkin}` : ''}
                      {viewStop.checkin && viewStop.checkout ? ' · ' : ''}
                      {viewStop.checkout ? `Check-out ${viewStop.checkout}` : ''}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="muted-empty" style={{ marginBottom: 14 }}>Pas encore renseigné.</div>
            )}

            <div className="view-section-title">Activités ({(viewStop.activities || []).length})</div>
            {(viewStop.activities || []).length === 0 ? (
              <div className="muted-empty" style={{ marginBottom: 14 }}>Aucune activité enregistrée.</div>
            ) : (
              <div className="view-rows">
                {(viewStop.activities || []).map((a, idx) =>
                  a.link ? (
                    <a className="view-row view-row-link" href={a.link} target="_blank" rel="noopener noreferrer" key={idx}>
                      <span className="view-row-value">{a.name}</span>
                      <span className="view-row-value">↗</span>
                    </a>
                  ) : (
                    <div className="view-row" key={idx}>
                      <span className="view-row-value">{a.name}</span>
                      <span className="no-link">pas de lien</span>
                    </div>
                  )
                )}
              </div>
            )}

            <div className="sheet-actions">
              <button className="btn btn-ghost" onClick={closeStopView}>Fermer</button>
              <button className="btn btn-primary" onClick={() => openStopEdit(viewStop)}>Modifier</button>
            </div>
          </div>
        )}
      </div>

      {/* GENERAL BOOKING — EDIT */}
      <div className={`overlay ${genOpen ? 'open' : ''}`}>
        <div className="sheet">
          <div className="sheet-handle" />
          <div className="sheet-title">{editingGeneralId ? 'Modifier la réservation' : 'Nouvelle réservation'}</div>

          <div className="field">
            <label>Type</label>
            <select
              value={genForm.type}
              onChange={(e) => setGenForm({ ...genForm, type: e.target.value as GeneralBooking['type'] })}
            >
              <option value="✈️">Vol</option>
              <option value="🚗">Voiture de location</option>
              <option value="🚆">Train</option>
              <option value="📄">Autre</option>
            </select>
          </div>

          <div className="field">
            <label>Nom / détail (ex : Air France AF123, Enterprise Calgary)</label>
            <input
              type="text"
              placeholder="ex : Vol aller Paris → Montréal"
              value={genForm.name}
              onChange={(e) => setGenForm({ ...genForm, name: e.target.value })}
            />
          </div>

          {genForm.type === '✈️' && (
            <>
              <div className="field">
                <label>Sens</label>
                <select
                  value={genForm.direction}
                  onChange={(e) => setGenForm({ ...genForm, direction: e.target.value as 'aller' | 'retour' })}
                >
                  <option value="aller">Aller (départ vers le Canada)</option>
                  <option value="retour">Retour (fin du voyage)</option>
                </select>
              </div>
              <div className="row2">
                <div className="field">
                  <label>Date</label>
                  <input type="date" value={genForm.date} onChange={(e) => setGenForm({ ...genForm, date: e.target.value })} />
                </div>
                <div className="field">
                  <label>Heure</label>
                  <input type="time" value={genForm.time} onChange={(e) => setGenForm({ ...genForm, time: e.target.value })} />
                </div>
              </div>
            </>
          )}

          {genForm.type === '🚗' && (
            <>
              <div className="row2">
                <div className="field">
                  <label>Récupération - date</label>
                  <input type="date" value={genForm.pickupDate} onChange={(e) => setGenForm({ ...genForm, pickupDate: e.target.value })} />
                </div>
                <div className="field">
                  <label>Récupération - heure</label>
                  <input type="time" value={genForm.pickupTime} onChange={(e) => setGenForm({ ...genForm, pickupTime: e.target.value })} />
                </div>
              </div>
              <div className="row2">
                <div className="field">
                  <label>Restitution - date</label>
                  <input type="date" value={genForm.returnDate} onChange={(e) => setGenForm({ ...genForm, returnDate: e.target.value })} />
                </div>
                <div className="field">
                  <label>Restitution - heure</label>
                  <input type="time" value={genForm.returnTime} onChange={(e) => setGenForm({ ...genForm, returnTime: e.target.value })} />
                </div>
              </div>
            </>
          )}

          {genForm.type !== '✈️' && genForm.type !== '🚗' && (
            <div className="row2">
              <div className="field">
                <label>Date</label>
                <input type="date" value={genForm.date} onChange={(e) => setGenForm({ ...genForm, date: e.target.value })} />
              </div>
              <div className="field">
                <label>Heure</label>
                <input type="time" value={genForm.time} onChange={(e) => setGenForm({ ...genForm, time: e.target.value })} />
              </div>
            </div>
          )}

          <div className="field">
            <label>Lien vers la réservation</label>
            <input type="url" placeholder="https://..." value={genForm.link} onChange={(e) => setGenForm({ ...genForm, link: e.target.value })} />
          </div>

          <div className="sheet-actions">
            <button className="btn btn-ghost" onClick={closeGeneralEdit}>Annuler</button>
            <button className="btn btn-primary" onClick={saveGeneral}>Enregistrer</button>
          </div>
          {editingGeneralId && (
            <button className="btn-danger-text" onClick={deleteGeneral}>Supprimer cette réservation</button>
          )}
        </div>
      </div>

      {/* STOP — EDIT */}
      <div className={`overlay ${stopOpen ? 'open' : ''}`}>
        <div className="sheet">
          <div className="sheet-handle" />
          <div className="sheet-title">{editingStopId ? 'Modifier l\'étape' : 'Nouvelle étape'}</div>

          <div className="field">
            <label>Ville</label>
            <input type="text" placeholder="ex : Québec" value={stopForm.city} onChange={(e) => setStopForm({ ...stopForm, city: e.target.value })} />
          </div>
          <div className="row2">
            <div className="field">
              <label>Arrivée</label>
              <input type="date" min={tripStart} max={tripEnd} value={stopForm.start} onChange={(e) => setStopForm({ ...stopForm, start: e.target.value })} />
            </div>
            <div className="field">
              <label>Départ</label>
              <input type="date" min={tripStart} max={tripEnd} value={stopForm.end} onChange={(e) => setStopForm({ ...stopForm, end: e.target.value })} />
            </div>
          </div>

          <div className="field">
            <label>Photos</label>
            <div className="row2">
              <ImagePicker
                label="Photo de la ville"
                value={stopForm.cityImage}
                uploading={uploadingCity}
                onChange={handleCityImageChange}
                onRemove={() => setStopForm((f) => ({ ...f, cityImage: '' }))}
              />
              <ImagePicker
                label="Photo du logement"
                value={stopForm.hotelImage}
                uploading={uploadingHotel}
                onChange={handleHotelImageChange}
                onRemove={() => setStopForm((f) => ({ ...f, hotelImage: '' }))}
              />
            </div>
          </div>

          <div className="field">
            <label>Temps de trajet en voiture depuis l&apos;étape précédente</label>
            <div className="drive-time-row">
              <input type="text" placeholder="ex : 3h30" value={stopForm.driveTime} onChange={(e) => setStopForm({ ...stopForm, driveTime: e.target.value })} />
              <button type="button" className="btn-calc" onClick={autoCalcDriveTime} disabled={calculatingDrive}>
                {calculatingDrive ? '…' : '🧭 Calculer'}
              </button>
            </div>
            <div className="hint-text">Calcule automatiquement à partir de l&apos;adresse de cette étape et de la précédente.</div>
          </div>

          <div className="field">
            <label>Hôtel / logement</label>
            <input
              type="text"
              placeholder="Nom de l'hôtel ou du Airbnb"
              style={{ marginBottom: 8 }}
              value={stopForm.hotelName}
              onChange={(e) => setStopForm({ ...stopForm, hotelName: e.target.value })}
            />
            <input
              type="url"
              placeholder="Lien de la réservation"
              style={{ marginBottom: 8 }}
              value={stopForm.hotelLink}
              onChange={(e) => setStopForm({ ...stopForm, hotelLink: e.target.value })}
            />
            <input
              type="text"
              placeholder="Adresse complète"
              value={stopForm.hotelAddress}
              onChange={(e) => setStopForm({ ...stopForm, hotelAddress: e.target.value })}
            />
          </div>
          <div className="row2">
            <div className="field">
              <label>Check-in</label>
              <input type="time" value={stopForm.checkin} onChange={(e) => setStopForm({ ...stopForm, checkin: e.target.value })} />
            </div>
            <div className="field">
              <label>Check-out</label>
              <input type="time" value={stopForm.checkout} onChange={(e) => setStopForm({ ...stopForm, checkout: e.target.value })} />
            </div>
          </div>

          <div className="field">
            <label>Activités réservées</label>
            {activityDraft.map((a, i) => (
              <div className="mini-list-item" key={i}>
                <input type="text" placeholder="Nom de l'activité" value={a.name} onChange={(e) => updateActivity(i, 'name', e.target.value)} />
                <input type="url" placeholder="Lien" style={{ maxWidth: 110 }} value={a.link || ''} onChange={(e) => updateActivity(i, 'link', e.target.value)} />
                <button className="mini-remove" onClick={() => removeActivity(i)}>×</button>
              </div>
            ))}
            <button className="mini-add" onClick={() => setActivityDraft((prev) => [...prev, { name: '', link: '' }])}>
              + Ajouter une activité
            </button>
          </div>

          <div className="sheet-actions">
            <button className="btn btn-ghost" onClick={closeStopEdit}>Annuler</button>
            <button className="btn btn-primary" onClick={saveStop}>Enregistrer</button>
          </div>
          {editingStopId && (
            <button className="btn-danger-text" onClick={deleteStop}>Supprimer cette étape</button>
          )}
        </div>
      </div>

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}
