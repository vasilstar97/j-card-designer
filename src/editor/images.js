function readBlobAsDataUrl(blob, errorMessage) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(new Error(errorMessage)));
    reader.readAsDataURL(blob);
  });
}

export async function validateEmbeddedImage(dataUrl) {
  if (dataUrl === "") return;
  const match = /^data:image\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/]*={0,2})$/i.exec(dataUrl);
  if (!match || match[1].length % 4 !== 0) throw new Error("The cassette cover must be an embedded image.");
  const bytes = match[1].length / 4 * 3 - (match[1].endsWith("==") ? 2 : match[1].endsWith("=") ? 1 : 0);
  if (bytes > 20 * 1024 * 1024) throw new Error("The cassette cover is larger than 20 MB.");
  const image = new Image();
  image.src = dataUrl;
  try {
    await image.decode();
  } catch {
    throw new Error("The cassette cover image could not be read.");
  }
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
