import { useMutation } from "convex/react";
import { Camera, Link2, Type, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { errorText } from "../../access";
import { useTrack } from "../../analytics";
import { copy } from "../../copy/en";

const ACCEPT = ".pdf,.docx,image/jpeg,image/png,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type AddKind = "upload" | "snap" | "paste" | "link";
export type Sources = ReturnType<typeof useSources>;

/**
 * Adding sources to one notebook. One hidden file input and one camera input
 * serve every Add button on the page (render `inputs` once), and files can be
 * dropped anywhere on the notebook.
 */
export function useSources(notebookId: Id<"notebooks">) {
  const generateUploadUrl = useMutation(api.notebooks.sources.generateUploadUrl);
  const addFile = useMutation(api.notebooks.sources.addFile);
  const addTextM = useMutation(api.notebooks.sources.addText);
  const addLinkM = useMutation(api.notebooks.sources.addLink);
  const track = useTrack();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<"paste" | "link" | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const run = async (work: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try {
      await work();
      track("source_added");
      setForm(null);
    } catch (e) {
      setError(errorText(e, copy.errors.generic));
    } finally {
      setBusy(false);
    }
  };

  const upload = (file: File) =>
    run(async () => {
      const url = await generateUploadUrl({});
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      if (!response.ok) throw new Error("upload failed");
      const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
      await addFile({ notebookId, storageId, fileName: file.name });
    });

  const start = (kind: AddKind) => {
    setError(null);
    if (kind === "upload") fileInput.current?.click();
    else if (kind === "snap") cameraInput.current?.click();
    else setForm(kind);
  };

  const onPicked = (input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = "";
    if (file !== undefined) void upload(file);
  };

  const inputs = (
    <>
      <input ref={fileInput} type="file" hidden accept={ACCEPT} data-testid="file-input" onChange={(e) => onPicked(e.target)} />
      <input ref={cameraInput} type="file" hidden accept="image/*" capture="environment" onChange={(e) => onPicked(e.target)} />
    </>
  );

  return {
    busy,
    error,
    form,
    setForm,
    start,
    upload,
    addText: (title: string, text: string) => run(() => addTextM({ notebookId, title, text })),
    addLink: (url: string) => run(() => addLinkM({ notebookId, url })),
    inputs,
  };
}

export const ADD_ICONS: Record<AddKind, typeof Upload> = { upload: Upload, snap: Camera, paste: Type, link: Link2 };
