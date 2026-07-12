# Canada — Carnet de route

App de suivi de voyage partagée, hébergée sur Vercel avec une base Postgres (Neon).
Pas de compte utilisateur : l'accès se fait via un lien privé difficile à deviner
(ex : `https://votre-app.vercel.app/trip/k3f8s9dj2m4nq7wr`).

## 1. Base de données

Si vous avez déjà un projet Neon (comme pour votre app de dépenses), vous pouvez
réutiliser la même base : cette app crée sa propre table `trips`, elle n'entre pas
en conflit avec vos autres tables.

Sinon, créez un projet gratuit sur [neon.tech](https://neon.tech), ou depuis
Vercel : **Storage → Create Database → Postgres (Neon)**.

Récupérez la chaîne de connexion (`DATABASE_URL`).

## 2. Configuration locale

```bash
cp .env.example .env
# éditez .env et collez votre DATABASE_URL

npm install
```

## 3. Créer le voyage (une seule fois)

```bash
npm run seed
```

Ça crée la table `trips` si besoin, génère un lien privé unique, et l'affiche
dans le terminal. Gardez ce lien : c'est lui qu'il faut ouvrir sur vos deux
iPhones.

## 4. Déploiement sur Vercel

```bash
git init
git add .
git commit -m "Carnet de route Canada"
```

Poussez sur un repo GitHub, puis sur [vercel.com](https://vercel.com) :
**Add New Project** → importez le repo → dans les Environment Variables,
ajoutez `DATABASE_URL` (la même valeur que dans `.env`) → **Deploy**.

## 5. Sur vos iPhones

Ouvrez `https://votre-app.vercel.app/trip/<votre-code>` dans Safari, puis
**Partager → Sur l'écran d'accueil**. Ça se comporte comme une vraie app,
sans barre d'adresse.

## Fonctionnement

- Toutes les données (vols, voiture, étapes, hôtels, activités) sont stockées
  en une seule ligne JSON dans la table `trips`.
- Chaque modification est enregistrée immédiatement en base.
- L'app se resynchronise automatiquement toutes les 12 secondes et à chaque
  retour au premier plan, donc si vous modifiez sur votre téléphone, Lamyae
  voit la mise à jour en revenant sur l'app (pas besoin de tirer pour
  rafraîchir, mais ça marche aussi si vous rouvrez l'app).
- Ce n'est pas du "temps réel" au sens strict (pas de WebSocket) : c'est un
  choix volontaire pour rester simple et bon marché à héberger. Si un vrai
  temps réel s'avère utile pendant le voyage (édition simultanée fréquente),
  on pourra ajouter Supabase Realtime ou Pusher facilement.

## Sécurité du lien

Le lien contient un identifiant aléatoire de 16 caractères : il n'est pas
indexé, ne peut pas être deviné, mais n'est pas protégé par mot de passe.
Ne le partagez qu'avec les personnes de confiance, et évitez de le publier
publiquement (réseaux sociaux, etc.).
