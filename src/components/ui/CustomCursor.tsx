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

const SPARKLE_LIFETIME = 3000; // ms (longer lifetime for drifting background)
const SPARKLE_INTERVAL = 40; // ms between spawns (dense generation)
const MAX_SPARKLES = 120; // higher cap for rich ambient coverage

export default function CustomCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparklesRef = useRef<Sparkle[]>([]);
  const sparkleIdRef = useRef(0);
  const [isVisible, setIsVisible] = useState(true);
  const requestRef = useRef<number>(0);

  const spawnSparkle = useCallback(() => {
    const now = Date.now();
    // Spawn randomly anywhere on the screen
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    const size = 1.5 + Math.random() * 2.5;

    const sparkle: Sparkle = {
      id: sparkleIdRef.current++,
      x,
      y,
      size,
      opacity: 1,
      createdAt: now,
    };

    sparklesRef.current.push(sparkle);

    if (sparklesRef.current.length > MAX_SPARKLES) {
      sparklesRef.current = sparklesRef.current.slice(-MAX_SPARKLES);
    }
  }, []);

  useEffect(() => {
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

    // Periodically spawn ambient sparkles
    const intervalId = setInterval(() => {
      spawnSparkle();
    }, SPARKLE_INTERVAL);

    const update = () => {
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const now = Date.now();
        sparklesRef.current = sparklesRef.current.filter((s) => {
          const age = now - s.createdAt;
          if (age > SPARKLE_LIFETIME) return false;

          const progress = age / SPARKLE_LIFETIME;
          const opacity = 1 - progress;
          const scale = 1 - progress * 0.5;
          // Slow upward drift over the longer lifetime
          const driftY = -progress * 40;

          ctx.save();
          ctx.globalAlpha = opacity * 0.7; // subtle but clearly visible
          ctx.translate(s.x, s.y + driftY);

          // Draw a 4-pointed star sparkle (original star logic)
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

          ctx.fillStyle = "#00FF66"; // Vivid NEXUS Green
          ctx.shadowColor = "#00FF66";
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.restore();

          return true;
        });
      }

      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(requestRef.current);
    };
  }, [spawnSparkle]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-[9998] transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}
