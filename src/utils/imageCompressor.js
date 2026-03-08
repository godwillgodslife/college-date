/**
 * client-side image compression using Canvas.
 * Ensures images are under a specific file size (default 100KB).
 */
export async function compressImage(file, { maxWidth = 1000, quality = 0.7, targetSizeKB = 100 } = {}) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Rational scaling
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Iterative quality reduction if needed
                let currentQuality = quality;
                let resultBlob;

                const attemptSave = () => {
                    canvas.toBlob((blob) => {
                        resultBlob = blob;
                        if (blob.size > targetSizeKB * 1024 && currentQuality > 0.1) {
                            currentQuality -= 0.1;
                            attemptSave();
                        } else {
                            resolve(resultBlob);
                        }
                    }, 'image/jpeg', currentQuality);
                };

                attemptSave();
            };
        };
    });
}

/**
 * Generates a tiny blurred placeholder (Base64) for progressive loading.
 */
export async function generateBlurPlaceholder(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 16; // tiny
                canvas.height = 16;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, 16, 16);
                resolve(canvas.toDataURL('image/jpeg', 0.1));
            };
        };
    });
}
