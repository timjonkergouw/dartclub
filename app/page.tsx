import Image from "next/image";
import HamburgerMenu from "./components/HamburgerMenu";

export default function Home() {
  const menuItems = [
    {
      text: "Speel 501",
      subtext: "Normaal 501 spelen",
      icon: "/dart board.png",
    },
    {
      text: "Speel 501 Borrelmodus",
      subtext: "Met vrienden en drankregels",
      icon: "/beer.png",
    },
    {
      text: "Statistieken",
      subtext: "Bekijk je dart statistieken",
      icon: "/stats.png",
    },
    {
      text: "Achievements",
      subtext: "Bekijk je Achievements en Badges",
      icon: "/achievements.png",
    },
    {
      text: "Uitslagen Profs",
      subtext: "Bekijk de uitslagen van de profs",
      icon: "/tv.png",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-4 pb-6 px-4 relative z-50">
      {/* Hamburger Menu */}
      <HamburgerMenu items={menuItems} />

      {/* Logo */}
      <div className="mb-6 flex justify-center relative z-50">
        <Image
          src="/logo wit dartclub.png"
          alt="DartClub Logo"
          width={140}
          height={140}
          priority
          className="object-contain"
        />
      </div>

      {/* Menu Buttons */}
      <div className="w-full max-w-md space-y-3 relative z-50">
        {menuItems.map((item, index) => (
          <button
            key={index}
            className="w-full bg-[#E8F0FF] text-[#000000] py-4 px-4 rounded-2xl shadow-md active:scale-95 transition-transform duration-150 hover:shadow-lg hover:bg-[#D0E0FF] touch-manipulation flex items-center gap-3"
            style={{
              minHeight: "64px", // Grote touch targets voor mobile
            }}
          >
            <Image
              src={item.icon}
              alt={item.text}
              width={44}
              height={44}
              className="shrink-0"
            />
            <div className="flex flex-col items-start justify-center gap-0.5">
              <span className="text-left font-semibold text-lg leading-tight">
                {item.text}
              </span>
              <span className="text-left text-xs leading-tight" style={{ color: "#7E838F" }}>
                {item.subtext}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
