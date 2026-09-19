import {useId, type ReactNode} from "react";

export function Tooltip({children, content}: {children: ReactNode; content: string}) {
  const id = useId();
  return (
    <span className="tooltip">
      <span>{children}</span>
      <button type="button" className="tooltip-trigger" aria-label={content} aria-describedby={id}>?</button>
      <span className="tooltip-content" role="tooltip" id={id}>{content}</span>
    </span>
  );
}
