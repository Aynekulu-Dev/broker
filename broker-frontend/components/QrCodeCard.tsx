'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Card } from '@/components/ui';

export function QrCodeCard({
  url,
  label,
  filename,
}: {
  url: string;
  label: string;
  filename: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setReady(false);
    import('qrcode').then((QRCode) => {
      if (cancelled || !canvasRef.current) return;
      QRCode.toCanvas(
        canvasRef.current,
        url,
        {
          width: 220,
          margin: 1,
          color: { dark: '#1b2a4a', light: '#faf7ee' },
        },
        () => {
          if (!cancelled) setReady(true);
        },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return (
    <Card className="flex flex-col items-center gap-2.5">
      <div className="font-bold text-sm">{label}</div>
      <canvas ref={canvasRef} className="rounded-lg" />
      <div className="hint break-all text-center">{url}</div>
      <Button variant="outline" block onClick={download} disabled={!ready}>
        ⬇ QR ኮድ አውርድ
      </Button>
    </Card>
  );
}
