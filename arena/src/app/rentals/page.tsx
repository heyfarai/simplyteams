"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useBasket } from "@/contexts/BasketContext";

type Facility = {
  id: string;
  name: string;
};

type Slot = {
  start: string;
  end: string;
  facilityId: string;
  facilityName: string;
};

export default function RentalsPage() {
  const [facilities, setFacilities] = React.useState<Facility[]>([]);
  const [selectedFacility, setSelectedFacility] = React.useState<string | null>(
    null
  );
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const { addItem } = useBasket();

  // Fetch facilities on mount
  React.useEffect(() => {
    fetch("/api/facilities")
      .then((res) => res.json())
      .then((data) => setFacilities(data.facilities || []));
  }, []);

  // Fetch slots when facility or date changes
  React.useEffect(() => {
    if (!selectedFacility || !date) return;
    setLoadingSlots(true);
    fetch(
      `/api/facilities/${selectedFacility}/available-slots?date=${format(
        date,
        "yyyy-MM-dd"
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        const facility = facilities.find((f) => f.id === selectedFacility);
        const slotsWithFacility = (data.slots || []).map((slot: Slot) => ({
          ...slot,
          facilityId: selectedFacility,
          facilityName: facility?.name || "Unknown Facility",
        }));
        setSlots(slotsWithFacility);
      })
      .finally(() => setLoadingSlots(false));
  }, [selectedFacility, date, facilities]);

  const handleAddToBasket = (slot: Slot) => {
    addItem({
      type: "rental",
      facilityId: slot.facilityId,
      facilityName: slot.facilityName,
      start: slot.start,
      end: slot.end,
      price: 50, // TODO: Get actual price from API
    });
  };

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Book a Facility</h1>
      {/* Facility Picker */}
      <div className="mb-4">
        <label className="block mb-1 font-medium">Select Facility</label>
        <select
          className="border rounded px-3 py-2 w-full"
          value={selectedFacility || ""}
          onChange={(e) => setSelectedFacility(e.target.value)}
        >
          <option value="">-- Choose a facility --</option>
          {facilities.map((f) => (
            <option
              key={f.id}
              value={f.id}
            >
              {f.name}
            </option>
          ))}
        </select>
      </div>
      {/* Date Picker */}
      <div className="mb-4">
        <label className="block mb-1 font-medium">Select Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className="w-[280px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto min-w-[320px] p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      {/* Available Slots */}
      <div className="mb-6">
        <label className="block mb-1 font-medium">Available Slots</label>
        {loadingSlots ? (
          <p>Loading slots...</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {slots.length === 0 && <span>No slots available.</span>}
            {slots.map((slot) => (
              <Button
                key={slot.start}
                variant="secondary"
                onClick={() => handleAddToBasket(slot)}
              >
                {format(new Date(slot.start), "h:mm a")} -{" "}
                {format(new Date(slot.end), "h:mm a")}
              </Button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
