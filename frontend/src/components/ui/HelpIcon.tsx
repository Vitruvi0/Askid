"use client";

import { HelpCircle } from "lucide-react";
import Tooltip from "./Tooltip";

interface HelpIconProps {
  text: string;
  position?: "top" | "bottom" | "left" | "right";
}

export default function HelpIcon({ text, position = "top" }: HelpIconProps) {
  return (
    <Tooltip content={text} position={position}>
      <button
        type="button"
        className="inline-flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-full"
        aria-label="Aiuto"
        tabIndex={0}
      >
        <HelpCircle className="h-4 w-4" />
      </button>
    </Tooltip>
  );
}
