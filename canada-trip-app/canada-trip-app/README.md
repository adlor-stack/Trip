# Canada — Carnet de route

App de suivi de voyage partagée, hébergée sur Vercel avec une base Postgres (Neon).
Pas de compte utilisateur : l'accès se fait via un lien fixe
(`https://votre-app.vercel.app/trip/canada-2026`).

## Architecture (v2)

Chaque vol, chaque voiture, chaque étape est stocké comme sa propre ligne dans
sa propre table (`general_bookings`, `stops`). Ajouter, modifier ou supprimer
une entrée ne touche jamais aux autres, même si vous et Lamyae utilisez l'app
en même temps sur deux téléphones. Les tables se créent automatiquement au
premier appel, pas besoin de script de setup.

## 1. Base de données

Si vous avez déjà un projet Neon (comme pour votre app de dépenses), vous pouvez
réutiliser la même base : cette app crée ses propres tables, elle n'entre pas
en conflit avec vos autres tables.

Sinon, depuis Vercel : **Storage → Create Database → Postgres (Neon)**, puis
connectez-la à votre projet (ça ajoute automatiquement `DATABASE_URL` dans les
Environment Variables).

## 2. Déploiement

```bash
git init
git add .
git commit -m "Carnet de route Canada"
```

Poussez sur GitHub, puis importez le repo sur [vercel.com](https://vercel.com).
Vérifiez que **Framework Preset** est bien sur **Next.js**, et que
`DATABASE_URL` est bien renseigné dans les Environment Variables.

## 3. Sur vos iPhones

Ouvrez `https://votre-app.vercel.app/trip/canada-2026` dans Safari, puis
**Partager → Sur l'écran d'accueil**.

## Fonctionnement

- Chaque réservation ou étape a sa propre ligne en base : les modifications
  sont indépendantes les unes des autres.
- L'app se resynchronise automatiquement toutes les 12 secondes et à chaque
  retour au premier plan (pas de vrai WebSocket, volontairement, pour rester
  simple).
- Cliquer sur une réservation ou une étape l'ouvre en consultation ; un
  bouton "Modifier" à l'intérieur permet de l'éditer.

## Accès au lien

Le lien n'est pas protégé par mot de passe : toute personne qui le possède
peut voir et modifier le voyage. C'est un choix assumé pour rester simple à
deux.
