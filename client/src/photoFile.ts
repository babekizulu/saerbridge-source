const MAX_EDGE = 1600;

export async function resizePhoto(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Error('Use a JPEG, PNG, or WebP photograph.');
    }
    if (file.size > 25 * 1024 * 1024) {
        throw new Error('Choose a photograph under 25 MB.');
    }
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
        bitmap.close();
        throw new Error('The photograph could not be prepared.');
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
            if (result) resolve(result);
            else reject(new Error('The photograph could not be prepared.'));
        }, 'image/jpeg', 0.82);
    });
    return new File([blob], 'property.jpg', { type: 'image/jpeg', lastModified: Date.now() });
}
