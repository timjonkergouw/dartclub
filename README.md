# DartClub 🎯

Een moderne, mobile-first dart app gebouwd met Next.js voor het spelen van 501 en het bijhouden van dart statistieken.

## 📱 Beschrijving

DartClub is een responsive web applicatie speciaal ontworpen voor smartphones. De app biedt verschillende functionaliteiten voor dartspelers, waaronder het spelen van 501 (normaal en borrelmodus), het beheren van spelersprofielen, het bekijken van statistieken, en professionele uitslagen.

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
  - Storage voor profielfoto's

### Design System
- **Gilroy Font** - Modern lettertype geladen via CDN
- **Custom Color Palette**:
  - Achtergrond: `#0A294F` (donkerblauw)
  - Knoppen: `#E8F0FF` (lichtblauw)
  - Accent: `#28C7D8` (turquoise)
  - Tekst: `#000000` (zwart)
  - Subtekst: `#7E838F` (grijs)

## 📋 Functies

### ✅ Geïmplementeerd

- 🎯 **Speel 501** - Volledig 501 spel met score tracking
  - 2-speler en multi-player modus
  - First to / Best of modus
  - Sets en Legs ondersteuning
  - Bust detection (score onder 0 of op 1)
  - Checkout suggesties
  - Dubbelpercentage tracking (optioneel)
  - Spel geschiedenis (undo functionaliteit)
  
- 👥 **Spelersbeheer** - Volledig profielbeheer systeem
  - Spelersprofielen aanmaken, bewerken en verwijderen
  - Profielfoto's uploaden en beheren
  - Avatar ondersteuning met fallback initialen
  - Supabase Storage integratie
  
- 🎲 **Startmethoden** - Verschillende manieren om te bepalen wie begint
  - Bullseye selectie
  - Radje draaien (wheel spin) met animatie
  - Munt opgooien (coin flip) met animatie
  - Device motion (schudden) ondersteuning
  
- 📊 **Statistieken** - Uitgebreide statistieken tracking
  - 3-dart gemiddelde
  - First 9 gemiddelde
  - Hoogste finishes (top 5)
  - Beste leg (minste aantal darts)
  - Totaal aantal 180's
  - Totaal aantal 140+, 100+, 80+ scores
  - Totaal aantal finishes boven de 100
  - Automatische opslag na elk spel
  
- 🎨 **UI/UX Features**
  - Responsive design (mobile-first)
  - Custom modals en popups
  - Smooth animaties
  - Huidige speler highlight
  - Starting player indicator
  - Game finished popup met statistieken

### 🚧 Toekomstige Features

- [ ] Authenticatie systeem (Supabase Auth)
- [ ] Achievements systeem
- [ ] Multiplayer real-time games
- [ ] Spel geschiedenis bekijken
- [ ] Export statistieken
- [ ] Dark mode toggle
- [ ] Borrelmodus met drankregels

## 🗄️ Supabase Database Setup

### Wat is Supabase?

Supabase is een open-source alternatief voor Firebase. Het biedt:
- **PostgreSQL Database**: Een krachtige relationele database
- **Real-time**: Automatische updates wanneer data verandert
- **Authentication**: Gebruikersbeheer (momenteel niet gebruikt)
- **Storage**: Bestandsopslag voor profielfoto's

### Database Schema

De app gebruikt momenteel drie tabellen:

#### `profiles` tabel
Slaat speler profielen op:
```sql
- id: integer (primary key, auto-increment)
- username: text (uniek, verplicht)
- avatar_url: text (optioneel, URL naar Supabase Storage)
- created_at: timestamp (automatisch)
```

#### `dart_stats` tabel
Slaat spelstatistieken op:
```sql
- id: integer (primary key, auto-increment)
- game_id: text (uniek per spel)
- player_id: integer (foreign key naar profiles)
- three_dart_avg: numeric (3-dart gemiddelde)
- first9_avg: numeric (first 9 gemiddelde)
- finish: integer (laatste finish score)
- highest_finish: integer (hoogste finish)
- doubles_hit: integer (aantal doubles geraakt)
- doubles_thrown: integer (aantal doubles gegooid)
- checkout_percentage: numeric (checkout percentage)
- double_percentage: numeric (double percentage)
- highest_score: integer (hoogste score)
- one_eighties: integer (aantal 180's)
- scores_140_plus: integer (aantal scores 140+)
- scores_100_plus: integer (aantal scores 100+)
- scores_80_plus: integer (aantal scores 80+)
- total_turns: integer (totaal aantal beurten)
- total_darts: integer (totaal aantal darts)
- leg_darts: jsonb (array van aantal darts per leg)
- best_leg: integer (beste leg - minste darts)
- worst_leg: integer (slechtste leg - meeste darts)
- legs_played: integer (aantal gespeelde legs)
- created_at: timestamp
```

#### `games` tabel
Slaat spel informatie op:
```sql
- id: text (primary key, UUID)
- created_at: timestamp (automatisch)
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
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maak games tabel
CREATE TABLE games (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maak dart_stats tabel
CREATE TABLE dart_stats (
  id SERIAL PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  -- Averages
  three_dart_avg NUMERIC,
  first9_avg NUMERIC,
  -- Finish statistics
  finish INTEGER,
  highest_finish INTEGER,
  -- Double statistics
  doubles_hit INTEGER,
  doubles_thrown INTEGER,
  checkout_percentage NUMERIC,
  double_percentage NUMERIC,
  -- Score statistics
  highest_score INTEGER,
  one_eighties INTEGER,
  scores_140_plus INTEGER,
  scores_100_plus INTEGER,
  scores_80_plus INTEGER,
  -- Turn and dart statistics
  total_turns INTEGER,
  total_darts INTEGER,
  -- Leg statistics
  leg_darts JSONB, -- Array van aantal darts per leg
  best_leg INTEGER,
  worst_leg INTEGER,
  legs_played INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maak indexen voor betere performance
CREATE INDEX idx_dart_stats_player_id ON dart_stats(player_id);
CREATE INDEX idx_dart_stats_game_id ON dart_stats(game_id);
```

4. **Stel Storage bucket in voor profielfoto's**:
   - Ga naar Storage in je Supabase dashboard
   - Maak een nieuwe bucket genaamd `avatars`
   - Stel de bucket in als public (of gebruik RLS policies)

5. **Stel Row Level Security (RLS) in**:
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

   - Voor de `games` tabel:

```sql
-- Allow public to insert games
CREATE POLICY "Allow public insert on games"
ON games FOR INSERT
TO public
WITH CHECK (true);

-- Allow public to delete games
CREATE POLICY "Allow public delete on games"
ON games FOR DELETE
TO public
USING (true);
```

   - Voor de `dart_stats` tabel:

```sql
-- Allow public to insert dart_stats
CREATE POLICY "Allow public insert on dart_stats"
ON dart_stats FOR INSERT
TO public
WITH CHECK (true);

-- Allow public to read dart_stats
CREATE POLICY "Allow public read on dart_stats"
ON dart_stats FOR SELECT
TO public
USING (true);
```

6. **Haal je API keys op**:
   - Ga naar Project Settings > API
   - Kopieer de "Project URL" (dit is je `NEXT_PUBLIC_SUPABASE_URL`)
   - Kopieer de "anon public" key (dit is je `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

7. **Maak een `.env.local` bestand** in de root van je project:

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
│   │   └── FontLoader.tsx       # Laadt Gilroy font van CDN
│   ├── play501game/              # 501 spel pagina
│   │   └── page.tsx             # Hoofdspel logica en UI
│   ├── speel-501/                # Spel setup pagina
│   │   └── page.tsx             # Speler selectie en instellingen
│   ├── profielen/                # Profielbeheer pagina
│   │   └── page.tsx             # Spelersprofielen beheren
│   ├── statistieken/             # Statistieken pagina
│   │   └── page.tsx             # Speler statistieken bekijken
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
- `useRef` voor persistente waarden zonder re-renders

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
- `requestAnimationFrame` voor soepele animaties
- Crypto.getRandomValues voor veilige random generatie
- Exacte eindpositie berekening (0/180 voor coin, player index voor wheel)

#### Score Tracking
- Real-time score berekening
- Bust detection (score onder 0, op 1, of niet uit te gooien)
- Checkout suggestions
- Double percentage tracking
- Spel geschiedenis voor undo functionaliteit

#### Profielbeheer
- Supabase Storage voor profielfoto's
- Avatar upload en verwijdering
- Fallback naar initialen als geen foto

## 🔒 Beveiliging

- **Row Level Security (RLS)**: Supabase policies bepalen wie data kan lezen/schrijven
- **Environment Variables**: API keys worden niet in code opgeslagen
- **HTTPS Only**: Device motion API vereist beveiligde verbinding
- **Input Validation**: Client-side validatie voor gebruikersinput
- **Cascade Deletes**: Database constraints zorgen voor data integriteit

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

### Profielfoto's niet zichtbaar
- Controleer of Storage bucket `avatars` bestaat
- Verifieer dat bucket public is of RLS policies correct zijn
- Check of avatar_url correct wordt opgeslagen in database

## 📝 Code Kwaliteit

- TypeScript voor type safety
- ESLint voor code kwaliteit
- Geen onnodige console.log statements (alleen error logging)
- Geen commented out code
- Clean code principes

## 📄 Licentie

[Voeg licentie-informatie toe]

## 🤝 Contributing

[Voeg contributing guidelines toe als van toepassing]

---

**Gemaakt met ❤️ voor dart liefhebbers**
