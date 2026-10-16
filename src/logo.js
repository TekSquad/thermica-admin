export function processLogo(file, paper) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Could not read the selected logo file."));
        reader.onload = (event) => {
            const img = new Image();
            img.onerror = () => reject(new Error("Could not read this logo image."));
            img.onload = () => {
                const probe = document.createElement("canvas");
                probe.width = img.width;
                probe.height = img.height;
                const pctx = probe.getContext("2d", { willReadFrequently: true });
                if (!pctx) return reject(new Error("Could not process the logo image."));
                pctx.fillStyle = "#FFFFFF";
                pctx.fillRect(0, 0, img.width, img.height);
                pctx.drawImage(img, 0, 0);

                const src = pctx.getImageData(0, 0, img.width, img.height).data;
                let minX = img.width;
                let minY = img.height;
                let maxX = -1;
                let maxY = -1;
                for (let y = 0; y < img.height; y++) {
                    for (let x = 0; x < img.width; x++) {
                        const i = (y * img.width + x) * 4;
                        const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
                        if (lum < 200) {
                            minX = Math.min(minX, x);
                            minY = Math.min(minY, y);
                            maxX = Math.max(maxX, x);
                            maxY = Math.max(maxY, y);
                        }
                    }
                }
                if (maxX < 0) {
                    minX = 0;
                    minY = 0;
                    maxX = img.width - 1;
                    maxY = img.height - 1;
                }
                const sx = minX;
                const sy = minY;
                const sw = maxX - minX + 1;
                const sh = maxY - minY + 1;
                const targetW = paper === 80 ? 448 : 320;
                const scale = Math.min(1, targetW / sw, 128 / sh);
                const width = Math.max(8, Math.ceil((sw * scale) / 8) * 8);
                const height = Math.max(8, Math.round(sh * scale));
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (!ctx) return reject(new Error("Could not process the logo image."));
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
                const imgData = ctx.getImageData(0, 0, width, height);
                const pixels = imgData.data;
                for (let i = 0; i < pixels.length; i += 4) {
                    const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
                    const bw = lum < 150 ? 0 : 255;
                    pixels[i] = bw;
                    pixels[i + 1] = bw;
                    pixels[i + 2] = bw;
                    pixels[i + 3] = 255;
                }
                ctx.putImageData(imgData, 0, 0);
                const dataUrl = canvas.toDataURL("image/png");
                if (dataUrl.length > 200_000) {
                    return reject(new Error("Logo is too detailed. Use a simpler, higher-contrast image."));
                }
                resolve(dataUrl);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}
