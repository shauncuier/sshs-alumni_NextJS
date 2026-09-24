import { sampleEvents, EventItem } from "@/lib/data";

export interface EventPackage {
  name: string;
  price: string;
  description: string;
  includes: string[];
  isPopular?: boolean;
}

export interface AgendaItem {
  time: string;
  activity: string;
}

export interface EventAttendee {
  id: string;
  eventId: string;
  name: string;
  batch: string;
  email: string;
  phone: string;
  packageName: string;
  extraAdults: number;
  childrenBelow12: number;
  totalFee: number;
  tshirtSize: "S" | "M" | "L" | "XL" | "XXL";
  mealChoice: "Traditional Mezban Beef" | "Special Chicken Roast" | "Vegetarian Delight";
  paymentMethod: "bKash" | "Nagad" | "Bank" | "Secretariat Cash";
  trxId?: string;
  status: "CONFIRMED" | "CHECKED_IN" | "PENDING" | "CANCELLED";
  registeredAt: string;
}

export const sampleAttendees: EventAttendee[] = [
  {
    id: "att-001",
    eventId: "evt-golden-jubilee-50",
    name: "Engr. Tanvir Ahmed",
    batch: "1994",
    email: "tanvir.ahmed94@gmail.com",
    phone: "+880 1711-234567",
    packageName: "Alumnus + Spouse / Extra Guest",
    extraAdults: 1,
    childrenBelow12: 0,
    totalFee: 1500,
    tshirtSize: "XL",
    mealChoice: "Traditional Mezban Beef",
    paymentMethod: "bKash",
    trxId: "BK99281734",
    status: "CONFIRMED",
    registeredAt: "2026-09-20 10:30 AM",
  },
  {
    id: "att-002",
    eventId: "evt-golden-jubilee-50",
    name: "Dr. Farhana Yasmin",
    batch: "2002",
    email: "farhana.cmc@yahoo.com",
    phone: "+880 1819-345678",
    packageName: "Family (Alumnus + Spouse + 1 Child < 12yr)",
    extraAdults: 1,
    childrenBelow12: 1,
    totalFee: 1800,
    tshirtSize: "M",
    mealChoice: "Special Chicken Roast",
    paymentMethod: "Nagad",
    trxId: "NG88371920",
    status: "CHECKED_IN",
    registeredAt: "2026-09-21 02:15 PM",
  },
  {
    id: "att-003",
    eventId: "evt-golden-jubilee-50",
    name: "Md. Jashedul Islam",
    batch: "2008",
    email: "jashe@example.com",
    phone: "+880 1819-987654",
    packageName: "General Alumnus Delegate",
    extraAdults: 0,
    childrenBelow12: 0,
    totalFee: 1000,
    tshirtSize: "L",
    mealChoice: "Traditional Mezban Beef",
    paymentMethod: "bKash",
    trxId: "BK10293847",
    status: "CONFIRMED",
    registeredAt: "2026-09-22 09:40 AM",
  },
  {
    id: "att-004",
    eventId: "evt-golden-jubilee-50",
    name: "Shahidul Alam Chowdhury",
    batch: "1982",
    email: "shahidul.ctg@gmail.com",
    phone: "+880 1715-887766",
    packageName: "Golden Patron & Sponsor",
    extraAdults: 1,
    childrenBelow12: 0,
    totalFee: 5000,
    tshirtSize: "XXL",
    mealChoice: "Traditional Mezban Beef",
    paymentMethod: "Bank",
    trxId: "EBL-DEP-9988",
    status: "CHECKED_IN",
    registeredAt: "2026-09-18 11:20 AM",
  },
  {
    id: "att-005",
    eventId: "evt-golden-jubilee-50",
    name: "Mahmudur Rahman",
    batch: "2015",
    email: "mahmud.buet@gmail.com",
    phone: "+880 1612-445566",
    packageName: "General Alumnus Delegate",
    extraAdults: 0,
    childrenBelow12: 0,
    totalFee: 1000,
    tshirtSize: "M",
    mealChoice: "Vegetarian Delight",
    paymentMethod: "bKash",
    trxId: "BK77665544",
    status: "CONFIRMED",
    registeredAt: "2026-09-23 04:50 PM",
  },
  {
    id: "att-006",
    eventId: "evt-golden-jubilee-50",
    name: "Barrister Anisur Rahman",
    batch: "1989",
    email: "anisur.law@supremecourt.bd",
    phone: "+880 1713-112233",
    packageName: "Golden Patron & Sponsor",
    extraAdults: 2,
    childrenBelow12: 1,
    totalFee: 5000,
    tshirtSize: "XL",
    mealChoice: "Traditional Mezban Beef",
    paymentMethod: "Secretariat Cash",
    trxId: "OFFICE-REC-104",
    status: "CONFIRMED",
    registeredAt: "2026-09-24 01:10 PM",
  },
];

const EVENTS_STORAGE_KEY = "sshs_events_v2";
const ATTENDEES_STORAGE_KEY = "sshs_attendees_v2";

export function getStoredEvents(): EventItem[] {
  if (typeof window === "undefined") {
    return sampleEvents;
  }
  try {
    const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(sampleEvents));
      return sampleEvents;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : sampleEvents;
  } catch (err) {
    console.warn("Error reading stored events, using defaults:", err);
    return sampleEvents;
  }
}

export function getStoredEventById(id: string): EventItem | undefined {
  const events = getStoredEvents();
  return events.find((e) => e.id === id);
}

export function saveStoredEvent(event: EventItem): EventItem[] {
  const current = getStoredEvents();
  const exists = current.some((e) => e.id === event.id);
  let updated: EventItem[];

  if (exists) {
    updated = current.map((e) => (e.id === event.id ? { ...e, ...event } : e));
  } else {
    updated = [event, ...current];
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed saving event to storage:", err);
    }
  }

  return updated;
}

export function deleteStoredEvent(id: string): EventItem[] {
  const current = getStoredEvents();
  const updated = current.filter((e) => e.id !== id);

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed deleting event from storage:", err);
    }
  }

  return updated;
}

export function getStoredAttendees(eventId?: string): EventAttendee[] {
  if (typeof window === "undefined") {
    return eventId ? sampleAttendees.filter((a) => a.eventId === eventId) : sampleAttendees;
  }

  try {
    const raw = localStorage.getItem(ATTENDEES_STORAGE_KEY);
    let list: EventAttendee[] = sampleAttendees;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    } else {
      localStorage.setItem(ATTENDEES_STORAGE_KEY, JSON.stringify(sampleAttendees));
    }

    return eventId ? list.filter((a) => a.eventId === eventId) : list;
  } catch (err) {
    console.warn("Error reading attendees, using sample defaults:", err);
    return eventId ? sampleAttendees.filter((a) => a.eventId === eventId) : sampleAttendees;
  }
}

export function saveStoredAttendee(attendee: EventAttendee): EventAttendee[] {
  const all = getStoredAttendees();
  const exists = all.some((a) => a.id === attendee.id);
  let updated: EventAttendee[];

  if (exists) {
    updated = all.map((a) => (a.id === attendee.id ? attendee : a));
  } else {
    updated = [attendee, ...all];
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(ATTENDEES_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed saving attendee to storage:", err);
    }
  }

  return updated;
}

export function updateAttendeeStatus(
  attendeeId: string,
  status: EventAttendee["status"]
): EventAttendee[] {
  const all = getStoredAttendees();
  const updated = all.map((a) => (a.id === attendeeId ? { ...a, status } : a));

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(ATTENDEES_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed updating attendee status:", err);
    }
  }

  return updated;
}

export function deleteStoredAttendee(attendeeId: string): EventAttendee[] {
  const all = getStoredAttendees();
  const updated = all.filter((a) => a.id !== attendeeId);

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(ATTENDEES_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed deleting attendee:", err);
    }
  }

  return updated;
}
