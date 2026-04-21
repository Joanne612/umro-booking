import { collection, addDoc, query, where, getDocs, Timestamp, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc, orderBy } from "firebase/firestore";
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
  status: "active" | "cancelled";
  meetingLink?: string;
  consumption?: {
    requested: boolean;
    snack: boolean;
    lunch: boolean;
    notes?: string;
    status: "pending" | "approved" | "rejected";
    approvedBy?: string;
    approvedByName?: string;
    approvalDate?: any;
    rejectReason?: string;
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
  duration: number; // Jumlah hari
  passengers: number;
  event: string; // Acara/Agenda
  pickupTime: string;
  pickupLocation: string;
  destination: string;
  status: "pending" | "waiting_asman" | "approved" | "rejected";
  createdAt: any;
  validatedBy?: string;
  validatedByName?: string;
  validationDate?: any;
  approvedBy?: string;
  approvedByName?: string;
  approvalDate?: any;
  rejectReason?: string;
  vehicleNotes?: string;
}

export interface UserRole {
  uid: string;
  email: string;
  role: "admin" | "asman" | "umum" | "user" | "view";
  name: string;
}

// ================= USER ROLES =================

export const syncUserToFirestore = async (user: FirebaseUser) => {
  if (!db) return;
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  
  if (!snap.exists()) {
    // Determine admin if email matches a specific one, otherwise user
    const role = "user"; 
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      name: user.displayName || user.email,
      role: role
    });
    return role;
  }
  return snap.data().role;
};

export const getUserRole = async (uid: string) => {
  if (!db) return "user";
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) return snap.data().role;
  return "user";
};

// Admin: Get all users for management
export const getAllUsers = async (): Promise<UserRole[]> => {
  if (!db) return [];
  const usersRef = collection(db, "users");
  const snap = await getDocs(usersRef);
  return snap.docs.map(doc => doc.data() as UserRole);
};

// Admin: Update user role
export const updateUserRole = async (uid: string, newRole: "admin" | "asman" | "umum" | "user" | "view") => {
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

// ================= BOOKINGS =================

export const checkBookingConflict = async (roomId: string, date: string, startTime: string, endTime: string): Promise<BookingData | null> => {
  if (!db) return null;
  
  const bookingsRef = collection(db, "bookings");
  const q = query(
    bookingsRef, 
    where("roomId", "==", roomId),
    where("date", "==", date),
    where("status", "==", "active")
  );

  const snapshot = await getDocs(q);
  const existingBookings = snapshot.docs.map(doc => doc.data() as BookingData);

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
  const docRef = await addDoc(bookingsRef, {
    ...data,
    status: "active",
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const subscribeToBookingsRange = (startDate: string, endDate: string, callback: (bookings: BookingData[]) => void) => {
  if (!db) return () => {};
  
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

export const getUserBookings = async (userId: string): Promise<BookingData[]> => {
  if (!db) return [];
  const q = query(collection(db, "bookings"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingData));
};

export const cancelBooking = async (bookingId: string) => {
  if (!db) return;
  const bookingRef = doc(db, "bookings", bookingId);
  await updateDoc(bookingRef, { status: "cancelled" });
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

export const updateConsumptionStatus = async (
  bookingId: string, 
  status: "approved" | "rejected", 
  asmanId: string, 
  asmanName: string,
  reason?: string
) => {
  if (!db) return;
  const bookingRef = doc(db, "bookings", bookingId);
  
  const updates: any = {
    "consumption.status": status,
    "consumption.approvedBy": asmanId,
    "consumption.approvedByName": asmanName,
    "consumption.approvalDate": Timestamp.now()
  };
  
  if (reason) {
    updates["consumption.rejectReason"] = reason;
  }
  
  await updateDoc(bookingRef, updates);
};

// ================= VEHICLE BOOKINGS =================

export const createVehicleBooking = async (data: Omit<VehicleBooking, "status" | "createdAt">) => {
  if (!db) throw new Error("Firestore not initialized");
  
  const bookingsRef = collection(db, "vehicle_bookings");
  const docRef = await addDoc(bookingsRef, {
    ...data,
    status: "pending",
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const getUserVehicleBookings = async (userId: string): Promise<VehicleBooking[]> => {
  if (!db) return [];
  const q = query(collection(db, "vehicle_bookings"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as VehicleBooking))
    .sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
};

export const getPendingVehicleBookings = async (): Promise<VehicleBooking[]> => {
  if (!db) return [];
  const q = query(
    collection(db, "vehicle_bookings"), 
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as VehicleBooking))
    .sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
};

export const getWaitingAsmanVehicleBookings = async (): Promise<VehicleBooking[]> => {
  if (!db) return [];
  const q = query(
    collection(db, "vehicle_bookings"), 
    where("status", "==", "waiting_asman")
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as VehicleBooking))
    .sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
};

export const validateVehicleBooking = async (
  bookingId: string, 
  officerId: string, 
  officerName: string,
  vehicleNotes: string
) => {
  if (!db) return;
  const bookingRef = doc(db, "vehicle_bookings", bookingId);
  await updateDoc(bookingRef, {
    status: "waiting_asman",
    validatedBy: officerId,
    validatedByName: officerName,
    validationDate: Timestamp.now(),
    vehicleNotes: vehicleNotes
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
  
  if (reason) {
    updates.rejectReason = reason;
  }

  if (vehicleNotes) {
    updates.vehicleNotes = vehicleNotes;
  }
  
  await updateDoc(bookingRef, updates);
};

export const cancelVehicleBooking = async (bookingId: string) => {
  if (!db) return;
  const docRef = doc(db, "vehicle_bookings", bookingId);
  await deleteDoc(docRef); // Or set status to "cancelled"
};
