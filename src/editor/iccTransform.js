import { instantiate, TYPE_RGB_8, TYPE_CMYK_8, cmsFLAGS_BLACKPOINTCOMPENSATION, cmsInfoDescription } from "lcms-wasm";
import { ICC_INTENTS, validateIccProfile } from "./iccProfiles.js";

// This module also runs in Node tests; the browser supplies its bundled WASM bytes.
export async function openIccTransform(bytes, intent = "relative", blackPointCompensation = true, moduleOptions = {}) {
  const profileBytes = validateIccProfile(bytes);
  const renderingIntent = ICC_INTENTS.find((item) => item.value === intent);
  if (!renderingIntent) throw new Error("Choose a supported ICC rendering intent.");
  const lcms = await instantiate(moduleOptions);
  let memory = 0, input = 0, output = 0, transform = 0;
  const close = () => {
    if (transform) lcms.cmsDeleteTransform(transform);
    if (input) lcms.cmsCloseProfile(input);
    if (output) lcms.cmsCloseProfile(output);
    if (memory) lcms._free(memory);
    transform = input = output = memory = 0;
  };
  try {
    // The array wrapper copies to the WASM stack, which is too small for many ICCs.
    memory = lcms._malloc(profileBytes.length);
    if (!memory) throw new Error("Not enough memory to open this ICC profile.");
    lcms.HEAPU8.set(profileBytes, memory);
    output = lcms._cmsOpenProfileFromMem(memory, profileBytes.length);
    if (!output || lcms.cmsGetColorSpaceASCII(output) !== "CMYK") throw new Error("Could not open this CMYK profile.");
    input = lcms.cmsCreate_sRGBProfile();
    transform = lcms.cmsCreateTransform(input, TYPE_RGB_8, output, TYPE_CMYK_8, renderingIntent.code,
      blackPointCompensation ? cmsFLAGS_BLACKPOINTCOMPENSATION : 0);
    if (!transform) throw new Error("This ICC profile does not support the selected conversion.");
    const name = lcms.cmsGetProfileInfoASCII(output, cmsInfoDescription, "en", "US").trim();
    return {
      name,
      convert(rgba) {
        if (!transform) throw new Error("The ICC conversion has been closed.");
        if (!(rgba instanceof Uint8Array || rgba instanceof Uint8ClampedArray) || rgba.length % 4) {
          throw new Error("Invalid RGBA pixels for ICC conversion.");
        }
        const result = new Uint8Array(rgba.length);
        const blockSize = 32768;
        const rgb = new Uint8Array(blockSize * 3);
        for (let first = 0; first < rgba.length / 4; first += blockSize) {
          const count = Math.min(blockSize, rgba.length / 4 - first);
          for (let pixel = 0; pixel < count; pixel++) {
            const source = (first + pixel) * 4;
            rgb[pixel * 3] = rgba[source];
            rgb[pixel * 3 + 1] = rgba[source + 1];
            rgb[pixel * 3 + 2] = rgba[source + 2];
          }
          result.set(lcms.cmsDoTransform(transform, rgb.subarray(0, count * 3), count), first * 4);
        }
        return result;
      },
      close
    };
  } catch (error) {
    close();
    throw error;
  }
}
