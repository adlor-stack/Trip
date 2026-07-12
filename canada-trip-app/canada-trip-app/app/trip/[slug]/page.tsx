'use client';

import { useEffect, useRef, useState } from 'react';
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
};

type TripData = {
  generalBookings: GeneralBooking[];
  stops: Stop[];
};

const DEFAULT_TRIP: TripData = { generalBookings: [], stops: [] };
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

function computeTripBounds(trip: TripData) {
  let start: string | null = null;
  let end: string | null = null;
  trip.generalBookings.forEach((b) => {
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
    const stopDates = trip.stops.flatMap((s) => [s.start, s.end]).filter(Boolean).sort() as string[];
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
  checkout: ''
};

export default function TripPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [trip, setTrip] = useState<TripData>(DEFAULT_TRIP);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState('');
  const [anyModalOpen, setAnyModalOpen] = useState(false);

  const [genOpen, setGenOpen] = useState(false);
  const [editingGeneralId, setEditingGeneralId] = useState<string | null>(null);
  const [genForm, setGenForm] = useState(emptyGenForm);

  const [stopOpen, setStopOpen] = useState(false);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [stopForm, setStopForm] = useState(emptyStopForm);
  const [activityDraft, setActivityDraft] = useState<Activity[]>([]);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anyModalOpenRef = useRef(false);
  const savingRef = useRef(0);
  useEffect(() => {
    anyModalOpenRef.current = anyModalOpen;
  }, [anyModalOpen]);

  async function fetchTrip(showLoading = false) {
    if (!showLoading && savingRef.current > 0) return; // une sauvegarde est en cours, on n'écrase pas
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`/api/trip/${slug}`, { cache: 'no-store' });
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const json = await res.json();
      if (savingRef.current === 0) setTrip(json.data || DEFAULT_TRIP);
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
      if (!anyModalOpenRef.current) fetchTrip(false);
    }, 12000);
    const onFocus = () => {
      if (!anyModalOpenRef.current) fetchTrip(false);
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

  async function persist(next: TripData) {
    setTrip(next);
    savingRef.current += 1;
    try {
      const res = await fetch(`/api/trip/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: next })
      });
      if (!res.ok) throw new Error('save failed');
      const json = await res.json();
      if (json.data) setTrip(json.data);
      flashToast('Enregistré');
    } catch (e) {
      flashToast('Erreur d\'enregistrement');
    } finally {
      savingRef.current -= 1;
    }
  }

  const { start: tripStart, end: tripEnd } = computeTripBounds(trip);
  const days = Math.round((new Date(tripEnd).getTime() - new Date(tripStart).getTime()) / 86400000) + 1;
  const countdown = computeCountdown(tripStart, tripEnd);

  // ---------- general booking modal ----------
  function openGeneral(booking?: GeneralBooking) {
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
    setGenOpen(true);
    setAnyModalOpen(true);
  }
  function closeGeneral() {
    setGenOpen(false);
    setAnyModalOpen(stopOpen);
  }
  function saveGeneral() {
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
    const next = { ...trip };
    if (editingGeneralId) {
      next.generalBookings = next.generalBookings.map((b) => (b.id === editingGeneralId ? base : b));
    } else {
      next.generalBookings = [...next.generalBookings, base];
    }
    closeGeneral();
    persist(next);
  }
  function deleteGeneral() {
    const next = { ...trip, generalBookings: trip.generalBookings.filter((b) => b.id !== editingGeneralId) };
    closeGeneral();
    persist(next);
  }

  // ---------- stop modal ----------
  function openStop(stop?: Stop) {
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
        checkout: stop.checkout || ''
      });
      setActivityDraft((stop.activities || []).map((a) => ({ ...a })));
    } else {
      setEditingStopId(null);
      setStopForm(emptyStopForm);
      setActivityDraft([]);
    }
    setStopOpen(true);
    setAnyModalOpen(true);
  }
  function closeStop() {
    setStopOpen(false);
    setAnyModalOpen(genOpen);
  }
  function saveStop() {
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
      activities: cleanActivities
    };
    const next = { ...trip };
    if (editingStopId) {
      next.stops = next.stops.map((s) => (s.id === editingStopId ? data : s));
    } else {
      next.stops = [...next.stops, data];
    }
    closeStop();
    persist(next);
  }
  function deleteStop() {
    const next = { ...trip, stops: trip.stops.filter((s) => s.id !== editingStopId) };
    closeStop();
    persist(next);
  }

  function updateActivity(i: number, key: 'name' | 'link', value: string) {
    setActivityDraft((prev) => prev.map((a, idx) => (idx === i ? { ...a, [key]: value } : a)));
  }
  function removeActivity(i: number) {
    setActivityDraft((prev) => prev.filter((_, idx) => idx !== i));
  }

  if (notFound) {
    return (
      <div className="loading-screen">
        Ce lien de voyage n&apos;existe pas ou plus.
      </div>
    );
  }

  if (loading) {
    return <div className="loading-screen">Chargement du carnet de route…</div>;
  }

  const sortedStops = [...trip.stops].sort((a, b) => (a.start || '').localeCompare(b.start || ''));

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
          Vols &amp; voiture <span className="count">{trip.generalBookings.length}</span>
        </div>
        {trip.generalBookings.length === 0 ? (
          <div className="empty">Pas encore de vol ou de voiture enregistré.</div>
        ) : (
          trip.generalBookings.map((b) => (
            <div className="booking-card" key={b.id}>
              <div className="booking-icon">{b.type}</div>
              <div className="booking-body">
                <div className="booking-label">
                  {GENERAL_LABELS[b.type] || 'Réservation'}
                  {bookingSubtitle(b) ? ' · ' + bookingSubtitle(b) : ''}
                </div>
                <div className="booking-name">{b.name || '—'}</div>
              </div>
              {b.link ? (
                <a className="booking-link" href={b.link} target="_blank" rel="noopener noreferrer">↗</a>
              ) : null}
              <button className="booking-edit" onClick={() => openGeneral(b)}>✎</button>
            </div>
          ))
        )}
        <div className="add-row" onClick={() => openGeneral()}>+ Ajouter une réservation</div>
      </div>

      <div className="section">
        <div className="section-title">
          Étapes du voyage <span className="count">{trip.stops.length}</span>
        </div>
        {trip.stops.length === 0 ? (
          <div className="empty">
            Aucune étape pour l&apos;instant.<br />
            <span className="add-link" onClick={() => openStop()}>Ajouter votre première ville</span>
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
                    <div className="stop-card">
                      <div className="stop-top">
                        <div>
                          <div className="stop-city">{s.city || 'Ville à définir'}</div>
                          <div className="stop-dates">{fmtDate(s.start)} → {fmtDate(s.end)}</div>
                        </div>
                        {current && <span className="stop-badge">En cours</span>}
                        <button className="stop-menu" onClick={() => openStop(s)}>✎</button>
                      </div>

                      <div className="stop-block">
                        <div className="stop-block-label">Hôtel / logement</div>
                        {s.hotelName ? (
                          <>
                            <div className="item-row">
                              <div className="item-name">{s.hotelName}</div>
                              {s.hotelLink ? (
                                <a className="item-link" href={s.hotelLink} target="_blank" rel="noopener noreferrer">↗</a>
                              ) : (
                                <span className="no-link">pas de lien</span>
                              )}
                            </div>
                            {s.hotelAddress && (
                              <div className="item-row">
                                <div className="item-name muted-empty" style={{ color: 'var(--text-dim)' }}>
                                  {s.hotelAddress}
                                </div>
                                <a className="item-link" href={mapsLink(s.hotelAddress)} target="_blank" rel="noopener noreferrer">🗺️</a>
                              </div>
                            )}
                            {(s.checkin || s.checkout) && (
                              <div className="checkinout">
                                {s.checkin && <span>Check-in <b>{s.checkin}</b></span>}
                                {s.checkout && <span>Check-out <b>{s.checkout}</b></span>}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="muted-empty">Pas encore renseigné.</div>
                        )}
                      </div>

                      <div className="stop-block">
                        <div className="stop-block-label">Activités ({activities.length})</div>
                        {activities.length === 0 ? (
                          <div className="muted-empty">Aucune activité enregistrée.</div>
                        ) : (
                          activities.map((a, idx) => (
                            <div className="item-row" key={idx}>
                              <div className="item-name">{a.name}</div>
                              {a.link ? (
                                <a className="item-link" href={a.link} target="_blank" rel="noopener noreferrer">↗</a>
                              ) : (
                                <span className="no-link">pas de lien</span>
                              )}
                            </div>
                          ))
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

      <button className="fab" onClick={() => openStop()} title="Ajouter une étape">+</button>

      {/* GENERAL BOOKING MODAL */}
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
            <button className="btn btn-ghost" onClick={closeGeneral}>Annuler</button>
            <button className="btn btn-primary" onClick={saveGeneral}>Enregistrer</button>
          </div>
          {editingGeneralId && (
            <button className="btn-danger-text" onClick={deleteGeneral}>Supprimer cette réservation</button>
          )}
        </div>
      </div>

      {/* STOP MODAL */}
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
            <label>Temps de trajet en voiture depuis l&apos;étape précédente</label>
            <input type="text" placeholder="ex : 3h30" value={stopForm.driveTime} onChange={(e) => setStopForm({ ...stopForm, driveTime: e.target.value })} />
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
            <button className="btn btn-ghost" onClick={closeStop}>Annuler</button>
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
