"use client";

import React, { useRef, useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { BookingData } from "@/lib/firebase/firestore";
import styles from "../app/dashboard/dashboard.module.css";

interface CalendarViewProps {
  bookings: BookingData[];
  onDateClick: (dateStr: string, timeStr?: string) => void;
  onEventClick: (booking: BookingData) => void;
  onRangeChange: (start: string, end: string) => void;
  selectedRoomId: string;
  roomColors: Record<string, string>;
}

export default function CalendarView({ 
  bookings, 
  onDateClick, 
  onEventClick, 
  onRangeChange,
  selectedRoomId,
  roomColors 
}: CalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [initialView, setInitialView] = useState<string | null>(null);

  useEffect(() => {
    // Detect mobile and set appropriate view
    if (window.innerWidth < 768) {
      setInitialView("timeGridDay");
    } else {
      setInitialView("dayGridMonth");
    }
  }, []);

  // Filter bookings based on selectedRoomId
  const filteredBookings = selectedRoomId === "all" 
    ? bookings 
    : bookings.filter(b => b.roomId === selectedRoomId);

  // Map bookings to FullCalendar events
  const events = filteredBookings.map(b => ({
    id: b.id,
    title: b.title,
    start: `${b.date}T${b.startTime}:00`,
    end: `${b.date}T${b.endTime}:00`,
    backgroundColor: roomColors[b.roomId] || "var(--primary)",
    borderColor: roomColors[b.roomId] || "var(--primary)",
    extendedProps: { ...b }
  }));

  const handleDateClick = (arg: any) => {
    // If it's a timed view, we can extract the time
    const dateStr = arg.dateStr.split('T')[0];
    const timeStr = arg.dateStr.includes('T') ? arg.dateStr.split('T')[1].substring(0, 5) : undefined;
    onDateClick(dateStr, timeStr);
  };

  const handleEventClick = (arg: any) => {
    const booking = arg.event.extendedProps as BookingData;
    onEventClick(booking);
  };

  if (!initialView) return <div className={styles.calendarContainer} style={{ height: '700px' }}>Memuat Kalender...</div>;

  return (
    <div className={styles.calendarContainer}>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={initialView}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay"
        }}
        buttonText={{
          today: 'Hari Ini',
          month: 'Bulan',
          week: 'Minggu',
          day: 'Hari'
        }}
        events={events}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        datesSet={(arg) => onRangeChange(arg.startStr.split('T')[0], arg.endStr.split('T')[0])}
        height="700px"
        locale="id"
        firstDay={1} // Start on Monday
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        allDaySlot={false}
        nowIndicator={true}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          meridiem: false,
          hour12: false
        }}
      />
      <style jsx global>{`
        .fc {
          --fc-button-bg-color: var(--primary);
          --fc-button-border-color: var(--primary);
          --fc-button-hover-bg-color: var(--primary-hover);
          --fc-button-hover-border-color: var(--primary-hover);
          --fc-button-active-bg-color: var(--primary-hover);
          --fc-button-active-border-color: var(--primary-hover);
          --fc-border-color: var(--border);
          font-family: inherit;
        }
        .fc-toolbar-title {
          font-size: 1.25rem !important;
          font-weight: 700 !important;
          color: var(--primary);
          text-transform: capitalize;
        }
        .fc-col-header-cell {
          background-color: var(--background);
          padding: 8px 0 !important;
          font-size: 0.85rem;
        }
        .fc-timegrid-slot-label {
          font-size: 0.75rem;
        }
        .fc-event {
          cursor: pointer;
          transition: transform 0.1s;
          padding: 2px 4px;
          border-radius: 4px;
        }
        .fc-event:hover {
          transform: scale(1.02);
          z-index: 5;
        }

        @media (max-width: 768px) {
          .fc-header-toolbar {
            flex-direction: column;
            gap: 1rem;
          }
          .fc-toolbar-title {
            font-size: 1.1rem !important;
          }
          .fc-button {
            padding: 0.4rem 0.6rem !important;
            font-size: 0.8rem !important;
          }
        }

        @media (max-width: 480px) {
          .fc-toolbar-chunk:nth-child(3) {
            display: flex;
            justify-content: center;
            width: 100%;
          }
          .fc-header-toolbar {
            margin-bottom: 2rem !important;
          }
          .fc-toolbar-title {
            margin: 0.5rem 0;
          }
          /* Fix for tiny overlaps in month view on small screens */
          .fc-daygrid-event {
             white-space: normal !important;
             font-size: 0.7rem !important;
          }
        }
      `}</style>
    </div>
  );
}
