import { BookingData } from "../firebase/firestore";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Mengonversi format tanggal YYYY-MM-DD ke format Indonesia DD/MM/YYYY
 */
const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

/**
 * Ekspor data konsumsi ke file Excel (.xlsx) 
 */
export const exportConsumptionToExcel = (data: BookingData[]) => {
  const worksheetData = data.map((b, index) => ({
    "No": index + 1,
    "Tanggal": b.endDate && b.endDate !== b.date ? `${formatDate(b.date)} - ${formatDate(b.endDate)}` : formatDate(b.date),
    "Jam": `${b.startTime} - ${b.endTime}`,
    "Judul Kegiatan / Rapat": b.title,
    "Pemohon": b.userName,
    "Divisi": b.division,
    "Ruangan": b.roomName,
    "Peserta": b.participants,
    "Snack Pagi": b.consumption?.morningSnack ? "YA" : "-",
    "Makan Siang": b.consumption?.lunch ? "YA" : "-",
    "Snack Sore": b.consumption?.afternoonSnack ? "YA" : "-",
    "Catatan": b.consumption?.notes || "-"
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Konsumsi");

  // Atur lebar kolom agar rapi
  const wscols = [
    { wch: 4 },  // No
    { wch: 12 }, // Tanggal
    { wch: 15 }, // Jam
    { wch: 40 }, // Judul Kegiatan
    { wch: 20 }, // Pemohon
    { wch: 15 }, // Divisi
    { wch: 20 }, // Ruangan
    { wch: 8 },  // Peserta
    { wch: 10 }, // Snack Pagi
    { wch: 12 }, // Makan Siang
    { wch: 10 }, // Snack Sore
    { wch: 35 }  // Catatan
  ];
  worksheet["!cols"] = wscols;

  // Nama file konsisten
  const firstBooking = data[0];
  const safeTitle = firstBooking?.title.replace(/[^a-z0-9]/gi, '_').substring(0, 25) || "Ekspor";
  const fileName = `Rekap_Konsumsi_${safeTitle}_${firstBooking?.date || 'rekap'}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * Ekspor data konsumsi ke file PDF (.pdf) dengan format VERTIKAL (Persis Detail Agenda)
 */
export const exportConsumptionToPDF = (data: BookingData[]) => {
  if (data.length === 0) return;
  
  // Ambil data pertama (fokus per agenda)
  const b = data[0];
  const doc = new jsPDF("p", "mm", "a4"); // Portrait A4
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // --- HEADER BAR ---
  doc.setFillColor(0, 162, 233);
  doc.rect(0, 0, pageWidth, 5, "F");

  let cursorY = 20;

  // --- TITLE: Detail Agenda ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(0, 162, 233);
  doc.text("Detail Agenda", margin, cursorY);
  cursorY += 15;

  // --- KEGIATAN / MEETING ---
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("KEGIATAN / MEETING", margin, cursorY);
  cursorY += 6;

  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  // Wrap text for title
  const splitTitle = doc.splitTextToSize(b.title, contentWidth);
  doc.text(splitTitle, margin, cursorY);
  cursorY += (splitTitle.length * 7) + 5;

  // --- INFO GRID (2 Columns) ---
  const gridY = cursorY;
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);

  // Column 1
  doc.text("Ruangan", margin, cursorY);
  doc.text("Waktu", margin, cursorY + 15);
  
  // Column 2
  doc.text("Tanggal", margin + (contentWidth / 2), cursorY);
  doc.text("Jumlah Peserta", margin + (contentWidth / 2), cursorY + 15);

  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  
  // Values Column 1
  doc.text(`Ruang ${b.roomName}`, margin, cursorY + 6);
  doc.setTextColor(0, 162, 233);
  doc.text(`${b.startTime} - ${b.endTime}`, margin, cursorY + 21);
  
  // Values Column 2
  doc.setTextColor(40, 40, 40);
  // DATE RANGE LOGIC
  const dateRange = b.endDate && b.endDate !== b.date 
    ? `${formatDate(b.date)} - ${formatDate(b.endDate)}`
    : formatDate(b.date);

  doc.text(dateRange, margin + (contentWidth / 2), cursorY + 6);
  doc.text(`${b.participants} Orang`, margin + (contentWidth / 2), cursorY + 21);

  cursorY += 35;

  // --- DIVISI ---
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "normal");
  doc.text("Divisi", margin, cursorY);
  cursorY += 6;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.text(b.division, margin, cursorY);
  
  cursorY += 15;

  // --- LINK KOORDINASI BLOCK ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, cursorY, contentWidth, 30, 3, 3, "FD");
  
  doc.setFontSize(9);
  doc.setTextColor(0, 162, 233);
  doc.text("LINK KOORDINASI (MEETING)", margin + 5, cursorY + 8);
  
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "italic");
  const linkText = b.meetingLink || "Link rapat belum ditambahkan.";
  const splitLink = doc.splitTextToSize(linkText, contentWidth - 10);
  doc.text(splitLink, margin + 5, cursorY + 15);
  
  cursorY += 40;

  // --- FASILITAS KONSUMSI BLOCK ---
  if (b.consumption?.requested) {
    const boxHeight = 50 + (b.consumption.notes ? 15 : 0);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, cursorY, contentWidth, boxHeight, 3, 3, "FD");

    // Title 
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("FASILITAS KONSUMSI", margin + 5, cursorY + 8);

    // Status Badge emulated
    const status = b.consumption.status || 'pending';
    const statusLabel = status === 'completed' ? 'SELESAI' : (status === 'approved' ? 'DISETUJUI' : (status === 'rejected' ? 'DITOLAK' : 'MENUNGGU'));
    doc.setFontSize(8);
    const statusWidth = doc.getTextWidth(statusLabel);
    doc.setFillColor(255, 237, 213); // Default orange-ish
    if (status === 'completed' || status === 'approved') doc.setFillColor(220, 252, 231);
    if (status === 'rejected') doc.setFillColor(254, 226, 226);
    
    doc.roundedRect(margin + contentWidth - statusWidth - 10, cursorY + 4, statusWidth + 5, 6, 1, 1, "F");
    doc.setTextColor(154, 52, 18);
    if (status === 'completed' || status === 'approved') doc.setTextColor(22, 101, 52);
    if (status === 'rejected') doc.setTextColor(185, 28, 28);
    doc.text(statusLabel, margin + contentWidth - statusWidth - 7.5, cursorY + 8.2);

    // Snacks
    doc.setTextColor(64, 64, 64);
    doc.setFont("helvetica", "normal");
    let snackX = margin + 5;
    let snackY = cursorY + 20;

    const addSnackBadge = (text: string) => {
      const w = doc.getTextWidth(text) + 6;
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(snackX, snackY - 4, w, 7, 1, 1, "FD");
      doc.text(text, snackX + 3, snackY + 1);
      snackX += w + 5;
    };

    if (b.consumption.morningSnack) addSnackBadge("Snack Pagi");
    if (b.consumption.lunch) addSnackBadge("Makan Siang");
    if (b.consumption.afternoonSnack) addSnackBadge("Snack Sore");

    // Notes
    if (b.consumption.notes) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const splitNotes = doc.splitTextToSize(`"${b.consumption.notes}"`, contentWidth - 15);
      doc.text(splitNotes, margin + 5, snackY + 12);
    }

    cursorY += boxHeight + 10;
  }

  // --- DIPESAN OLEH ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, cursorY, contentWidth, 25, 3, 3, "FD");
  
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "bold");
  doc.text("DIPESAN OLEH", margin + 5, cursorY + 7);
  
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text(b.userName, margin + 15, cursorY + 15);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Unit Kerja / Divisi terkait", margin + 15, cursorY + 20);

  // Avatar emulated
  doc.setFillColor(219, 234, 254);
  doc.circle(margin + 8, cursorY + 16, 4, "F");
  doc.setTextColor(30, 64, 175);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(b.userName.charAt(0).toUpperCase(), margin + 6.8, cursorY + 17.5);

  // --- FOOTER ---
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.setFont("helvetica", "italic");
  doc.text(`*Dokumen ini merupakan lampiran resmi penagihan konsumsi. Dihasilkan oleh Sistem UMRO pada ${new Date().toLocaleString('id-ID')}`, margin, pageWidth - 10);

  // SAVE
  const safeTitle = b.title.replace(/[^a-z0-9]/gi, '_').substring(0, 25);
  const fileDateInfo = b.endDate && b.endDate !== b.date ? `${b.date}_sd_${b.endDate}` : b.date;
  doc.save(`Detail_Agenda_${safeTitle}_${fileDateInfo}.pdf`);
};
