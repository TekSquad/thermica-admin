const MAX_CHARS = 200_000; // the logo lives in one Firestore document

/** Crop blank margins, scale for thermal paper, convert to 1-bit PNG (data URL). */
export function processLogo(file, paper = 58) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Could not read the selected file."));
        reader.onload = (event) => {
            const img = new Image();
            img.onerror = () => reject(new Error("Could not read this image."));
            img.onload = () => {
                const probe = document.createElement("canvas");
                probe.width = img.width;
                probe.height = img.height;
                const pctx = probe.getContext("2d", { willReadFrequently: true });
                if (!pctx) return reject(new Error("Could not process the image."));
                pctx.fillStyle = "#FFFFFF";
                pctx.fillRect(0, 0, img.width, img.height);
                pctx.drawImage(img, 0, 0);

                const src = pctx.getImageData(0, 0, img.width, img.height).data;
                let minX = img.width, minY = img.height, maxX = -1, maxY = -1;
                for (let y = 0; y < img.height; y++) {
                    for (let x = 0; x < img.width; x++) {
                        const i = (y * img.width + x) * 4;
                        const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
                        if (lum < 200) {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                    }
                }
                if (maxX < 0) {
                    minX = 0; minY = 0; maxX = img.width - 1; maxY = img.height - 1;
                }
                const sw = maxX - minX + 1;
                const sh = maxY - minY + 1;
                const scale = Math.min(1, (paper === 80 ? 448 : 320) / sw, 128 / sh);
                const width = Math.max(8, Math.ceil((sw * scale) / 8) * 8);
                const height = Math.max(8, Math.round(sh * scale));

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (!ctx) return reject(new Error("Could not process the image."));
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, minX, minY, sw, sh, 0, 0, width, height);

                const data = ctx.getImageData(0, 0, width, height);
                const px = data.data;
                for (let i = 0; i < px.length; i += 4) {
                    const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
                    const bw = lum < 150 ? 0 : 255;
                    px[i] = px[i + 1] = px[i + 2] = bw;
                    px[i + 3] = 255;
                }
                ctx.putImageData(data, 0, 0);

                const url = canvas.toDataURL("image/png");
                if (url.length > MAX_CHARS) {
                    return reject(new Error("Logo is too detailed. Use a simpler, higher-contrast image."));
                }
                resolve(url);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}