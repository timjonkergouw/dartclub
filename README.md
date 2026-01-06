# DartClub 🎯

Een moderne, mobile-first dart app gebouwd met Next.js voor het spelen van 501 en het bijhouden van dart statistieken.

## 📱 Beschrijving

DartClub is een responsive web applicatie speciaal ontworpen voor smartphones. De app biedt verschillende functionaliteiten voor dartspelers, waaronder het spelen van 501 (normaal en borrelmodus), het bekijken van statistieken, achievements en professionele uitslagen.

## 🚀 Voor Beginners: Wat is dit?

Als je nog niet veel ervaring hebt met web development, hier is een korte uitleg:

- **Next.js**: Een framework (toolkit) om websites te bouwen met React
- **React**: Een JavaScript library om interactieve gebruikersinterfaces te maken
- **TypeScript**: JavaScript met extra type-checking voor minder fouten
- **Supabase**: Een online database service waar we spelers en statistieken opslaan
- **Tailwind CSS**: Een manier om snel mooie styling toe te voegen aan je website

## 🛠️ Technologieën

### Core Technologies
- **Next.js 15** - React framework met App Router voor server-side rendering en routing
- **TypeScript 5** - Type-safe JavaScript voor betere code kwaliteit
- **React 19** - UI library voor interactieve componenten
- **Tailwind CSS 4** - Utility-first CSS framework voor snelle styling

### Backend & Database
- **Supabase** - Backend-as-a-Service voor database, authenticatie en real-time features
  - PostgreSQL database voor data opslag
  - Row Level Security (RLS) voor data beveiliging
  - Real-time subscriptions (momenteel niet actief gebruikt)

### Design System
- **Gilroy Font** - Modern lettertype geladen via CDN
- **Custom Color Palette**:
  - Achtergrond: `#0A294F` (donkerblauw)
  - Knoppen: `#E8F0FF` (lichtblauw)
  - Accent: `#28C7D8` (turquoise)
  - Tekst: `#000000` (zwart)
  - Subtekst: `#7E838F` (grijs)

## 📋 Functies

- 🎯 **Speel 501** - Normaal 501 spelen met volledige score tracking
- 🍺 **Speel 501 Borrelmodus** - Met vrienden en drankregels (nog te implementeren)
- 📊 **Statistieken** - Bekijk je dart statistieken (nog te implementeren)
- 🏆 **Achievements** - Bekijk je Achievements en Badges (nog te implementeren)
- 📺 **Uitslagen Profs** - Bekijk de uitslagen van de profs (nog te implementeren)

## 🗄️ Supabase Database Setup

### Wat is Supabase?

Supabase is een open-source alternatief voor Firebase. Het biedt:
- **PostgreSQL Database**: Een krachtige relationele database
- **Real-time**: Automatische updates wanneer data verandert
- **Authentication**: Gebruikersbeheer (momenteel niet gebruikt)
- **Storage**: Bestandsopslag (momenteel niet gebruikt)

### Database Schema

De app gebruikt momenteel twee tabellen:

#### `profiles` tabel
Slaat speler profielen op:
```sql
- id: integer (primary key, auto-increment)
- username: text (uniek, verplicht)
- created_at: timestamp (automatisch)
```

#### `dart_stats` tabel
Slaat spelstatistieken op:
```sql
- id: integer (primary key, auto-increment)
- game_id: text (uniek per spel)
- player_id: integer (foreign key naar profiles)
- average_score: numeric
- highest_score: integer
- checkout_percentage: numeric
- double_percentage: numeric
- ... (andere statistiek velden)
- created_at: timestamp
```

### Supabase Setup Instructies

1. **Maak een Supabase account** op [supabase.com](https://supabase.com)

2. **Maak een nieuw project**:
   - Kies een naam voor je project
   - Kies een database wachtwoord (bewaar dit veilig!)
   - Kies een regio dichtbij je gebruikers

3. **Maak de database tabellen**:
   - Ga naar de SQL Editor in je Supabase dashboard
   - Voer het volgende SQL script uit:

```sql
-- Maak profiles tabel
CREATE TABLE profiles (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maak dart_stats tabel
CREATE TABLE dart_stats (
  id SERIAL PRIMARY KEY,
  game_id TEXT NOT NULL,
  player_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  average_score NUMERIC,
  highest_score INTEGER,
  checkout_percentage NUMERIC,
  double_percentage NUMERIC,
  total_turns INTEGER,
  total_darts INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maak indexen voor betere performance
CREATE INDEX idx_dart_stats_player_id ON dart_stats(player_id);
CREATE INDEX idx_dart_stats_game_id ON dart_stats(game_id);
```

4. **Stel Row Level Security (RLS) in**:
   - Ga naar Authentication > Policies in je Supabase dashboard
   - Voor de `profiles` tabel, voeg deze policies toe:

```sql
-- Allow public to read profiles
CREATE POLICY "Allow public read on profiles"
ON profiles FOR SELECT
TO public
USING (true);

-- Allow public to insert profiles
CREATE POLICY "Allow public insert on profiles"
ON profiles FOR INSERT
TO public
WITH CHECK (true);

-- Allow public to update profiles
CREATE POLICY "Allow public update on profiles"
ON profiles FOR UPDATE
TO public
USING (true);

-- Allow public to delete profiles
CREATE POLICY "Allow public delete on profiles"
ON profiles FOR DELETE
TO public
USING (true);
```

5. **Haal je API keys op**:
   - Ga naar Project Settings > API
   - Kopieer de "Project URL" (dit is je `NEXT_PUBLIC_SUPABASE_URL`)
   - Kopieer de "anon public" key (dit is je `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

6. **Maak een `.env.local` bestand** in de root van je project:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

⚠️ **Belangrijk**: Voeg `.env.local` toe aan je `.gitignore` om te voorkomen dat je keys in git komen!

## 📦 Installatie

### Vereisten
- Node.js 18+ (check met `node --version`)
- npm of yarn package manager
- Een Supabase account (zie bovenstaande setup)

### Stappen

1. **Clone de repository**:
```bash
git clone <repository-url>
cd dartclub
```

2. **Installeer dependencies**:
```bash
npm install
```

3. **Maak een `.env.local` bestand** met je Supabase credentials (zie Supabase Setup hierboven)

4. **Start de development server**:
```bash
npm run dev
```

5. **Open de app** in je browser:
   - [http://localhost:3000](http://localhost:3000)

## 📁 Project Structuur

```
dartclub/
├── app/                          # Next.js App Router directory
│   ├── components/               # Herbruikbare React componenten
│   │   ├── FontLoader.tsx        # Laadt Gilroy font van CDN
│   │   └── HamburgerMenu.tsx     # Side menu component (niet gebruikt)
│   ├── play501game/              # 501 spel pagina
│   │   └── page.tsx              # Hoofdspel logica en UI
│   ├── speel-501/                # Spel setup pagina
│   │   └── page.tsx              # Speler selectie en instellingen
│   ├── favicon.ico               # Website favicon
│   ├── globals.css               # Global CSS styles
│   ├── layout.tsx                # Root layout met metadata
│   └── page.tsx                   # Home pagina met menu
├── lib/                          # Utility functies en helpers
│   ├── checkout.ts               # Checkout berekeningen (finish mogelijkheden)
│   ├── dartlogic.ts              # Dart spel logica (score tracking, stats)
│   └── supabase.ts               # Supabase client configuratie
├── public/                       # Statische bestanden
│   ├── *.png                     # Iconen en afbeeldingen
│   ├── *.svg                     # SVG iconen
│   ├── site.webmanifest          # PWA manifest
│   └── favicon files             # Favicon voor verschillende devices
├── .env.local                    # Environment variables (niet in git)
├── next.config.ts               # Next.js configuratie
├── package.json                  # Dependencies en scripts
├── tsconfig.json                 # TypeScript configuratie
└── README.md                     # Dit bestand
```

## 🔧 Scripts

- `npm run dev` - Start development server met hot reload
- `npm run build` - Build voor productie (optimalisatie en minificatie)
- `npm start` - Start productie server (na build)
- `npm run lint` - Run ESLint voor code kwaliteit checks

## 🏗️ Voor Developers: Architectuur Overzicht

### State Management
De app gebruikt React's ingebouwde state management:
- `useState` voor lokale component state
- `useEffect` voor side effects (data fetching, event listeners)
- `useCallback` voor geoptimaliseerde functies in dependencies

### Data Flow
1. **Speler Setup** (`speel-501/page.tsx`):
   - Gebruiker selecteert/maakt spelers
   - Data wordt opgehaald uit Supabase `profiles` tabel
   - Nieuwe spelers worden toegevoegd via Supabase INSERT

2. **Spel Logica** (`play501game/page.tsx`):
   - Spel state wordt lokaal beheerd in component
   - Scores worden berekend via `lib/dartlogic.ts`
   - Checkout mogelijkheden via `lib/checkout.ts`
   - Na spel einde worden stats opgeslagen in `dart_stats` tabel

3. **Database Interactie** (`lib/supabase.ts`):
   - Singleton Supabase client
   - Fallback naar placeholder client tijdens build (voorkomt crashes)
   - Client-side only operations (geen server-side queries)

### Key Features Implementatie

#### Device Motion (Schudden)
- Gebruikt DeviceMotionEvent API voor shake detection
- Permission request voor iOS 13+ devices
- Werkt alleen over HTTPS (productie requirement)
- Fallback naar handmatige knoppen als permission geweigerd wordt

#### Coin Flip & Wheel Spin
- CSS 3D transforms voor animaties
- Math.random() voor willekeurige resultaten
- Smooth transitions met cubic-bezier easing

#### Score Tracking
- Real-time score berekening
- Bust detection (score onder 0 of niet uit te gooien)
- Checkout suggestions
- Double percentage tracking

## 🔒 Beveiliging

- **Row Level Security (RLS)**: Supabase policies bepalen wie data kan lezen/schrijven
- **Environment Variables**: API keys worden niet in code opgeslagen
- **HTTPS Only**: Device motion API vereist beveiligde verbinding
- **Input Validation**: Client-side validatie voor gebruikersinput

## 🐛 Troubleshooting

### Supabase verbindingsproblemen
- Controleer of `.env.local` correct is ingesteld
- Verifieer dat je API keys correct zijn
- Check of RLS policies correct zijn ingesteld
- Kijk in browser console voor error messages

### Favicon/icons niet zichtbaar
- Clear browser cache
- Check of bestanden in `public/` folder staan
- Verifieer `app/layout.tsx` metadata configuratie

### Device motion werkt niet
- Vereist HTTPS (niet HTTP)
- iOS: Check Safari instellingen > Beweging
- Android: Meestal geen extra instellingen nodig
- Check browser console voor permission errors

## 📝 Toekomstige Features

- [ ] Authenticatie systeem (Supabase Auth)
- [ ] Speler statistieken dashboard
- [ ] Achievements systeem
- [ ] Multiplayer real-time games
- [ ] Spel geschiedenis
- [ ] Export statistieken
- [ ] Dark mode toggle

## 📄 Licentie

[Voeg licentie-informatie toe]

## 🤝 Contributing

[Voeg contributing guidelines toe als van toepassing]

---

**Gemaakt met ❤️ voor dart liefhebbers**
