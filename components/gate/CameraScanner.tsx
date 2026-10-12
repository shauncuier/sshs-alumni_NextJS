"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, RefreshCw } from "lucide-react";

type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (opts: { formats: string[] }) => Detector;

/**
 * Reads QR codes from the phone's back camera. Uses the browser's own
 * BarcodeDetector where there is one (Chrome on Android) and jsQR elsewhere
 * (Safari on iPhone). Calls onCode for each code it reads; the parent decides
 * what to do with repeats. The camera needs HTTPS (or localhost).
 */
export default function CameraScanner({ onCode, paused }: { onCode: (text: string) => void; paused: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pausedRef = useRef(paused);
  const onCodeRef = useRef(onCode);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  useEffect(() => {
    pausedRef.current = paused;
    onCodeRef.current = onCode;
  });

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRunning(false);
  };

  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    let timer: number | undefined;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw Object.assign(new Error("insecure"), { name: "InsecureContext" });
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 } }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        const Native = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
        let detector: Detector | null = null;
        if (Native) {
          try {
            detector = new Native({ formats: ["qr_code"] });
          } catch {
            detector = null;
          }
        }
        const jsQR = detector ? null : (await import("jsqr")).default;

        const tick = async () => {
          if (cancelled) return;
          if (!pausedRef.current && video.readyState >= 2 && video.videoWidth > 0) {
            let text: string | null = null;
            if (detector) {
              const codes = await detector.detect(video).catch(() => []);
              text = codes[0]?.rawValue ?? null;
            } else if (jsQR) {
              // Scan a downscaled frame: fast enough on older phones, still sharp enough for a ticket QR.
              const scale = Math.min(1, 640 / video.videoWidth);
              const w = Math.round(video.videoWidth * scale);
              const h = Math.round(video.videoHeight * scale);
              const canvas = (canvasRef.current ??= document.createElement("canvas"));
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
              ctx.drawImage(video, 0, 0, w, h);
              const result = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
              text = result?.data ?? null;
            }
            if (text) onCodeRef.current(text);
          }
          timer = window.setTimeout(() => void tick(), 180);
        };
        void tick();
      } catch (err) {
        const name = (err as Error).name;
        setError(
          name === "NotAllowedError"
            ? "Camera permission was refused. Allow the camera for this site in the browser settings, then try again."
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "No camera found on this device."
              : name === "InsecureContext"
                ? "The camera only works on the secure (https://) address of the site."
                : "The camera could not be started. Close other apps using it and try again."
        );
        stop();
      }
    })();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [running, facing]);

  return (
    <div className="space-y-2">
      <div className="relative aspect-square sm:aspect-video rounded-2xl bg-slate-950 overflow-hidden border-2 border-emerald-500/40">
        <video ref={videoRef} playsInline muted className={`w-full h-full object-cover ${running ? "" : "hidden"}`} />
        {running ? (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className={`w-2/3 max-w-[260px] aspect-square border-4 rounded-2xl ${paused ? "border-amber-300/90" : "border-emerald-400/90"}`} />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <Camera className="w-10 h-10 text-emerald-400" />
            <p className="text-xs text-slate-300">Scan tickets with the camera.</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setRunning(true);
              }}
              className="px-5 py-3 min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold cursor-pointer"
            >
              Start camera
            </button>
          </div>
        )}
      </div>
      {running && (
        <div className="flex gap-2">
          <button type="button" onClick={stop} className="flex-1 px-3 py-2.5 min-h-[44px] border border-slate-200 bg-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
            <CameraOff className="w-4 h-4" /> Stop camera
          </button>
          <button type="button" onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))} className="px-3 py-2.5 min-h-[44px] border border-slate-200 bg-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
            <RefreshCw className="w-4 h-4" /> Switch
          </button>
        </div>
      )}
      {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
    </div>
  );
}
