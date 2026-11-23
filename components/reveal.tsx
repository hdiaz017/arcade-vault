"use client";

import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";

type RevealProps = {
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

// Renderiza el elemento con clase `reveal` y agrega `in` al entrar al viewport.
// La clase `in` solo se agrega desde useEffect para evitar diferencias de hydration.
export default function Reveal({ as: Tag = "section", className = "", style, children }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={("reveal " + className).trim()} style={style}>
      {children}
    </Tag>
  );
}
