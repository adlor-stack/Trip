# Canada — Carnet de route

App de suivi de voyage partagée, hébergée sur Vercel avec une base Postgres (Neon)
et un stockage de fichiers (Vercel Blob) pour les photos.

## Architecture

Chaque vol, chaque voiture, chaque étape est stocké comme sa propre ligne dans
sa propre table (`general_bookings`, `stops`). Les tables et colonnes se
créent/mettent à jour automatiquement au premier appel.

## 1. Base de données

**Storage → Create Database → Postgres (Neon)**, connectez-la au projet
(ajoute `DATABASE_URL` automatiquement).

## 2. Stockage des photos (Vercel Blob)

**Storage → Create Database → Blob**, connectez-le au projet (ajoute
`BLOB_READ_WRITE_TOKEN` automatiquement dans les Environment Variables).
Sans ça, l'ajout de photos échouera (le reste de l'app fonctionne quand même).

## 3. Déploiement

Poussez le code sur GitHub, importez-le sur Vercel, vérifiez que **Framework
Preset** est **Next.js**, et que `DATABASE_URL` + `BLOB_READ_WRITE_TOKEN` sont
bien présents dans les Environment Variables.

## 4. Sur vos iPhones

Ouvrez `https://votre-app.vercel.app/trip/canada-2026` dans Safari, puis
**Partager → Sur l'écran d'accueil**.

## Fonctionnement

- Chaque réservation ou étape a sa propre ligne en base : les modifications
  sont indépendantes les unes des autres.
- Cliquer sur une réservation ou une étape l'ouvre en consultation ; un
  bouton "Modifier" à l'intérieur permet de l'éditer.
- Chaque étape peut avoir une photo de la ville et une photo du logement,
  stockées via Vercel Blob et affichées en haut de la vignette.
- Le temps de trajet entre deux étapes peut être calculé automatiquement à
  partir des adresses des logements (bouton "🧭 Calculer"), via des services
  cartographiques gratuits (OpenStreetMap + OSRM). Ça reste manuel-sur-demande
  plutôt qu'automatique-silencieux, car la précision dépend de la qualité des
  adresses saisies — vous gardez la main pour corriger si besoin.
- L'app se resynchronise automatiquement toutes les 12 secondes et à chaque
  retour au premier plan.

## Accès au lien

Le lien n'est pas protégé par mot de passe : toute personne qui le possède
peut voir et modifier le voyage. Choix assumé pour rester simple à deux.
