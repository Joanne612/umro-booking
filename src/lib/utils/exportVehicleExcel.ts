import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

export interface VehicleBooking {
  id?: string;
  userId: string;
  userName: string;
  userPhone: string;
  tripType: "pp" | "one_way";
  date: string;
  endDate?: string;
  duration: number; // Jumlah hari
  passengers: number;
  event: string; // Acara/Agenda
  pickupTime: string;
  pickupLocation: string;
  destination: string;
  status: "pending" | "waiting_asman" | "approved" | "rejected";
  createdAt: any;
  ticketId?: string;
  validatedBy?: string;
  validatedByName?: string;
  validationDate?: any;
  approvedBy?: string;
  approvedByName?: string;
  approvalDate?: any;
  rejectReason?: string;
  vehicleNotes?: string;
  asmanAcknowledge?: boolean;
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverEmail?: string;
  assignedDriverUid?: string;
  assignedDriverPhone?: string;
  assignedPlateNumber?: string;
  assignedVehicleType?: string;
  assignedTripType?: "Perjalanan Dalam Kota" | "Perjalanan Luar Kota";
  assignedSppd?: string;
  assignedSppdCost?: number;
  assignedLodgingCost?: number;
  assignedPersekot?: number;
  assignedCity?: string;
}

export function getPresetDateRange(preset: 'hari' | 'minggu' | 'bulan'): { start: string; end: string } {
  const today = new Date();
  const end = new Date(today);
  let start = new Date(today);

  if (preset === 'hari') {
    start = new Date(today);
  } else if (preset === 'minggu') {
    const day = today.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    start.setDate(today.getDate() - diffToMonday);
  } else if (preset === 'bulan') {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
  }

  const toISO = (d: Date) => d.toISOString().split('T')[0];
  return { start: toISO(start), end: toISO(end) };
}

export function exportVehiclesToExcel(
  vehicles: VehicleBooking[],
  startDate: string,
  endDate: string
) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const filtered = vehicles.filter(v => {
    const vStart = new Date(v.date);
    const vEnd = v.endDate ? new Date(v.endDate) : vStart;
    return vStart <= end && vEnd >= start && v.status === 'approved';
  });

 if (filtered.length === 0) {
  Swal.fire({
    icon: 'info',
    title: 'Data Tidak Ditemukan',
    text: 'Tidak ada data kendaraan pada rentang tanggal yang dipilih.',
    confirmButtonColor: '#10B981',
  });
  return;
}

  const exportData = filtered.map((v, index) => {
    const tglAwal = new Date(v.date);
    const tglAkhir = v.endDate ? new Date(v.endDate) : tglAwal;

    return {
      No: index + 1,
      'Tanggal Awal': tglAwal.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      'Tanggal Akhir': tglAkhir.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      'Jumlah Hari': v.duration ?? '-',
      'No. Tiket': v.ticketId || '-',
      'PIC (Pemesan)': v.userName || '-',
      'Nomor Polisi': v.assignedPlateNumber || '-',
      'Jenis Kendaraan': v.assignedVehicleType || '-',
      Driver: v.assignedDriverName || '-',
      'Jumlah Penumpang': v.passengers ?? '-',
      Tujuan: v.destination || '-',
      'Kota Tujuan': v.assignedCity || '-',
      'Jenis Perjalanan': v.assignedTripType || '-',
      'Biaya SPPD': v.assignedSppdCost ?? 0,
      'Biaya Penginapan': v.assignedLodgingCost ?? 0,
      Persekot: v.assignedPersekot ?? 0,
      'Total Biaya': (v.assignedSppdCost ?? 0) + (v.assignedLodgingCost ?? 0) + (v.assignedPersekot ?? 0),
    };
  });
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  worksheet['!cols'] = [
    { wch: 4 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 12 },
    { wch: 20 },
    { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 20 },
    { wch: 14 }, { wch: 24 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Kendaraan');

  const fileName = `Riwayat_Kendaraan_${startDate}_sd_${endDate}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}