import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useHoverHelpEnabled } from '../help/HoverHelpContext';

interface Props {
  tip: string;
  children: ReactNode;
  /** Optional wider max width for longer tips. */
  wide?: boolean;
}

/**
 * Newcomer hover/focus help. Silent when hover help is off.
 */
export function HelpTip({ tip, children, wide }: Props) {
  const enabled = useHoverHelpEnabled();
  const tipId = useId();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  if (!enabled) {
    return <>{children}</>;
  }

  const style: CSSProperties | undefined = wide
    ? { maxWidth: '18rem' }
    : undefined;

  return (
    <span
      ref={wrapRef}
      className="help-tip"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node)) {
          setOpen(false);
        }
      }}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          id={tipId}
          className="help-tip-bubble"
          style={style}
        >
          {tip}
        </span>
      )}
    </span>
  );
}
