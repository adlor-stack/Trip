import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { customAlphabet } from 'nanoid';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL manquant. Renseignez-le dans .env (voir .env.example).');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const nanoid = customAlphabet('abcdefghijkmnpqrstuvwxyz23456789', 16);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS trips (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      data JSONB NOT NULL DEFAULT '{"generalBookings":[],"stops":[]}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const slug = nanoid();
  await sql`INSERT INTO trips (slug) VALUES (${slug})`;

  console.log('\n✅ Voyage créé.\n');
  console.log('Lien privé (à ajouter à l\'écran d\'accueil sur vos deux iPhones) :');
  console.log(`\n  https://VOTRE-DOMAINE-VERCEL.vercel.app/trip/${slug}\n`);
  console.log('Ne partagez ce lien qu\'avec les personnes autorisées : c\'est lui qui protège l\'accès aux données.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
