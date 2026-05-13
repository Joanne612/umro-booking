import {
  collection, addDoc, query, where, getDocs, Timestamp, onSnapshot, doc, getDoc,
  setDoc, updateDoc, deleteDoc, orderBy, limit, getCountFromServer, or
} from "firebase/firestore";
import { db } from "./config";
import { User as FirebaseUser } from "firebase/auth";

export interface BookingData {
  id?: string;
  roomId: string;
  roomName: string;
  title: string;
  division: string;
  date: string;
  startTime: string;
  endTime: string;
  participants: number;
  userId: string;
  userName: string;
  createdAt: any;
  ticketId?: string;
  meetingType?: string;
  isHybrid?: boolean;
  status: "active" | "cancelled";
  meetingLink?: string;
  isRescheduled?: boolean;
  groupId?: string; // Untuk mengelompokkan booking multi-hari
  endDate?: string;
  consumption?: {
    requested: boolean;
    morningSnack: boolean;
    lunch: boolean;
    afternoonSnack: boolean;
    notes?: string;
    status: "pending" | "approved" | "rejected" | "completed";
    approvedBy?: string;
    approvedByName?: string;
    approvalDate?: any;
    rejectReason?: string;
    processedBy?: string;
    processedByName?: string;
    processedDate?: any;
  }
}

export interface Room {
  id: string;
  name: string;
  type: "physical" | "online";
  description?: string;
}

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
  assignedPersekot?: number;
}

export interface ItemRequest {
  id?: string;
  userId: string;
  userName: string;
  division: string;
  category: "Permintaan ATK" | "Permintaan Terkait Part Komputer/Laptop" | "Lainnya";
  title: string;
  description: string;
  purchaseLinks: string[];
  status: "pending" | "approved" | "rejected" | "completed";
  createdAt: any;
  ticketId?: string;
  asmanApprovedBy?: string;
  asmanApprovedByName?: string;
  asmanApprovalDate?: any;
  staffProcessedBy?: string;
  staffProcessedByName?: string;
  staffProcessedDate?: any;
  rejectReason?: string;
}

// ─── Tambahkan interface ini ke firestore.ts setelah interface ItemRequest ───

export interface MaintenanceRequest {
  id?: string;
  userId: string;
  userName: string;
  division: string;
  category:
  | "Pemeliharaan AC"
  | "Pemeliharaan Gedung"
  | "Pemeliharaan Listrik"
  | "Pemeliharaan Plumbing"
  | "Lainnya";
  priority: "Rendah" | "Sedang" | "Tinggi" | "Darurat";
  title: string;
  location: string;
  description: string;
  photoUrls: string[];
  status: "pending" | "approved" | "in_progress" | "completed" | "rejected";
  createdAt: any;
  ticketId?: string;
  asmanApprovedBy?: string;
  asmanApprovedByName?: string;
  asmanApprovalDate?: any;
  staffProcessedBy?: string;
  staffProcessedByName?: string;
  staffCompletedDate?: any;
  rejectReason?: string;
  estimatedCompletionDate?: string;
  notes?: string;
}

// ─── Tambahkan fungsi-fungsi ini ke firestore.ts ─────────────────────────────

// Fungsi helper generate ticket ID (mirip createItemRequest)
const generateMaintenanceTicketId = async (): Promise<string> => {
  if (!db) throw new Error("Firestore not initialized");
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD
  const prefix = `MNT-${dateStr}-`;
  const q = query(
    collection(db, "maintenance_requests"),
    where("ticketId", ">=", prefix),
    where("ticketId", "<", prefix + "\uf8ff")
  );
  const snap = await getDocs(q);
  const nextNum = (snap.size + 1).toString().padStart(3, "0");
  return `${prefix}${nextNum}`;
};

export const createMaintenanceRequest = async (
  data: Omit<MaintenanceRequest, "status" | "createdAt">
) => {
  if (!db) throw new Error("Firestore not initialized");
  const ticketId = await generateMaintenanceTicketId();
  await addDoc(collection(db, "maintenance_requests"), {
    ...data,
    ticketId,
    status: "pending",
    createdAt: Timestamp.now(),
  });
};

export const updateMaintenanceRequest = async (
  id: string,
  data: Partial<
    Omit<MaintenanceRequest, "id" | "status" | "createdAt" | "userId" | "userName">
  >
) => {
  if (!db) return;
  const ref = doc(db, "maintenance_requests", id);
  await updateDoc(ref, data);
};

export const getUserMaintenanceRequests = async (
  userId: string
): Promise<MaintenanceRequest[]> => {
  if (!db) return [];
  const q = query(
    collection(db, "maintenance_requests"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as MaintenanceRequest))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};

export const getMaintenanceRequestsByStatus = async (
  statuses: string[]
): Promise<MaintenanceRequest[]> => {
  if (!db) return [];
  const q = query(
    collection(db, "maintenance_requests"),
    where("status", "in", statuses)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as MaintenanceRequest))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};

export const updateMaintenanceRequestStatus = async (
  id: string,
  status: MaintenanceRequest["status"],
  extra?: Record<string, any>
) => {
  if (!db) return;
  const ref = doc(db, "maintenance_requests", id);
  await updateDoc(ref, { status, ...extra });
};

export const subscribeToMaintenanceRequests = (
  statuses: string[],
  callback: (data: MaintenanceRequest[]) => void
) => {
  if (!db) return () => { };
  const q = query(
    collection(db, "maintenance_requests"),
    where("status", "in", statuses)
  );
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MaintenanceRequest));
    callback(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
  });
};

export const subscribeToUserMaintenanceRequests = (
  userId: string,
  callback: (data: MaintenanceRequest[]) => void
) => {
  if (!db) return () => { };
  const q = query(
    collection(db, "maintenance_requests"),
    where("userId", "==", userId)
  );
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MaintenanceRequest));
    callback(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
  });
};

export const subscribeToAllMaintenanceRequests = (
  callback: (data: MaintenanceRequest[]) => void
) => {
  if (!db) return () => { };
  const q = query(collection(db, "maintenance_requests"));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MaintenanceRequest));
    callback(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
  });
};

export const deleteMaintenanceRequest = async (id: string): Promise<void> => {
  if (!db) return;
  await deleteDoc(doc(db, "maintenance_requests", id));
};

export interface UserRole {
  uid: string;
  email: string;
  role: "admin" | "asman" | "koordinator_driver" | "staff_umum" | "user" | "view" | "driver";
  name: string;
}

export interface DriverRate {
  id?: string;
  rateId?: string;
  category: string;
  description: string;
  tripType: "Perjalanan Dalam Kota" | "Perjalanan Luar Kota";
  coveredAreas: string[];
  additionalDays: string; // Misal: "1 Hari"
  rate: number;
  lodgingRate?: number;
  createdAt?: any;
}

export interface Driver {
  id?: string;
  name: string;
  contact: string;
  email: string;
  uid?: string;
  plateNumber?: string;
  vehicleType?: string;
  status?: string;
  createdAt?: any;
}

export interface FleetVehicle {
  id?: string;
  name: string;
  plateNumber: string;
  fuelType: string;
  createdAt?: any;
}

export interface DriverTrip {
  id?: string;
  tripId?: string; // DT-YYMMDD-RAND
  driverId: string;
  driverName: string;
  driverEmail?: string;
  driverUid?: string;
  plateNumber: string;
  contact: string;
  vehicleType: string;
  sppd: string;
  tripType: "Perjalanan Dalam Kota" | "Perjalanan Luar Kota";
  persekot: number;
  status: "pending" | "ongoing" | "completed";
  createdAt?: any;
  bookingId?: string;
  // Detail tambahan dari booking
  destination?: string;
  userName?: string;
  userPhone?: string;
  pickupTime?: string;
  pickupLocation?: string;
  passengers?: number;
  event?: string;
  tripOption?: string;
  startKm?: number;
  endKm?: number;
  tolls?: number[];
  fuelCost?: number;
  parkingCost?: number;
  otherCost?: number;
  sppdCost?: number;
  totalRealization?: number;
  // Foto bukti (URL Cloudinary)
  startKmPhotoUrl?: string;
  endKmPhotoUrl?: string;
  tollPhotoUrls?: string[];
}

// ================= USER ROLES =================

export const syncUserToFirestore = async (user: FirebaseUser) => {
  if (!db) return;
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const userData = snap.data();
    // Re-verify driver link just in case
    if (user.email && userData.role === "driver") {
      const driversRef = collection(db, "drivers");
      const q = query(driversRef, where("email", "==", user.email.toLowerCase()));
      const dSnap = await getDocs(q);
      if (!dSnap.empty && !dSnap.docs[0].data().uid) {
        await updateDoc(dSnap.docs[0].ref, { uid: user.uid });
      }
    }
    return userData.role;
  }

  // New user logic...
  let role: any = "user";
  if (user.email) {
    const driversRef = collection(db, "drivers");
    const q = query(driversRef, where("email", "==", user.email.toLowerCase()));
    const driverSnap = await getDocs(q);
    if (!driverSnap.empty) {
      role = "driver";
      await updateDoc(driverSnap.docs[0].ref, { uid: user.uid });
    }
  }

  await setDoc(userRef, {
    uid: user.uid,
    email: user.email,
    name: user.displayName || user.email,
    role: role
  });
  return role;
};

export const getUserRole = async (uid: string) => {
  if (!db) return "user";
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) return snap.data().role;
  return "user";
};

export const deleteUserAccount = async (uid: string) => {
  if (!db) return;
  await deleteDoc(doc(db, "users", uid));
};

// Admin: Create user account with email & password
// This stores user data in Firestore; Firebase Auth account is created client-side
export const createUserInFirestore = async (
  uid: string,
  name: string,
  email: string,
  role: "admin" | "asman" | "koordinator_driver" | "staff_umum" | "user" | "view" | "driver" = "user"
) => {
  if (!db) return;
  const emailLower = email.toLowerCase();

  // Check if driver data exists for this email
  let assignedRole: typeof role = role;
  const driversRef = collection(db, "drivers");
  const q = query(driversRef, where("email", "==", emailLower));
  const driverSnap = await getDocs(q);
  if (!driverSnap.empty && role === "user") {
    assignedRole = "driver";
    await updateDoc(driverSnap.docs[0].ref, { uid });
  }

  await setDoc(doc(db, "users", uid), {
    uid,
    email: emailLower,
    name,
    role: assignedRole,
    createdAt: new Date().toISOString(),
  });
  return assignedRole;
};

// Login user: verify credentials stored in Firestore (called after Firebase Auth signIn)
export const loginUserWithEmailPassword = async (uid: string, email: string) => {
  if (!db) return "user";
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const userData = snap.data();
    // Re-check driver link
    if (email && userData.role === "driver") {
      const driversRef = collection(db, "drivers");
      const q = query(driversRef, where("email", "==", email.toLowerCase()));
      const dSnap = await getDocs(q);
      if (!dSnap.empty && !dSnap.docs[0].data().uid) {
        await updateDoc(dSnap.docs[0].ref, { uid });
      }
    }
    return userData.role as string;
  }

  // Fallback: new user not registered by admin
  return null; // null means not registered
};

// Get user display info from Firestore
export const getUserInfo = async (uid: string) => {
  if (!db) return null;
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) return snap.data();
  return null;
};

// Admin: Get all users for management
export const getAllUsers = async (): Promise<UserRole[]> => {
  if (!db) return [];
  const usersRef = collection(db, "users");
  const snap = await getDocs(usersRef);
  return snap.docs.map(doc => doc.data() as UserRole);
};

export const generateTicketId = (prefix: string) => {
  const date = new Date();
  const dateStr = date.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${dateStr}-${randomStr}`;
};

// Admin: Update user role
export const updateUserRole = async (uid: string, newRole: "admin" | "asman" | "koordinator_driver" | "staff_umum" | "user" | "view" | "driver") => {
  if (!db) return;
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { role: newRole });
};

// ================= ROOMS =================

export const initAndGetRooms = async (): Promise<Room[]> => {
  if (!db) return [];
  const roomsRef = collection(db, "rooms");
  const snap = await getDocs(roomsRef);

  return snap.docs.map(doc => doc.data() as Room);
};

// Admin: Add new room
export const addRoom = async (name: string, type: "physical" | "online", description: string = "") => {
  if (!db) return;
  const id = `${type}_${Date.now()}`;
  await setDoc(doc(db, "rooms", id), { id, name, type, description });
};

// Admin: Update room (name & description)
export const updateRoom = async (roomId: string, updates: Partial<Pick<Room, 'name' | 'description'>>) => {
  if (!db) return;
  const roomRef = doc(db, "rooms", roomId);
  await updateDoc(roomRef, updates);
};

// Admin: Delete room with safety check
export const deleteRoom = async (roomId: string) => {
  if (!db) throw new Error("Firestore not initialized");

  // Check for active reservations
  const bookingsRef = collection(db, "bookings");
  const q = query(bookingsRef, where("roomId", "==", roomId), where("status", "==", "active"));
  const snap = await getDocs(q);

  if (!snap.empty) {
    throw new Error("Tidak dapat menghapus ruangan karena masih ada reservasi aktif di ruangan ini.");
  }

  await deleteDoc(doc(db, "rooms", roomId));
};

// ================= UTILS =================

export const getDatesInRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  let curr = new Date(startDate);
  const last = new Date(endDate);

  while (curr <= last) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

// ================= BOOKINGS =================

export const checkBookingConflict = async (
  roomId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string,
  excludeGroupId?: string
): Promise<BookingData | null> => {
  if (!db) return null;

  const bookingsRef = collection(db, "bookings");
  const q = query(
    bookingsRef,
    where("roomId", "==", roomId),
    where("date", "==", date),
    where("status", "==", "active")
  );

  const snapshot = await getDocs(q);
  const existingBookings = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as BookingData))
    .filter(booking => {
      if (excludeBookingId && booking.id === excludeBookingId) return false;
      if (excludeGroupId && booking.groupId === excludeGroupId) return false;
      return true;
    });

  const conflict = existingBookings.find(booking => {
    return (startTime < booking.endTime && endTime > booking.startTime);
  });

  return conflict || null;
};

export const createBooking = async (data: Omit<BookingData, "status">) => {
  if (!db) throw new Error("Firestore not initialized");

  const conflict = await checkBookingConflict(data.roomId, data.date, data.startTime, data.endTime);

  if (conflict) {
    throw new Error(`Ruangan ini sudah dibooking oleh ${conflict.userName} (${conflict.startTime} - ${conflict.endTime}).`);
  }

  const bookingsRef = collection(db, "bookings");
  const ticketId = generateTicketId(data.roomName.toLowerCase().includes('zoom') ? 'ZM' : 'RM');
  const docRef = await addDoc(bookingsRef, {
    ...data,
    status: "active",
    ticketId,
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const updateBooking = async (bookingId: string, data: Partial<BookingData>) => {
  if (!db) throw new Error("Firestore not initialized");
  const bookingRef = doc(db, "bookings", bookingId);
  await updateDoc(bookingRef, data);
};

export const subscribeToBookingsRange = (startDate: string, endDate: string, callback: (bookings: BookingData[]) => void) => {
  if (!db) return () => { };

  const q = query(collection(db, "bookings"),
    where("status", "==", "active"),
    where("date", ">=", startDate),
    where("date", "<=", endDate)
  );

  return onSnapshot(q, (snapshot) => {
    const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingData));
    callback(bookings);
  });
};

export const subscribeToDrivers = (callback: (data: Driver[]) => void) => {
  if (!db) return () => { };
  const q = query(collection(db, "drivers"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver));
    callback(data);
  });
};

export const getUserBookings = async (uid: string): Promise<BookingData[]> => {
  if (!db) return [];
  const q = query(collection(db, "bookings"), where("userId", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingData));
};

export const subscribeToFleet = (callback: (data: FleetVehicle[]) => void) => {
  if (!db) return () => { };
  const q = query(collection(db, "fleet_vehicles"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FleetVehicle));
    callback(data);
  });
};

export const cancelBooking = async (bookingId: string) => {
  if (!db) return;
  const bookingRef = doc(db, "bookings", bookingId);
  await updateDoc(bookingRef, { status: "cancelled" });
};

export const cancelBookingSeries = async (groupId: string) => {
  if (!db) return;
  const q = query(collection(db, "bookings"), where("groupId", "==", groupId));
  const snap = await getDocs(q);
  const promises = snap.docs.map(doc => updateDoc(doc.ref, { status: "cancelled" }));
  await Promise.all(promises);
};

export const deleteBooking = async (bookingId: string) => {
  if (!db) return;
  const bookingRef = doc(db, "bookings", bookingId);
  await deleteDoc(bookingRef);
};

export const getIncompleteZoomBookings = async (): Promise<BookingData[]> => {
  if (!db) return [];
  try {
    // 1. Dapatkan daftar ID ruangan online (Zoom)
    const roomsSnap = await getDocs(collection(db, "rooms"));
    const onlineRoomIds = roomsSnap.docs
      .filter(doc => (doc.data() as Room).type === "online")
      .map(doc => doc.id);

    if (onlineRoomIds.length === 0) return [];

    // 2. Cari booking aktif untuk ruangan tersebut yang belum punya link
    const q = query(
      collection(db, "bookings"),
      where("status", "==", "active"),
      where("roomId", "in", onlineRoomIds)
    );

    const snap = await getDocs(q);
    // Filter manual untuk string kosong atau field tidak ada
    return snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as BookingData))
      .filter(b => !b.meetingLink || b.meetingLink.trim() === "");
  } catch (error) {
    console.error("Error fetching incomplete zoom bookings:", error);
    return [];
  }
};

export const updateBookingLink = async (bookingId: string, link: string) => {
  if (!db) return;
  const docRef = doc(db, "bookings", bookingId);
  await updateDoc(docRef, { meetingLink: link });
};


export const getBookingsByGroupId = async (groupId: string): Promise<BookingData[]> => {
  if (!db) return [];
  const q = query(collection(db, "bookings"), where("groupId", "==", groupId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingData));
};

export const updateBookingMeetingLink = async (bookingId: string, link: string) => {
  if (!db) return;
  const bookingRef = doc(db, "bookings", bookingId);
  await updateDoc(bookingRef, { meetingLink: link });
};

// ================= CONSUMPTION APPROVALS =================

export const getPendingConsumptionBookings = async (): Promise<BookingData[]> => {
  if (!db) return [];
  const bookingsRef = collection(db, "bookings");
  // Get active bookings that requested consumption and are still pending
  const q = query(
    bookingsRef,
    where("status", "==", "active"),
    where("consumption.requested", "==", true),
    where("consumption.status", "==", "pending")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingData));
};

export const getConsumptionHistory = async (): Promise<BookingData[]> => {
  if (!db) return [];
  const bookingsRef = collection(db, "bookings");
  const q = query(
    bookingsRef,
    where("status", "==", "active"),
    where("consumption.requested", "==", true),
    where("consumption.status", "in", ["approved", "rejected", "completed"])
  );

  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as BookingData))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};

// NEW: For Staff Umum - Get only approved (not yet completed)
export const getApprovedConsumptionBookings = async (): Promise<BookingData[]> => {
  if (!db) return [];
  const bookingsRef = collection(db, "bookings");
  const q = query(
    bookingsRef,
    where("status", "==", "active"),
    where("consumption.requested", "==", true),
    where("consumption.status", "==", "approved")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as BookingData))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};

export const subscribeToConsumptionBookings = (
  statuses: string[],
  callback: (data: BookingData[]) => void
) => {
  if (!db) return () => { };
  const q = query(
    collection(db, "bookings"),
    where("status", "==", "active"),
    where("consumption.requested", "==", true),
    where("consumption.status", "in", statuses)
  );
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingData));
    callback(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
  });
};

export const updateConsumptionStatus = async (
  bookingId: string,
  status: "approved" | "rejected" | "completed",
  userId: string,
  userName: string,
  reason?: string
) => {
  if (!db) return;
  const bookingRef = doc(db, "bookings", bookingId);

  const updates: any = {
    "consumption.status": status,
  };

  if (status === "approved" || status === "rejected") {
    updates["consumption.approvedBy"] = userId;
    updates["consumption.approvedByName"] = userName;
    updates["consumption.approvalDate"] = Timestamp.now();
    if (reason) updates["consumption.rejectReason"] = reason;
  } else if (status === "completed") {
    updates["consumption.processedBy"] = userId;
    updates["consumption.processedByName"] = userName;
    updates["consumption.processedDate"] = Timestamp.now();
  }

  await updateDoc(bookingRef, updates);
};

// ================= VEHICLE BOOKINGS =================

export const createVehicleBooking = async (data: Omit<VehicleBooking, "status" | "createdAt">) => {
  if (!db) throw new Error("Firestore not initialized");

  const bookingsRef = collection(db, "vehicle_bookings");
  const ticketId = generateTicketId('VB');
  const docRef = await addDoc(bookingsRef, {
    ...data,
    status: "pending",
    ticketId,
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const getUserVehicleBookings = async (userId: string): Promise<VehicleBooking[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, "vehicle_bookings"), where("userId", "==", userId), limit(100));
    const snap = await getDocs(q);
    return snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as VehicleBooking))
      .sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
  } catch (error) {
    console.error("Error fetching user vehicle bookings:", error);
    return [];
  }
};

export const subscribeToPendingVehicles = (callback: (data: VehicleBooking[]) => void) => {
  if (!db) return () => { };
  const q = query(
    collection(db, "vehicle_bookings"),
    where("status", "==", "pending")
  );

  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleBooking));
    callback(data.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
  });
};

export const subscribeToWaitingAsmanVehicles = (callback: (data: VehicleBooking[]) => void) => {
  if (!db) return () => { };
  const q = query(
    collection(db, "vehicle_bookings"),
    where("status", "==", "approved"),
    where("asmanAcknowledge", "==", false)
  );

  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleBooking));
    callback(data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
  });
};

export const subscribeToVehicleHistory = (callback: (data: VehicleBooking[]) => void) => {
  if (!db) return () => { };
  const q = query(
    collection(db, "vehicle_bookings"),
    where("status", "in", ["waiting_asman", "approved", "rejected"])
  );

  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleBooking));
    // Sort on client side to avoid manual index creation
    const sorted = data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    callback(sorted.slice(0, 50));
  });
};

export const getVehicleHistory = async (): Promise<VehicleBooking[]> => {
  if (!db) return [];
  const q = query(
    collection(db, "vehicle_bookings"),
    where("status", "in", ["waiting_asman", "approved", "rejected"]),
    limit(100)
  );
  const snap = await getDocs(q);
  const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleBooking));
  return data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 50);
};

export const updateVehicleNotes = async (bookingId: string, notes: string) => {
  if (!db) return;
  const bookingRef = doc(db, "vehicle_bookings", bookingId);
  await updateDoc(bookingRef, {
    vehicleNotes: notes
  });
};

export const validateVehicleBooking = async (
  bookingId: string,
  officerId: string,
  officerName: string,
  vehicleNotes: string,
  assignmentData?: {
    driverId: string;
    driverName: string;
    driverEmail: string;
    driverUid: string;
    driverPhone: string;
    plateNumber: string;
    vehicleType: string;
    tripType: "Perjalanan Dalam Kota" | "Perjalanan Luar Kota";
    sppd: string;
    sppdCost: number;
    persekot: number;
  }
) => {
  if (!db) return;
  const bookingRef = doc(db, "vehicle_bookings", bookingId);

  const updates: any = {
    status: "approved",
    validatedBy: officerId,
    validatedByName: officerName,
    validationDate: Timestamp.now(),
    vehicleNotes: vehicleNotes,
    asmanAcknowledge: false
  };

  if (assignmentData) {
    updates.assignedDriverId = assignmentData.driverId;
    updates.assignedDriverName = assignmentData.driverName;
    updates.assignedDriverEmail = assignmentData.driverEmail;
    updates.assignedDriverUid = assignmentData.driverUid;
    updates.assignedDriverPhone = assignmentData.driverPhone;
    updates.assignedPlateNumber = assignmentData.plateNumber;
    updates.assignedVehicleType = assignmentData.vehicleType;
    updates.assignedTripType = assignmentData.tripType;
    updates.assignedSppd = assignmentData.sppd;
    updates.assignedPersekot = assignmentData.persekot;
    updates.assignedSppdCost = assignmentData.sppdCost || 0;
  }

  await updateDoc(bookingRef, updates);

  // AUTO CREATE DRIVER TRIP IMMEDIATELY
  if (assignmentData && assignmentData.driverId) {
    const tripsRef = collection(db, "driver_trips");
    const tripId = generateTicketId('DT');
    const snap = await getDoc(bookingRef);
    const data = snap.data() as VehicleBooking;

    await addDoc(tripsRef, {
      tripId,
      driverId: assignmentData.driverId,
      driverName: assignmentData.driverName,
      driverEmail: assignmentData.driverEmail || "",
      driverUid: assignmentData.driverUid || "",
      plateNumber: assignmentData.plateNumber || "",
      contact: assignmentData.driverPhone || "",
      vehicleType: assignmentData.vehicleType || "",
      sppd: assignmentData.sppd || "-",
      tripType: assignmentData.tripType || "Perjalanan Dalam Kota",
      persekot: assignmentData.persekot || 0,
      sppdCost: assignmentData.sppdCost || 0,
      status: "pending",
      createdAt: Timestamp.now(),
      bookingId: bookingId,
      event: data.event || "",
      destination: data.destination || "",
      userName: data.userName || "",
      userPhone: data.userPhone || "",
      pickupTime: data.pickupTime || "",
      pickupLocation: data.pickupLocation || "",
      passengers: data.passengers || 0,
      tripOption: data.tripType === "pp" ? "Pulang Pergi" : "Satu Arah"
    });
  }
};

export const acknowledgeVehicleBooking = async (
  bookingId: string,
  officerId: string,
  officerName: string
) => {
  if (!db) return;
  const bookingRef = doc(db, "vehicle_bookings", bookingId);
  await updateDoc(bookingRef, {
    asmanAcknowledge: true,
    acknowledgedBy: officerId,
    acknowledgedByName: officerName,
    acknowledgmentDate: Timestamp.now()
  });
};

export const updateVehicleBookingStatus = async (
  bookingId: string,
  status: "approved" | "rejected",
  officerId: string,
  officerName: string,
  reason?: string,
  vehicleNotes?: string
) => {
  if (!db) return;
  const bookingRef = doc(db, "vehicle_bookings", bookingId);

  const updates: any = {
    status: status,
    approvedBy: officerId,
    approvedByName: officerName,
    approvalDate: Timestamp.now()
  };

  if (reason) updates.rejectReason = reason;
  if (vehicleNotes) updates.vehicleNotes = vehicleNotes;

  await updateDoc(bookingRef, updates);
};

export const cancelVehicleBooking = async (bookingId: string) => {
  if (!db) return;
  const docRef = doc(db, "vehicle_bookings", bookingId);
  await deleteDoc(docRef); // Or set status to "cancelled"
};

// ================= ITEM REQUESTS =================

export const createItemRequest = async (data: Omit<ItemRequest, "status" | "createdAt">) => {
  if (!db) throw new Error("Firestore not initialized");
  const requestsRef = collection(db, "item_requests");
  const ticketId = generateTicketId('IR');
  const docRef = await addDoc(requestsRef, {
    ...data,
    status: "pending",
    ticketId,
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const updateItemRequest = async (id: string, data: Partial<Omit<ItemRequest, "id" | "status" | "createdAt" | "userId" | "userName">>) => {
  if (!db) throw new Error("Firestore not initialized");
  const docRef = doc(db, "item_requests", id);
  await updateDoc(docRef, data);
};

export const updateVehicleBooking = async (id: string, data: Partial<Omit<VehicleBooking, "id" | "status" | "createdAt" | "userId">>) => {
  if (!db) throw new Error("Firestore not initialized");
  const docRef = doc(db, "vehicle_bookings", id);
  await updateDoc(docRef, data);
};

export const getUserItemRequests = async (userId: string): Promise<ItemRequest[]> => {
  if (!db) return [];
  const q = query(
    collection(db, "item_requests"),
    where("userId", "==", userId),
    limit(100)
  );
  const snap = await getDocs(q);
  const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ItemRequest));
  // Sorting manual di sisi klien agar tidak perlu indeks komposit
  return data.sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });
};

export const getItemRequestsByStatus = async (statuses: string[]): Promise<ItemRequest[]> => {
  if (!db) return [];
  const q = query(
    collection(db, "item_requests"),
    where("status", "in", statuses),
    limit(100)
  );
  const snap = await getDocs(q);
  const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ItemRequest));
  // Sorting manual di sisi klien
  return data.sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });
};

export const updateItemRequestStatus = async (
  requestId: string,
  status: "approved" | "rejected" | "completed",
  officerId: string,
  officerName: string,
  reason?: string
) => {
  if (!db) return;
  const requestRef = doc(db, "item_requests", requestId);

  const updates: any = { status };

  if (status === "approved" || status === "rejected") {
    updates.asmanApprovedBy = officerId;
    updates.asmanApprovedByName = officerName;
    updates.asmanApprovalDate = Timestamp.now();
    if (reason) updates.rejectReason = reason;
  } else if (status === "completed") {
    updates.staffProcessedBy = officerId;
    updates.staffProcessedByName = officerName;
    updates.staffProcessedDate = Timestamp.now();
  }

  await updateDoc(requestRef, updates);
};

export const deleteItemRequest = async (requestId: string) => {
  if (!db) return;
  const docRef = doc(db, "item_requests", requestId);
  await deleteDoc(docRef);
};
export const getPendingVehicleBookings = async (): Promise<VehicleBooking[]> => {
  if (!db) return [];
  const q = query(
    collection(db, "vehicle_bookings"),
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleBooking));
};

export const subscribeToUserBookings = (uid: string, callback: (data: BookingData[]) => void) => {
  if (!db) return () => { };
  const q = query(collection(db, "bookings"), where("userId", "==", uid));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingData));
    callback(data);
  });
};

export const subscribeToAllBookings = (callback: (data: BookingData[]) => void) => {
  if (!db) return () => { };
  const q = query(collection(db, "bookings"));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingData));
    callback(data);
  });
};

export const subscribeToUserVehicles = (uid: string, callback: (data: VehicleBooking[]) => void) => {
  if (!db) return () => { };
  const q = query(collection(db, "vehicle_bookings"), where("userId", "==", uid));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleBooking));
    callback(data);
  });
};

export const subscribeToAllVehicles = (callback: (data: VehicleBooking[]) => void) => {
  if (!db) return () => { };
  const q = query(collection(db, "vehicle_bookings"));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleBooking));
    callback(data);
  });
};

export const subscribeToUserItems = (uid: string, callback: (data: ItemRequest[]) => void) => {
  if (!db) return () => { };
  const q = query(collection(db, "item_requests"), where("userId", "==", uid));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ItemRequest));
    callback(data);
  });
};

export const subscribeToAllItems = (callback: (data: ItemRequest[]) => void) => {
  if (!db) return () => { };
  const q = query(collection(db, "item_requests"));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ItemRequest));
    callback(data);
  });
};

export const getWaitingAsmanVehicleBookings = async (): Promise<VehicleBooking[]> => {
  if (!db) return [];
  const q = query(
    collection(db, "vehicle_bookings"),
    where("status", "==", "waiting_asman")
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleBooking));
};

export const acknowledgeReschedule = async (bookingId: string) => {
  if (!db) return;
  const docRef = doc(db, "bookings", bookingId);
  await updateDoc(docRef, { isRescheduled: false });
};

// ================= DASHBOARD STATS =================

export const subscribeToRescheduledBookings = (callback: (data: BookingData[]) => void) => {
  if (!db) return () => { };
  const q = query(
    collection(db, "bookings"),
    where("status", "==", "active"),
    where("isRescheduled", "==", true)
  );

  return onSnapshot(q, (snap) => {
    // Filter secara client jika perlu, tapi query di atas sudah spesifik
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingData));

    // Sort descending by date
    const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    callback(sorted);
  });
};

export const subscribeToPendingConsumption = (callback: (data: BookingData[]) => void) => {
  if (!db) return () => { };
  const q = query(
    collection(db, "bookings"),
    where("status", "==", "pending")
  );
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingData));
    callback(data);
  });
};

export const subscribeToApprovedConsumption = (callback: (data: BookingData[]) => void) => {
  if (!db) return () => { };
  const q = query(
    collection(db, "bookings"),
    where("status", "==", "approved")
  );
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingData));
    callback(data);
  });
};

export const subscribeToPendingItemRequests = (status: string[], callback: (data: ItemRequest[]) => void) => {
  if (!db) return () => { };
  const q = query(
    collection(db, "item_requests"),
    where("status", "in", status)
  );
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ItemRequest));
    callback(data);
  });
};

export const subscribeToIncompleteZoom = (callback: (data: BookingData[]) => void) => {
  if (!db) return () => { };

  // Mengambil semua booking aktif dan memfilter di client side
  // untuk memastikan booking dengan meetingLink undefined atau "" tertangkap,
  // termasuk memfilter ruangan online/hybrid.
  const q = query(
    collection(db, "bookings"),
    where("status", "==", "active")
  );

  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingData));

    const incompleteZoom = data.filter(b => {
      const isZoomOrHybrid = (b.roomName && b.roomName.toLowerCase().includes('zoom')) || b.isHybrid;
      const hasNoLink = !b.meetingLink || b.meetingLink.trim() === "";
      return isZoomOrHybrid && hasNoLink;
    });

    // Urutkan berdasarkan waktu pembuatan terbaru
    incompleteZoom.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

    callback(incompleteZoom);
  });
};

export const getDashboardStats = async (userId: string, userRole: string) => {
  if (!db) return null;

  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const canSeeGlobalCons = ["admin", "asman", "staff_umum"].includes(userRole);
    const canSeeGlobalItems = ["admin", "asman", "staff_umum"].includes(userRole);
    const canSeeGlobalVehicles = ["admin", "asman", "koordinator_driver"].includes(userRole);
    const isAdminOrAsman = ["admin", "asman", "staff_umum", "koordinator_driver"].includes(userRole);

    // 1. Get bookings (for Room Usage Stats and Personal Stats)
    const bookingsQ = query(
      collection(db, "bookings"),
      where("status", "==", "active")
    );
    const bookingsSnap = await getDocs(bookingsQ);
    const allActiveBookings = bookingsSnap.docs.map(doc => doc.data() as BookingData);

    // Filter by date range in memory
    const allBookings = allActiveBookings.filter(b =>
      b.date >= firstDay && b.date <= lastDay
    );
    const userBookings = allBookings.filter(b => b.userId === userId);

    // 2. Pending Tasks Counts (Using getCountFromServer for efficiency)
    let pendingConsCount = 0;
    const isExecutionRole = userRole === "staff_umum";

    // Consumption count
    if (canSeeGlobalCons) {
      const statusToFetch = isExecutionRole ? "approved" : "pending";
      const q = query(
        collection(db, "bookings"),
        where("status", "==", "active"),
        where("consumption.requested", "==", true),
        where("consumption.status", "==", statusToFetch)
      );
      const countSnap = await getCountFromServer(q);
      pendingConsCount = countSnap.data().count;
    } else {
      const q = query(
        collection(db, "bookings"),
        where("userId", "==", userId),
        where("status", "==", "active"),
        where("consumption.requested", "==", true),
        where("consumption.status", "==", "pending")
      );
      const countSnap = await getCountFromServer(q);
      pendingConsCount = countSnap.data().count;
    }

    // Items count
    let pendingItemsCount = 0;
    const itemsRef = collection(db, "item_requests");
    if (canSeeGlobalItems) {
      const statusToFetch = isExecutionRole ? "approved" : "pending";
      const q = query(itemsRef, where("status", "==", statusToFetch));
      const countSnap = await getCountFromServer(q);
      pendingItemsCount = countSnap.data().count;
    } else {
      const q = query(itemsRef, where("userId", "==", userId), where("status", "==", "pending"));
      const countSnap = await getCountFromServer(q);
      pendingItemsCount = countSnap.data().count;
    }

    // Vehicles count
    let pendingVehiclesCount = 0;
    const vehiclesRef = collection(db, "vehicle_bookings");
    if (canSeeGlobalVehicles) {
      let q;
      if (userRole === "koordinator_driver" || userRole === "admin") {
        q = query(vehiclesRef, where("status", "==", "pending"));
      } else if (userRole === "asman") {
        q = query(vehiclesRef, where("status", "==", "approved"), where("asmanAcknowledge", "==", false));
      }

      if (q) {
        const countSnap = await getCountFromServer(q);
        pendingVehiclesCount = countSnap.data().count;
      }
    } else {
      const q = query(vehiclesRef, where("userId", "==", userId), where("status", "==", "pending"));
      const countSnap = await getCountFromServer(q);
      pendingVehiclesCount = countSnap.data().count;
    }

    // 3. Room Usage Stats
    const roomsRef = collection(db, "rooms");
    const roomsSnap = await getDocs(roomsRef);
    const allRooms = roomsSnap.docs.map(doc => doc.data() as Room);

    const physicalRooms = allRooms.filter(r => r.type === "physical");
    const roomUsage = physicalRooms.map(room => {
      return {
        roomId: room.id,
        roomName: room.name,
        count: allBookings.filter(b => b.roomId === room.id).length
      };
    }).sort((a, b) => b.count - a.count);

    return {
      totalBookingsMonth: allBookings.length,
      userBookingsMonth: userBookings.length,
      pendingTotal: pendingConsCount + pendingItemsCount + pendingVehiclesCount,
      pendingCons: pendingConsCount,
      pendingItems: pendingItemsCount,
      pendingVehicles: pendingVehiclesCount,
      roomUsage
    };
  } catch (error) {
    console.error("Dashboard stats fetch failed:", error);
    return null;
  }
};

export const getMyRecentActivity = async (userId: string) => {
  if (!db) return [];

  try {
    // Fetch latest bookings
    const bookingsQ = query(
      collection(db, "bookings"),
      where("userId", "==", userId)
    );
    const bookingsSnap = await getDocs(bookingsQ);
    const bookings = bookingsSnap.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          type: "Meeting",
          status: data.status,
          date: data.createdAt
        };
      })
      .sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0))
      .slice(0, 3);

    // Fetch latest item requests
    const itemsQ = query(
      collection(db, "item_requests"),
      where("userId", "==", userId),
      limit(3)
    );
    const itemsSnap = await getDocs(itemsQ);
    const items = itemsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        type: "Barang",
        status: data.status,
        date: data.createdAt
      };
    });

    // Fetch latest vehicle bookings
    const vehiclesQ = query(
      collection(db, "vehicle_bookings"),
      where("userId", "==", userId),
      limit(3)
    );
    const vehiclesSnap = await getDocs(vehiclesQ);
    const vehicles = vehiclesSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.event,
        type: "Kendaraan",
        status: data.status,
        date: data.createdAt
      };
    });

    // Combine and sort by date
    return [...bookings, ...items, ...vehicles]
      .sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0))
      .slice(0, 5);
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return [];
  }
};

// ================= DRIVER RATES =================

export const getDriverRates = async (): Promise<DriverRate[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, "driver_rates"), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DriverRate));
  } catch (error) {
    console.error("Error fetching driver rates:", error);
    return [];
  }
};

export const addDriverRate = async (rate: Omit<DriverRate, "id" | "createdAt" | "rateId">) => {
  if (!db) throw new Error("Firestore not initialized");
  const ratesRef = collection(db, "driver_rates");
  const rateId = generateTicketId('RT');
  await addDoc(ratesRef, {
    ...rate,
    rateId,
    createdAt: Timestamp.now()
  });
};

export const updateDriverRate = async (id: string, rate: Partial<DriverRate>) => {
  if (!db) throw new Error("Firestore not initialized");
  const rateRef = doc(db, "driver_rates", id);
  await updateDoc(rateRef, rate);
};

export const deleteDriverRate = async (id: string) => {
  if (!db) throw new Error("Firestore not initialized");
  const rateRef = doc(db, "driver_rates", id);
  await deleteDoc(rateRef);
};

// ================= DRIVER MANAGEMENT =================

export const getDrivers = async (): Promise<Driver[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, "drivers"), orderBy("name", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver));
  } catch (error) {
    console.error("Error fetching drivers:", error);
    return [];
  }
};

export const getDriverByEmail = async (email: string): Promise<Driver | null> => {
  if (!db || !email) return null;
  const q = query(collection(db, "drivers"), where("email", "==", email.toLowerCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Driver;
};

export const subscribeToAssignedTrips = (uid: string, email: string | null, callback: (data: DriverTrip[]) => void) => {
  if (!db || !uid) return () => { };

  const q = email ?
    query(
      collection(db, "driver_trips"),
      or(
        where("driverUid", "==", uid),
        where("driverEmail", "==", email.toLowerCase())
      )
    ) :
    query(
      collection(db, "driver_trips"),
      where("driverUid", "==", uid)
    );

  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DriverTrip));
    // Client-side sorting by createdAt desc
    const sorted = data.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
      return timeB - timeA;
    });
    callback(sorted);
  });
};

export const addDriver = async (driver: Omit<Driver, "id" | "createdAt">) => {
  if (!db) throw new Error("Firestore not initialized");
  const driversRef = collection(db, "drivers");
  await addDoc(driversRef, {
    ...driver,
    createdAt: Timestamp.now()
  });
};

export const updateDriver = async (id: string, driver: Partial<Driver>) => {
  if (!db) throw new Error("Firestore not initialized");
  const driverRef = doc(db, "drivers", id);
  await updateDoc(driverRef, driver);
};

export const deleteDriver = async (id: string) => {
  if (!db) throw new Error("Firestore not initialized");
  const driverRef = doc(db, "drivers", id);
  await deleteDoc(driverRef);
};

// ================= DRIVER TRIPS =================

export const getDriverTrips = async (): Promise<DriverTrip[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, "driver_trips"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DriverTrip));
  } catch (error) {
    console.error("Error fetching driver trips:", error);
    return [];
  }
};

export const subscribeToDriverTrips = (callback: (data: DriverTrip[]) => void) => {
  if (!db) return () => { };
  const q = query(collection(db, "driver_trips"), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DriverTrip));
    callback(data);
  });
};

export const addDriverTrip = async (trip: Omit<DriverTrip, "id" | "createdAt" | "tripId">) => {
  if (!db) throw new Error("Firestore not initialized");
  const tripsRef = collection(db, "driver_trips");
  const tripId = generateTicketId('DT');
  await addDoc(tripsRef, {
    ...trip,
    tripId,
    createdAt: Timestamp.now()
  });
};

export const updateDriverTrip = async (id: string, trip: Partial<DriverTrip>) => {
  if (!db) throw new Error("Firestore not initialized");
  const tripRef = doc(db, "driver_trips", id);
  await updateDoc(tripRef, trip);
};

export const deleteDriverTrip = async (id: string) => {
  if (!db) throw new Error("Firestore not initialized");
  const tripRef = doc(db, "driver_trips", id);
  await deleteDoc(tripRef);
};

// ================= FLEET MANAGEMENT =================

export const getFleetVehicles = async (): Promise<FleetVehicle[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, "fleet_vehicles"), orderBy("name", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FleetVehicle));
  } catch (error) {
    console.error("Error fetching fleet vehicles:", error);
    return [];
  }
};

export const addFleetVehicle = async (vehicle: Omit<FleetVehicle, "id" | "createdAt">) => {
  if (!db) throw new Error("Firestore not initialized");
  const fleetRef = collection(db, "fleet_vehicles");
  await addDoc(fleetRef, {
    ...vehicle,
    createdAt: Timestamp.now()
  });
};

export const updateFleetVehicle = async (id: string, vehicle: Partial<FleetVehicle>) => {
  if (!db) throw new Error("Firestore not initialized");
  const vehicleRef = doc(db, "fleet_vehicles", id);
  await updateDoc(vehicleRef, vehicle);
};

export const deleteFleetVehicle = async (id: string) => {
  if (!db) throw new Error("Firestore not initialized");
  const vehicleRef = doc(db, "fleet_vehicles", id);
  await deleteDoc(vehicleRef);
};