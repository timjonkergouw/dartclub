# DartClub

Een moderne, mobile-first dart app gebouwd met Next.js voor het spelen van 501 en het bijhouden van dart statistieken.

## Beschrijving

DartClub is een responsive web applicatie speciaal ontworpen voor smartphones. De app biedt verschillende functionaliteiten voor dartspelers, waaronder het spelen van 501 (normaal en borrelmodus), het bekijken van statistieken, achievements en professionele uitslagen.

## Technologieën

- **Next.js 15** - React framework met App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS 4** - Utility-first CSS framework
- **Gilroy Font** - Modern lettertype voor de interface

## Design

- **Achtergrondkleur**: #0A294F (donkerblauw)
- **Knoppenkleur**: #E8F0FF (lichtblauw)
- **Tekstkleur**: #000000 (zwart)
- **Subtekstkleur**: #7E838F (grijs)
- **Mobile-first** design met grote touch targets
- **Material Design** principes

## Functies

- 🎯 **Speel 501** - Normaal 501 spelen
- 🍺 **Speel 501 Borrelmodus** - Met vrienden en drankregels
- 📊 **Statistieken** - Bekijk je dart statistieken
- 🏆 **Achievements** - Bekijk je Achievements en Badges
- 📺 **Uitslagen Profs** - Bekijk de uitslagen van de profs

## Installatie

1. Clone de repository:
```bash
git clone <repository-url>
cd dartclub
```

2. Installeer dependencies:
```bash
npm install
```

3. Start de development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in je browser.

## Project Structuur

```
dartclub/
├── app/
│   ├── components/
│   │   ├── FontLoader.tsx      # Gilroy font loader
│   │   └── HamburgerMenu.tsx   # Side menu component
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home pagina
├── public/                     # Statische assets (logo's, iconen)
└── package.json
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build voor productie
- `npm start` - Start productie server
- `npm run lint` - Run ESLint

## Licentie

[Voeg licentie-informatie toe]
