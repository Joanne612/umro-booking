import { collection, addDoc, query, where, getDocs, Timestamp, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
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
}

export interface Room {
  id: string;
  name: string;
  type: "physical" | "online";
  description?: string;
}

export interface UserRole {
  uid: string;
  email: string;
  role: "admin" | "user" | "view";
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
export const updateUserRole = async (uid: string, newRole: "admin" | "user" | "view") => {
  if (!db) return;
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { role: newRole });
};

// ================= ROOMS =================

const defaultRooms: Room[] = [
  { id: 'physical_1', name: 'Ruang 1', type: 'physical' },
  { id: 'physical_2', name: 'Ruang 2', type: 'physical' },
  { id: 'physical_3', name: 'Ruang 3', type: 'physical' },
  { id: 'physical_4', name: 'Ruang 4', type: 'physical' },
  { id: 'physical_5', name: 'Ruang 5', type: 'physical' },
  { id: 'online_1', name: 'Room Zoom 1', type: 'online' },
  { id: 'online_2', name: 'Room Zoom 2', type: 'online' },
  { id: 'online_3', name: 'Room Zoom 3', type: 'online' },
  { id: 'online_4', name: 'Room Zoom 4', type: 'online' },
];

export const initAndGetRooms = async (): Promise<Room[]> => {
  if (!db) return defaultRooms;
  const roomsRef = collection(db, "rooms");
  const snap = await getDocs(roomsRef);
  
  if (snap.empty) {
    // Initialize default rooms
    const promises = defaultRooms.map(room => setDoc(doc(db!, "rooms", room.id), room));
    await Promise.all(promises);
    return defaultRooms;
  }
  
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

export const subscribeToBookings = (date: string, callback: (bookings: BookingData[]) => void) => {
  if (!db) return () => {};
  
  const q = query(collection(db, "bookings"), where("date", "==", date), where("status", "==", "active"));
  
  return onSnapshot(q, (snapshot) => {
    const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingData));
    callback(bookings);
  });
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
