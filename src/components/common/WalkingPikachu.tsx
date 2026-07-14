import { useEffect, useRef } from 'react';
import styles from './WalkingPikachu.module.css';

const PIKACHU_GIF =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/25.gif';
const SPEED = 1.5;
const SIZE = 64;

export function WalkingPikachu() {
  const imgRef = useRef<HTMLImageElement>(null);
  const posRef = useRef(0);
  const dirRef = useRef<1 | -1>(1);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const animate = () => {
      const el = imgRef.current;
      if (!el) return;

      const leftMin = window.innerWidth >= 768 ? 220 : 0;
      const leftMax = window.innerWidth - SIZE;

      posRef.current += SPEED * dirRef.current;

      if (posRef.current >= leftMax) {
        posRef.current = leftMax;
        dirRef.current = -1;
      } else if (posRef.current <= leftMin) {
        posRef.current = leftMin;
        dirRef.current = 1;
      }

      el.style.left = `${posRef.current}px`;
      el.style.transform = dirRef.current === -1 ? 'scaleX(-1)' : 'scaleX(1)';

      rafRef.current = requestAnimationFrame(animate);
    };

    const leftMin = window.innerWidth >= 768 ? 220 : 0;
    posRef.current = leftMin;
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <img
      ref={imgRef}
      src={PIKACHU_GIF}
      alt=""
      aria-hidden="true"
      className={styles.walkingPikachu}
    />
  );
}
