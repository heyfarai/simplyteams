"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

type Enrollment = {
  id: string;
  program: { id: string; name: string; startDate: string; endDate: string };
  participant: { id: string; name: string } | null;
  dependent: { id: string; name: string } | null;
  session?: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
  } | null;
  status: string;
  enrolledAt: string;
  participantType?: string;
  dependentName?: string;
};
type Rental = {
  id: string;
  facility: { id: string; name: string };
  start: string;
  end: string;
  status: string;
};
type Dependent = {
  id: string;
  name: string;
  enrollments: Enrollment[];
};

export default function AccountPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user bookings (enrollments and rentals)
  useEffect(() => {
    async function fetchBookings() {
      setLoading(true);
      const res = await fetch("/api/account/bookings");
      if (res.ok) {
        const data = await res.json();
        setEnrollments(data.enrollments || []);
        setRentals(data.rentals || []);
      }
      setLoading(false);
    }
    fetchBookings();
  }, []);

  // Fetch dependents and their enrollments from /api/account/dependents
  useEffect(() => {
    async function fetchDependents() {
      const res = await fetch("/api/account/dependents");
      if (res.ok) {
        const data = await res.json();
        setDependents(data.dependents || []);
      }
    }
    fetchDependents();
  }, []);

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Account</h1>
      <Card className="mb-8">
        <CardContent className="p-4">
          <div className="mb-2 font-semibold">{user?.name}</div>
          <div className="text-sm text-muted-foreground">{user?.email}</div>
        </CardContent>
      </Card>
      <h2 className="text-xl font-semibold mb-2">Booked Programs</h2>
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : enrollments.length === 0 ? (
        <p className="text-muted-foreground">No bookings yet.</p>
      ) : (
        <div className="space-y-4">
          {enrollments.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="p-4">
                <CardTitle>{booking.program.name}</CardTitle>
                <div className="text-sm text-muted-foreground mb-1">
                  {booking.session ? (
                    <>
                      <span className="font-semibold">Drop-in Session:</span>{" "}
                      {formatDate(booking.session.date)}{" "}
                      {formatTime(booking.session.startTime)} -{" "}
                      {formatTime(booking.session.endTime)}
                    </>
                  ) : (
                    <>
                      {new Date(booking.program.startDate).toLocaleDateString()}{" "}
                      - {new Date(booking.program.endDate).toLocaleDateString()}
                    </>
                  )}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Participant:</span>{" "}
                  {booking.participantType === "dependent"
                    ? booking.dependentName || booking.dependent?.name
                    : booking.participant?.name}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Status: {booking.status}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Dependents and their bookings (from /api/account/dependents) */}
      {dependents.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Dependents</h2>
          {dependents.map((dep) => (
            <div
              key={dep.id}
              className="mb-6"
            >
              <div className="font-semibold mb-1">{dep.name}</div>
              {dep.enrollments && dep.enrollments.length === 0 ? (
                <div className="text-muted-foreground text-sm mb-2">
                  No bookings for this dependent.
                </div>
              ) : (
                <div className="space-y-2">
                  {dep.enrollments?.map((booking) => (
                    <Card key={booking.id}>
                      <CardContent className="p-4">
                        <CardTitle>{booking.program.name}</CardTitle>
                        <div className="text-sm text-muted-foreground mb-1">
                          {booking.session ? (
                            <>
                              <span className="font-semibold">
                                Drop-in Session:
                              </span>{" "}
                              {formatDate(booking.session.date)}{" "}
                              {formatTime(booking.session.startTime)} -{" "}
                              {formatTime(booking.session.endTime)}
                            </>
                          ) : (
                            <>
                              {new Date(
                                booking.program.startDate
                              ).toLocaleDateString()}{" "}
                              -{" "}
                              {new Date(
                                booking.program.endDate
                              ).toLocaleDateString()}
                            </>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Status: {booking.status}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <h2 className="text-xl font-semibold mb-2 mt-8">Facility Rentals</h2>
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : rentals.length === 0 ? (
        <p className="text-muted-foreground">No rentals yet.</p>
      ) : (
        <div className="space-y-4">
          {rentals.map((rental) => (
            <Card key={rental.id}>
              <CardContent className="p-4">
                <CardTitle>{rental.facility.name}</CardTitle>
                <div className="text-sm text-muted-foreground mb-1">
                  {new Date(rental.start).toLocaleString()} -{" "}
                  {new Date(rental.end).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Status: {rental.status}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString();
}
function formatTime(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
