function readBlobAsDataUrl(blob, errorMessage) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(new Error(errorMessage)));
    reader.readAsDataURL(blob);
  });
}

export async function readImageFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }
  return readBlobAsDataUrl(file, "Could not read the image file.");
}

export async function readImageUrl(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Server responded with ${response.status}.`);
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) return null;
  if (blob.size > 20 * 1024 * 1024) throw new Error("Image is larger than 20 MB.");
  return readBlobAsDataUrl(blob, "Could not read the downloaded image.");
}
