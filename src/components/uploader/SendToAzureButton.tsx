"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { buildOcrItems } from "@/lib/ocr-utils";

export default function SendToAzureButton() {
  const hasImage = useAppStore((s) => !!s.file);
  const setOcrItems = useAppStore((s) => s.setOcrItems);
  const setError = useAppStore((s) => s.setError);
  const setLoading = useAppStore((s) => s.setLoading);
  const setBarcodeState = useAppStore((s) => s.setBarcodeState);
  const incCounter = useAppStore((s) => s.incCounter);
  const clearOcr = useAppStore((s) => s.clearOcr);
  const clearBarcode = useAppStore((s) => s.clearBarcode);
  const clearValidation = useAppStore((s) => s.clearValidation);
  const setProcessedImageUrl = useAppStore((s) => s.setProcessedImageUrl);
  const setBarcodeOverlayImgUrl = useAppStore((s) => s.setBarcodeOverlayImgUrl);
  const setBarcodeRoiImgUrl = useAppStore((s) => s.setBarcodeRoiImgUrl);
  const setValidation = useAppStore((s) => s.setValidation);

  const [clicking, setClicking] = useState(false);

  const handleClick = async () => {
    if (!hasImage || clicking) return;

    const file = useAppStore.getState().file;
    if (!file) return;

    setClicking(true);
    clearOcr();
    clearBarcode();
    clearValidation();
    setLoading(true);

    try {
      const form = new FormData();
      form.append("file", file);
      // Include expected values from the store as JSON
      const expected = useAppStore.getState().expected ?? {};
      try {
        form.append("expected", JSON.stringify(expected));
      } catch {
        // Ignore serialization issues; backend will treat as absent
      }

      const res = await fetch("/api/azure-analyze", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const { error } = await res
          .json()
          .catch(() => ({ error: "Processing error" }));
        setError(typeof error === "string" ? error : "Processing error");
        return;
      }

      const data = await res.json();
      const {
        imageUrl,
        barcodeOverlayImageUrl,
        barcodeRoiImageUrl,
        ocrResult,
        barcodeData,
      } = data;

      setProcessedImageUrl(imageUrl);
      setBarcodeOverlayImgUrl(barcodeOverlayImageUrl);
      setBarcodeRoiImgUrl(barcodeRoiImageUrl);

      // Líneas de OCR (adapta a tu schema)
      const lines: string[] =
        ocrResult?.readResult?.blocks
          ?.flatMap(
            (b: any) => b?.lines?.map((l: any) => l?.text).filter(Boolean) ?? []
          )
          ?.filter(Boolean) ?? [];

      setOcrItems(buildOcrItems(lines.length ? lines : ["(No text detected)"]));
      setBarcodeState(barcodeData);
      setValidation(data.validationData);
      incCounter("inspected");
    } catch (e: any) {
      setError(e?.message || "Unexpected error");
    } finally {
      setLoading(false);
      setClicking(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={!hasImage || clicking}
      className="w-full"
    >
      {clicking ? "Analizando..." : "Procesar"}
    </Button>
  );
}
