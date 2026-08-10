"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  createdAt: number;
}

const SPARKLE_LIFETIME = 600; // ms
const SPARKLE_INTERVAL = 40; // ms between sparkles
const MAX_SPARKLES = 25;

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const ringPos = useRef({ x: 0, y: 0 });
  const mousePos = useRef({ x: 0, y: 0 });
  const lastSparkleTime = useRef(0);
  const sparklesRef = useRef<Sparkle[]>([]);
  const sparkleIdRef = useRef(0);

  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const requestRef = useRef<number>(0);

  const spawnSparkle = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastSparkleTime.current < SPARKLE_INTERVAL) return;
    lastSparkleTime.current = now;

    // Random offset so sparkles scatter slightly around cursor
    const offsetX = (Math.random() - 0.5) * 24;
    const offsetY = (Math.random() - 0.5) * 24;
    const size = 1.5 + Math.random() * 2.5;

    const sparkle: Sparkle = {
      id: sparkleIdRef.current++,
      x: x + offsetX,
      y: y + offsetY,
      size,
      opacity: 1,
      createdAt: now,
    };

    sparklesRef.current.push(sparkle);

    // Limit total sparkles
    if (sparklesRef.current.length > MAX_SPARKLES) {
      sparklesRef.current = sparklesRef.current.slice(-MAX_SPARKLES);
    }
  }, []);

  useEffect(() => {
    const mediaQueryHover = window.matchMedia("(hover: hover) and (pointer: fine)");
    const mediaQueryMotion = window.matchMedia("(prefers-reduced-motion: no-preference)");

    if (!mediaQueryHover.matches || !mediaQueryMotion.matches) {
      return;
    }

    // Size canvas to viewport
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    const resizeCanvas = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const onMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };

      if (!isVisible) {
        setIsVisible(true);
        ringPos.current = { x: e.clientX, y: e.clientY };
      }

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }

      // Spawn sparkle on move
      spawnSparkle(e.clientX, e.clientY);
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName.toLowerCase() === "button" ||
        target.tagName.toLowerCase() === "a" ||
        target.tagName.toLowerCase() === "input" ||
        target.closest("button") ||
        target.closest("a") ||
        target.closest("input")
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    const onMouseLeave = () => {
      setIsVisible(false);
    };

    const onMouseEnter = () => {
      setIsVisible(true);
    };

    const update = () => {
      // Interpolate ring position
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.15;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.15;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0) translate(-50%, -50%) scale(${isHovering ? 1.5 : 1})`;
      }

      // Draw sparkles on canvas
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const now = Date.now();
        sparklesRef.current = sparklesRef.current.filter((s) => {
          const age = now - s.createdAt;
          if (age > SPARKLE_LIFETIME) return false;

          const progress = age / SPARKLE_LIFETIME;
          const opacity = 1 - progress;
          const scale = 1 - progress * 0.5;
          // Slight upward drift
          const driftY = -progress * 12;

          ctx.save();
          ctx.globalAlpha = opacity * 0.8;
          ctx.translate(s.x, s.y + driftY);

          // Draw a 4-pointed star sparkle
          const r = s.size * scale;
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;
            const outerX = Math.cos(angle) * r;
            const outerY = Math.sin(angle) * r;
            const innerAngle = angle + Math.PI / 4;
            const innerR = r * 0.35;
            const innerX = Math.cos(innerAngle) * innerR;
            const innerY = Math.sin(innerAngle) * innerR;

            if (i === 0) {
              ctx.moveTo(outerX, outerY);
            } else {
              ctx.lineTo(outerX, outerY);
            }
            ctx.lineTo(innerX, innerY);
          }
          ctx.closePath();

          ctx.fillStyle = "#22A447";
          ctx.shadowColor = "#22A447";
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.restore();

          return true;
        });
      }

      requestRef.current = requestAnimationFrame(update);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseover", onMouseOver);
    window.addEventListener("mouseout", onMouseOver);
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);

    requestRef.current = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseover", onMouseOver);
      window.removeEventListener("mouseout", onMouseOver);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(requestRef.current);
    };
  }, [isHovering, isVisible, spawnSparkle]);

  return (
    <>
      {/* Sparkle canvas */}
      <canvas
        ref={canvasRef}
        className={`fixed inset-0 pointer-events-none z-[9998] transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      />
      {/* Ring */}
      <div
        ref={ringRef}
        className={`fixed top-0 left-0 w-8 h-8 border-2 border-[#22A447] rounded-full pointer-events-none z-[9999] transition-opacity duration-300 ${isVisible ? 'opacity-50' : 'opacity-0'}`}
        style={{
          transform: "translate(-50%, -50%)",
          transitionProperty: "opacity, transform, background-color, border-color",
          transitionDuration: "0.3s, 0.1s, 0.3s, 0.3s",
          willChange: "transform",
        }}
      />
      {/* Dot */}
      <div
        ref={dotRef}
        className={`fixed top-0 left-0 w-2 h-2 bg-[#22A447] rounded-full pointer-events-none z-[10000] shadow-[0_0_8px_#22A447] transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{
          transform: "translate(-50%, -50%)",
          marginLeft: "-4px",
          marginTop: "-4px",
          willChange: "transform",
        }}
      />
    </>
  );
}
