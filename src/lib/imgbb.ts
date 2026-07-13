export async function uploadToImgBB(
    file: File,
    onProgress?: (percent: number) => void
): Promise<{ url: string }> {
    const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
    if (!apiKey) {
        throw new Error("IMGBB API key tidak ditemukan. Cek .env.local kamu.");
    }

    const formData = new FormData();
    formData.append("image", file);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.imgbb.com/1/upload?key=${apiKey}`);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
            }
        };

        xhr.onload = () => {
            try {
                const res = JSON.parse(xhr.responseText);
                if (res.success) {
                    resolve({ url: res.data.url });
                } else {
                    reject(new Error(res.error?.message || "Upload gagal"));
                }
            } catch (err) {
                reject(err);
            }
        };

        xhr.onerror = () => reject(new Error("Upload gagal, cek koneksi internet."));
        xhr.send(formData);
    });
}