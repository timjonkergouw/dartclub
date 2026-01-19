# DartClub

Een moderne, mobile-first dart app gebouwd met Next.js voor het spelen van 501 en het bijhouden van dart statistieken. Perfect voor dartliefhebbers die hun scores willen bijhouden en de gezelligheid van het dartspelen willen verhogen.

## Features

### Spel Functionaliteiten
- **501 Spel** - Volledig 501 spel met score tracking
  - 2-speler en multi-player modus
  - First to / Best of modus
  - Sets en Legs ondersteuning
  - Bust detection (score onder 0 of op 1)
  - Checkout suggesties
  - Dubbelpercentage tracking (optioneel)
  - Spel geschiedenis (undo functionaliteit)
  - Borrelmodus variant

- **Startmethoden** - Verschillende manieren om te bepalen wie begint
  - Bullseye selectie
  - Radje draaien (wheel spin) met animatie
  - Munt opgooien (coin flip) met animatie
  - Device motion (schudden) ondersteuning

### Speler Management
- **Spelersbeheer** - Volledig profielbeheer systeem
  - Spelersprofielen aanmaken, bewerken en verwijderen
  - Profielfoto's uploaden en beheren
  - Avatar ondersteuning met fallback initialen
  - Supabase Storage integratie

### Statistieken
- **Uitgebreide statistieken tracking**
  - 3-dart gemiddelde
  - First 9 gemiddelde
  - Hoogste finishes (top 5)
  - Beste leg (minste aantal darts)
  - Totaal aantal 180's
  - Totaal aantal 140+, 100+, 80+ scores
  - Totaal aantal finishes boven de 100
  - Automatische opslag na elk spel

### UI/UX
- **Responsive design** (mobile-first)
  - Custom modals en popups
  - Smooth animaties
  - Huidige speler highlight
  - Starting player indicator
  - Game finished popup met statistieken

## Tech Stack

### Frontend
- **Next.js 15** - React framework met App Router
- **React 19** - UI library voor interactieve componenten
- **TypeScript 5** - Type-safe JavaScript
- **Tailwind CSS 4** - Utility-first CSS framework

### Backend & Database
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database voor data opslag
  - Row Level Security (RLS) voor data beveiliging
  - Storage voor profielfoto's

### Design
- **Gilroy Font** - Modern lettertype geladen via CDN
- Custom color palette met donkerblauw, lichtblauw en turquoise accenten

## Installatie

### Vereisten
- Node.js 18+
- npm of yarn package manager
- Een Supabase account

### Stappen

1. Clone de repository en navigeer naar de project folder
2. Installeer dependencies met `npm install`
3. Maak een `.env.local` bestand met je Supabase credentials (zie Omgevingsvariabelen)
4. Start de development server met `npm run dev`
5. Open de app in je browser op [http://localhost:3000](http://localhost:3000)

### Scripts
- `npm run dev` - Start development server met hot reload
- `npm run build` - Build voor productie
- `npm start` - Start productie server (na build)
- `npm run lint` - Run ESLint voor code kwaliteit checks

## Omgevingsvariabelen

Maak een `.env.local` bestand in de root van je project met de volgende variabelen:

- `NEXT_PUBLIC_SUPABASE_URL` - Je Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Je Supabase anon public key

**Belangrijk**: Voeg `.env.local` toe aan je `.gitignore` om te voorkomen dat je keys in git komen!

### Supabase Setup

1. Maak een Supabase account op [supabase.com](https://supabase.com)
2. Maak een nieuw project
3. Maak de database tabellen `profiles`, `games`, en `dart_stats` aan via de SQL Editor
4. Stel Storage bucket `avatars` in voor profielfoto's
5. Stel Row Level Security (RLS) policies in:
   - `profiles`: SELECT, INSERT, UPDATE, DELETE voor public
   - `games`: INSERT, DELETE voor public
   - `dart_stats`: INSERT, SELECT voor public
6. Haal je API keys op via Project Settings > API

## Gebruik

1. **Spelers toevoegen**: Ga naar de profielen pagina om spelers toe te voegen of te bewerken
2. **Spel starten**: Ga naar "Speel 501" en selecteer je spelers en instellingen
3. **Scores invoeren**: Voer je scores in tijdens het spel
4. **Statistieken bekijken**: Bekijk je statistieken op de statistieken pagina na het spelen

De app slaat automatisch alle speldata op in Supabase na elk voltooid spel.

## Database / Structuur

### Database Tabellen

De app gebruikt drie hoofdtabellen:

- **`profiles`** - Speler profielen met username, avatar_url en timestamps
- **`games`** - Game records met UUID en timestamps
- **`dart_stats`** - Spelstatistieken per speler per game met uitgebreide metrics

### Project Structuur

- `app/` - Next.js App Router pagina's en componenten
- `lib/` - Utility functies (dartlogic, checkout, supabase client)
- `public/` - Statische bestanden (iconen, afbeeldingen, sounds)

### Data Flow

1. Speler setup: Data wordt opgehaald uit Supabase `profiles` tabel
2. Spel logica: Scores worden berekend via `lib/dartlogic.ts`, checkout mogelijkheden via `lib/checkout.ts`
3. Database opslag: Na spel einde worden stats automatisch opgeslagen in `dart_stats` tabel

## Pagina Overzicht

### Home Pagina (`app/page.tsx`)
**Wat je er kan doen:**
- Navigeer naar verschillende secties van de app (Speel 501, Borrelmodus, Statistieken, Profielen)
- Start een nieuw spel of bekijk je statistieken

**Wat de code doet:**
- Simpele navigatie pagina met menu items
- Gebruikt Next.js Link componenten voor client-side routing
- Animaties met CSS keyframes voor fade-in effecten
- Elke menu item heeft een icon, titel en subtekst

### Speel 501 Setup (`app/speel-501/page.tsx`)
**Wat je er kan doen:**
- Selecteer of maak spelers aan voor een game
- Kies spelinstellingen: start score (301/501/701), first-to/best-of, sets/legs, aantal
- Start een normaal 501 spel

**Wat de code doet:**
- Haalt alle profielen op uit Supabase `profiles` tabel
- Beheert geselecteerde spelers in state
- Modal systeem voor speler selectie/aanmaak
- URL parameters worden doorgegeven naar het spel voor configuratie
- Valideert dat minimaal 2 spelers zijn geselecteerd voordat spel kan starten

### Speel 501 Borrelmodus Setup (`app/speel501borrelmodus/page.tsx`)
**Wat je er kan doen:**
- Alles van normale setup PLUS borrelinstellingen
- Stel per speler difficulty level in (easy/medium/hard/extreme)
- Stel slokken multiplier in (vermenigvuldigt alle drinkregels)

**Wat de code doet:**
- Zelfde functionaliteit als normale setup
- Extra state management voor `playerDifficulties` (Map van speler ID naar difficulty)
- `sipMultiplier` state voor het vermenigvuldigen van slokken
- Alle instellingen worden doorgegeven via URL parameters naar borrelgame pagina

### Play 501 Game (`app/play501game/page.tsx`)
**Wat je er kan doen:**
- Speel een volledig 501 spel
- Voer scores in per beurt
- Kies startmethode (bullseye, wheel, coin flip, shake)
- Bekijk checkout suggesties
- Undo laatste beurt
- Zie real-time statistieken tijdens het spel

**Wat de code doet:**
- Complexe state management met `gameStates` array voor elke speler
- `playerStats` Map voor het bijhouden van statistieken per speler
- `gameHistory` array voor undo functionaliteit
- Score validatie: checkt op bust (score < 0 of = 1), ongeldige scores (> 180)
- Checkout logica: gebruikt `calculateCheckoutInfo` om te bepalen of finish mogelijk is
- Double tracking: optioneel systeem om aantal pijlen op dubbel bij te houden
- Leg/set management: houdt bij wie welke legs/sets heeft gewonnen
- `finishGame` functie: slaat automatisch alle data op in Supabase na spel einde
- Start methoden: implementeert verschillende animaties (wheel spin, coin flip) met CSS transforms

### Play 501 Borrelgame (`app/play501borrelgame/page.tsx`)
**Wat je er kan doen:**
- Alles van normale game PLUS borrelregels
- Zie drink popups wanneer regels worden getriggerd
- Pas difficulty per speler aan tijdens setup

**Wat de code doet:**
- Zelfde functionaliteit als normale game
- Extra drink popup systeem met `showDrinkPopup` en `drinkPopupInfo` state
- Drink regel logica in `handleSubmit`:
  - 180: alle andere spelers drinken
  - 26 (Bed & Breakfast): speler zelf drinkt
  - Lage score (< threshold): speler drinkt
  - Hoge score (> threshold): speler drinkt
- Thresholds zijn afhankelijk van difficulty level per speler
- `sipMultiplier` wordt toegepast op alle slokken

### Profielen (`app/profielen/page.tsx`)
**Wat je er kan doen:**
- Bekijk alle aangemaakte profielen
- Maak nieuwe profielen aan
- Bewerk bestaande profielen (naam en profielfoto)
- Verwijder profielen (verwijdert ook alle bijbehorende games en statistieken)

**Wat de code doet:**
- CRUD operaties op Supabase `profiles` tabel
- Supabase Storage integratie voor profielfoto's:
  - Upload naar `profiles` bucket
  - Verwijder oude foto bij update
  - FileReader API voor preview van nieuwe foto's
- Cascade delete logica: verwijdert eerst alle `dart_stats`, dan `games`, dan `profiles`
- Error handling voor verschillende Supabase error codes
- Modal systeem voor add/edit met form validatie

### Statistieken (`app/statistieken/page.tsx`)
**Wat je er kan doen:**
- Selecteer een profiel om statistieken te bekijken
- Zie geaggregeerde statistieken over alle spellen heen:
  - 3-dart gemiddelde (gewogen over alle spellen)
  - First 9 gemiddelde
  - Top 5 hoogste finishes
  - Beste leg (minste darts)
  - Totaal aantal 180's, 140+, 100+, 80+ scores
  - Totaal aantal finishes boven 100

**Wat de code doet:**
- Haalt alle `dart_stats` op voor geselecteerde speler
- Aggregeert statistieken over meerdere spellen:
  - Gewogen gemiddelden voor 3-dart en first9 (gebaseerd op aantal turns)
  - Top 5 finishes: verzamelt alle finishes, sorteert op hoogte
  - Beste leg: minimum van alle `best_leg` waarden
  - Totaaltellingen: som van alle relevante statistieken
- Formateert getallen met 2 decimalen voor gemiddelden
- Toont "-" voor ontbrekende data

## Complexe Code Uitleg

### finishGame Functie
De `finishGame` functie is verantwoordelijk voor het opslaan van alle speldata na een voltooid spel. Dit is een complexe async functie met meerdere stappen:

**Race Condition Prevention:**
- Gebruikt `finishGameLockRef` en `finishGameRef` om dubbele aanroepen te voorkomen
- Lock mechanisme voorkomt dat de functie meerdere keren tegelijk wordt uitgevoerd

**Database Transactie Flow:**
1. Maakt eerst een `games` record aan en krijgt een UUID terug
2. Voor elke speler:
   - Berekent finale statistieken via `calculateFinalStats`
   - Filtert null/undefined/NaN waarden met `cleanValue` helper
   - Checkt of er al een record bestaat (voorkomt duplicaten)
   - Slaat op in `dart_stats` tabel
3. Gebruikt `Promise.all` om alle spelers parallel op te slaan

**Waarom complex:**
- Moet omgaan met async operaties en error handling
- Voorkomt data corruptie door duplicaten
- Cleaned data voor database compatibiliteit

### Checkout Calculator (`lib/checkout.ts`)
De checkout calculator bepaalt of een score een mogelijke finish is en hoeveel pijlen op dubbel nodig zijn.

**Algoritme:**
1. Valideert score (moet tussen 2-170 zijn, even getal)
2. Genereert alle mogelijke dart scores (1-20 single/double/triple, 25 bull, 50 bullseye)
3. Test alle combinaties:
   - 1 dart finish: alleen dubbel mogelijk (score <= 40)
   - 2 dart finishes: test alle combinaties van 2 pijlen
   - 3 dart finishes: test alle combinaties van 3 pijlen
4. Telt hoeveel pijlen op dubbel nodig zijn per combinatie

**Waarom complex:**
- Brute force algoritme test alle mogelijke combinaties
- Moet rekening houden met verschillende dart scores (single/double/triple/bull)
- Berekent minimaal en maximaal aantal pijlen op dubbel

### State Management in Game Pages
De game pagina's gebruiken complexe state management met meerdere gerelateerde states:

**Game States:**
- `gameStates`: Array van `PlayerGameState` - elke speler heeft eigen score, turns, legs/sets gewonnen
- `playerStats`: Map van speler ID naar `DartStats` - bijhoudt statistieken per speler
- `gameHistory`: Array van snapshots voor undo functionaliteit

**Waarom complex:**
- States zijn onderling afhankelijk: score update triggert statistiek update
- Undo functionaliteit vereist complete state snapshots
- Leg/set management moet bijhouden wie begint en wie wint

### Borrelregel Logica
De borrelregel logica in `handleSubmit` bepaalt wanneer drink popups moeten verschijnen:

**Regel Prioriteit:**
1. Eerst check op 180 (hoogste prioriteit)
2. Dan check op 26 (Bed & Breakfast)
3. Dan check op hoge score (boven threshold)
4. Als laatste check op lage score (onder threshold)

**Threshold Berekening:**
- Elke speler heeft eigen difficulty level (easy/medium/hard/extreme)
- Thresholds worden opgehaald uit `lowThresholds` en `highThresholds` objects
- `sipMultiplier` wordt toegepast op alle slokken

**Waarom complex:**
- Meerdere condities die elkaar kunnen uitsluiten
- Per-speler difficulty maakt het dynamisch
- Moet rekening houden met `shouldShowPopups` flag

### Statistieken Aggregatie
De statistieken pagina aggregeert data over meerdere spellen:

**Gewogen Gemiddelden:**
- 3-dart gemiddelde: som van (gemiddelde × turns) / totaal turns
- First 9 gemiddelde: schat first 9 turns (meestal eerste 3 turns)

**Top 5 Finishes:**
- Verzamelt alle finishes in een Map met counts
- Sorteert op hoogte en neemt top 5
- Toont duplicaten als een finish meerdere keren is uitgegooid

**Waarom complex:**
- Moet data aggregeren over meerdere records
- Gewogen gemiddelden zijn accurater dan simpele gemiddelden
- Top 5 logica moet omgaan met duplicaten

### Supabase Storage Integratie
De profielen pagina integreert Supabase Storage voor profielfoto's:

**Upload Flow:**
1. Gebruiker selecteert bestand
2. Valideert file type (alleen images) en size (max 5MB)
3. Genereert unieke filename met timestamp en random string
4. Upload naar `profiles` bucket in Supabase Storage
5. Haalt public URL op
6. Slaat URL op in database

**Delete Flow:**
1. Haalt oude avatar URL uit database
2. Extraheert file path uit URL
3. Verwijdert file uit Storage bucket
4. Zet `avatar_url` op null in database

**Waarom complex:**
- Moet omgaan met async file operations
- Error handling voor upload/delete failures
- Path extractie uit URLs kan tricky zijn

## AI-gebruik

Deze app is ontwikkeld met behulp van AI-assistentie voor:
- Code generatie en optimalisatie
- TypeScript type definitions
- UI/UX implementatie
- Database schema design
- Documentatie

## Bekende Issues / Beperkingen

- Device motion (schudden) vereist HTTPS en werkt mogelijk niet op alle devices
- iOS devices vereisen expliciete toestemming voor device motion
- Profielfoto's vereisen correct geconfigureerde Supabase Storage bucket
- Geen real-time multiplayer functionaliteit (alleen lokale games)
- Geen authenticatie systeem (alle data is publiek toegankelijk)
- Geen export functionaliteit voor statistieken

## Toekomstige Verbeteringen

### Gezelligheid & Sociale Features
- **Achievements systeem** - Unlock achievements voor verschillende prestaties (eerste 180, perfect leg, etc.)
- **Spel geschiedenis** - Bekijk vorige spellen en herbeleef de beste momenten
- **Leaderboards** - Ranglijsten per statistiek om competitie te stimuleren
- **Borrelmodus uitbreiding** - Meer drankregels en custom regels toevoegen voor extra gezelligheid
- **Team modus** - Speel in teams en werk samen aan teamstatistieken
- **Social sharing** - Deel je beste scores en prestaties
- **Commentaar systeem** - Voeg grappige opmerkingen toe aan spellen voor later terugkijken
- **Thema's & Customisatie** - Verschillende thema's en personalisatie opties voor een persoonlijkere ervaring
- **Geluidseffecten** - Meer geluidseffecten voor verschillende acties (180, checkout, etc.)
- **Animaties** - Meer feestelijke animaties bij belangrijke momenten

### Technische Verbeteringen
- Authenticatie systeem (Supabase Auth) voor persoonlijke accounts
- Multiplayer real-time games
- Export statistieken (CSV, PDF)
- Dark mode toggle
- Offline functionaliteit met service workers
- Push notifications voor belangrijke updates

---


