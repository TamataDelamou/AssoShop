"use client";

import { QRCodeSVG } from "qrcode.react";

interface Props {
  value: string;
  size?: number;
  className?: string;
}

export function QrCode({ value, size = 160, className }: Props) {
  return (
    <div
      className={className}
      role="img"
      aria-label="QR Code"
    >
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        marginSize={2}
        className="h-full w-full"
      />
    </div>
  );
}
