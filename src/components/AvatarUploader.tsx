import { useCallback, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Camera, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const OUTPUT_SIZE = 512;

interface Props {
  userId: string;
  avatarUrl: string | null;
  initial: string;
  onUpdated: (newUrl: string) => void;
}

export function AvatarUploader({ userId, avatarUrl, initial, onUpdated }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Imagem muito grande. Máximo 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  }

  async function getCroppedBlob(): Promise<Blob | null> {
    if (!imageSrc || !croppedAreaPixels) return null;
    const img = await loadImage(imageSrc);
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(
      img,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE,
    );
    return await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9),
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const blob = await getCroppedBlob();
      if (!blob) {
        toast.error("Não foi possível processar a imagem.");
        return;
      }
      const path = `${userId}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) {
        toast.error("Falha no upload: " + upErr.message);
        return;
      }
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${pub.publicUrl}?v=${Date.now()}`;
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);
      if (dbErr) {
        toast.error("Falha ao salvar perfil: " + dbErr.message);
        return;
      }
      toast.success("Foto de perfil atualizada!");
      onUpdated(publicUrl);
      setImageSrc(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível remover: " + error.message);
      return;
    }
    toast.success("Foto removida.");
    onUpdated("");
  }

  return (
    <>
      <div className="relative h-16 w-16 shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            className="h-16 w-16 rounded-full object-cover ring-2 ring-border"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-mint text-xl font-bold text-night">
            {initial}
          </div>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Alterar foto"
          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-mint text-night shadow-md ring-2 ring-card hover:opacity-90"
        >
          <Camera className="h-3.5 w-3.5" />
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePick}
      />

      {avatarUrl && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={saving}
          className="text-xs text-muted-foreground underline hover:text-foreground disabled:opacity-50"
        >
          Remover foto
        </button>
      )}

      <Dialog open={!!imageSrc} onOpenChange={(o) => !o && setImageSrc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar foto</DialogTitle>
          </DialogHeader>
          <div className="relative h-72 w-full overflow-hidden rounded-lg bg-muted">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Zoom</div>
            <Slider
              min={1}
              max={3}
              step={0.05}
              value={[zoom]}
              onValueChange={(v) => setZoom(v[0])}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageSrc(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="hero" onClick={handleSave} disabled={saving}>
              <Upload className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar foto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}
