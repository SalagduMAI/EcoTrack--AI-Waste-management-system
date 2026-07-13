import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRImageProps {
  text: string;
  className?: string;
}

export const QRImage = ({ text, className = "w-16 h-16" }: QRImageProps) => {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    QRCode.toDataURL(text, {
      margin: 1,
      width: 256,
      color: {
        dark: '#1E562F', // Brand dark green
        light: '#FFFFFF' // White background
      }
    })
      .then(url => setQrUrl(url))
      .catch(err => console.error('Failed to generate real QR Code:', err));
  }, [text]);

  if (!qrUrl) {
    return <div className={`${className} bg-slate-100 animate-pulse rounded-xl`} />;
  }

  return (
    <img src={qrUrl} alt="QR Code" className={`${className} object-contain`} />
  );
};
