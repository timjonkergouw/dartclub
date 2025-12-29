"use client";

import { useEffect } from "react";

export default function FontLoader() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.cdnfonts.com/css/gilroy";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  return null;
}

