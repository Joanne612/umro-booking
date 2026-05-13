const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

export interface UploadResult {
    url: string;
    publicId: string;
}

/**
 * Upload gambar ke Cloudinary langsung dari browser (unsigned upload).
 * Strategi kompresi dilakukan via URL transformation (on-the-fly):
 * - q_auto:best  → Cloudinary pilih kualitas optimal (tajam, tidak blur)
 * - f_auto       → Format terbaik (WebP/AVIF di browser modern)
 * - w_1920,c_limit → Max lebar 1920px, tidak upscale
 *
 * Catatan: eager & eager_async tidak digunakan karena tidak kompatibel
 * dengan unsigned preset yang menyertakan parameter folder.
 */
export const uploadToCloudinary = (
    file: File,
    folder: string = "umro-booking",
    onProgress?: (percent: number) => void
): Promise<UploadResult> => {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);
        formData.append("folder", folder);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                // Sisipkan transformasi kompresi langsung ke URL (on-the-fly)
                // q_auto:best = kualitas tinggi otomatis, tidak blur
                // f_auto = format paling efisien per browser
                // w_1920,c_limit = max 1920px lebar, tidak diperbesar
                const rawUrl: string = data.secure_url;
                const url = rawUrl.replace(
                    "/upload/",
                    "/upload/q_auto:best,f_auto,w_1920,c_limit/"
                );
                resolve({ url, publicId: data.public_id });
            } else {
                let msg = `Upload gagal (${xhr.status})`;
                try { msg = JSON.parse(xhr.responseText)?.error?.message || msg; } catch { }
                reject(new Error(msg));
            }
        };

        xhr.onerror = () => reject(new Error("Koneksi gagal saat upload gambar."));
        xhr.send(formData);
    });
};

/**
 * Validasi file sebelum upload
 */
export const validateImageFile = (file: File): string | null => {
    const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
    const MAX_SIZE_MB = 15;

    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
        return "Format file harus JPG, PNG, WEBP, atau HEIC.";
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        return `Ukuran file maksimal ${MAX_SIZE_MB}MB.`;
    }
    return null;
};