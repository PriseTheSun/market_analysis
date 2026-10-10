import type { ReactElement } from "react";
import * as Primitive from "@radix-ui/react-tooltip";

export const TooltipProvider = Primitive.Provider;

export function Tooltip({
  label,
  children,
  side = "right",
}: {
  label: string;
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <Primitive.Root>
      <Primitive.Trigger asChild>{children}</Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Content
          className="menu-tooltip"
          side={side}
          sideOffset={10}
          collisionPadding={12}
          hideWhenDetached
        >
          {label}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
