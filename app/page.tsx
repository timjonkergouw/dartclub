import Image from "next/image";
import Link from "next/link";

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
      text: "Profielen",
      subtext: "beheer hier al je aangemaakte profielen",
      icon: "/profiles.png",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-4 pb-6 px-4 relative z-50">
      {/* Logo */}
      <div className="mb-6 flex justify-center relative z-50 animate-fade-in-down">
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
        {menuItems.map((item, index) => {
          const ButtonContent = (
            <>
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
            </>
          );

          // Link voor "Speel 501"
          if (item.text === "Speel 501") {
            return (
              <Link
                key={index}
                href="/speel-501"
                className="w-full bg-[#E8F0FF] text-[#000000] py-4 px-4 rounded-2xl shadow-md active:scale-95 transition-all duration-300 hover:shadow-lg hover:bg-[#D0E0FF] hover:scale-[1.02] touch-manipulation flex items-center gap-3 animate-fade-in-up"
                style={{
                  minHeight: "64px",
                  animationDelay: `${index * 0.1}s`,
                  opacity: 0,
                }}
              >
                {ButtonContent}
              </Link>
            );
          }

          // Link voor "Speel 501 Borrelmodus"
          if (item.text === "Speel 501 Borrelmodus") {
            return (
              <Link
                key={index}
                href="/speel501borrelmodus"
                className="w-full bg-[#E8F0FF] text-[#000000] py-4 px-4 rounded-2xl shadow-md active:scale-95 transition-all duration-300 hover:shadow-lg hover:bg-[#D0E0FF] hover:scale-[1.02] touch-manipulation flex items-center gap-3 animate-fade-in-up"
                style={{
                  minHeight: "64px",
                  animationDelay: `${index * 0.1}s`,
                  opacity: 0,
                }}
              >
                {ButtonContent}
              </Link>
            );
          }

          // Link voor "Statistieken"
          if (item.text === "Statistieken") {
            return (
              <Link
                key={index}
                href="/statistieken"
                className="w-full bg-[#E8F0FF] text-[#000000] py-4 px-4 rounded-2xl shadow-md active:scale-95 transition-all duration-300 hover:shadow-lg hover:bg-[#D0E0FF] hover:scale-[1.02] touch-manipulation flex items-center gap-3 animate-fade-in-up"
                style={{
                  minHeight: "64px",
                  animationDelay: `${index * 0.1}s`,
                  opacity: 0,
                }}
              >
                {ButtonContent}
              </Link>
            );
          }

          // Link voor "Profielen"
          if (item.text === "Profielen") {
            return (
              <Link
                key={index}
                href="/profielen"
                className="w-full bg-[#E8F0FF] text-[#000000] py-4 px-4 rounded-2xl shadow-md active:scale-95 transition-all duration-300 hover:shadow-lg hover:bg-[#D0E0FF] hover:scale-[1.02] touch-manipulation flex items-center gap-3 animate-fade-in-up"
                style={{
                  minHeight: "64px",
                  animationDelay: `${index * 0.1}s`,
                  opacity: 0,
                }}
              >
                {ButtonContent}
              </Link>
            );
          }

          // Normale button voor andere items
          return (
            <button
              key={index}
              className="w-full bg-[#E8F0FF] text-[#000000] py-4 px-4 rounded-2xl shadow-md active:scale-95 transition-all duration-300 hover:shadow-lg hover:bg-[#D0E0FF] hover:scale-[1.02] touch-manipulation flex items-center gap-3 animate-fade-in-up"
              style={{
                minHeight: "64px", // Grote touch targets voor mobile
                animationDelay: `${index * 0.1}s`,
                opacity: 0,
              }}
            >
              {ButtonContent}
            </button>
          );
        })}
      </div>
    </div>
  );
}
