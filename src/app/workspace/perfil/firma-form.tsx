"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "@/components/workspace/aviso";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subirFirma } from "./actions";

export function FirmaForm() {
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const res = await subirFirma(fd);
      if (!res.success) return void toast.error(res.error);
      toast.success("Firma actualizada");
      form.reset();
      setPreview(null);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="bg-muted/40 hover:border-violet-400 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-5 text-center transition">
        <Upload className="text-muted-foreground size-7" />
        <span className="text-muted-foreground text-xs">PNG con fondo transparente (máx. 2 MB)</span>
        <input
          type="file"
          name="firma"
          accept="image/png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {preview && <img src={preview} alt="Vista previa" className="max-h-20 rounded border bg-white" />}
      </label>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={!preview || pending}>
          {pending ? "Subiendo..." : "Guardar firma"}
        </Button>
      </div>
    </form>
  );
}
