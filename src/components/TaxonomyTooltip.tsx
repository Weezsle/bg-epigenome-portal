import { type FC, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getFullName } from '../utils/abbreviationLookup';

/**
 * Shared tooltip component for taxonomy abbreviations.
 *
 * Renders the popup via a portal into document.body so it is never clipped
 * by overflow:hidden, truncate, or CSS transforms on ancestor elements.
 *
 * Usage:
 *   <TaxonomyTooltip name="STR D2 MSN" type="subclass">STR D2 MSN</TaxonomyTooltip>
 *
 * You can also pass an explicit `text` prop to skip the LUT lookup.
 */

type TaxonomyTooltipProps = {
  name?: string;
  type?: 'neighborhood' | 'class' | 'subclass' | 'group';
  text?: string | null;
  children: React.ReactNode;
};

const TaxonomyTooltip: FC<TaxonomyTooltipProps> = ({ name, type, text, children }) => {
  const resolved = text !== undefined ? text : (name ? getFullName(name, type) : null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spanRef = useRef<HTMLSpanElement>(null);

  if (!resolved) return <>{children}</>;

  const show = () => {
    if (spanRef.current) {
      const rect = spanRef.current.getBoundingClientRect();
      setPos({ x: rect.left, y: rect.top });
    }
  };

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(show, 100);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPos(null);
  };

  // Dismiss on scroll so the tooltip doesn't float away from the text
  useEffect(() => {
    if (!pos) return;
    const dismiss = () => setPos(null);
    window.addEventListener('scroll', dismiss, true);
    return () => window.removeEventListener('scroll', dismiss, true);
  }, [pos]);

  const tooltip = pos && createPortal(
    <div
      className="pointer-events-none"
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y - 8,
        transform: 'translateY(-100%)',
        zIndex: 9999,
      }}
    >
      <div className="px-3 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg shadow-xl whitespace-pre-wrap max-w-[280px]">
        {resolved}
      </div>
      <div className="flex">
        <span className="border-4 border-transparent border-t-gray-900 ml-4" />
      </div>
    </div>,
    document.body
  );

  return (
    <span
      ref={spanRef}
      className="inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {tooltip}
    </span>
  );
};

export default TaxonomyTooltip;
