import { Fragment } from "react";
import "./blur-reveal.css";

export function BlurReveal({
  text,
  className,
  delay = 100,
  stagger = 90,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  return (
    <p key={text} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text
          .trim()
          .split(/\s+/)
          .map((word, index) => (
            <Fragment key={index}>
              {index > 0 && " "}
              <span
                className="blur-reveal-word"
                style={{ animationDelay: `${delay + index * stagger}ms` }}
              >
                {word}
              </span>
            </Fragment>
          ))}
      </span>
    </p>
  );
}
