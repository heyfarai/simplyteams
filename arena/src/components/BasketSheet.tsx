"use client";
import { useBasket } from "@/contexts/BasketContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { BookingBasket } from "@/components/BookingBasket";
import { toast } from "sonner";
import { PaymentForm } from "@/components/PaymentForm";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

type BasketItem = {
  id: string;
  type: "rental" | "program" | "trainingPackage" | "dropIn";
  facilityId?: string;
  facilityName?: string;
  programId?: string;
  programName?: string;
  start?: string;
  end?: string;
  price: number;
  participantId?: string | null;
  participantName?: string | null;
  sessionCount?: number;
  trainingPackageName?: string;
  trainingPackageId?: string;
  sessionDate?: string;
};

type Participant = { id: string; name: string };

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export function BasketSheet() {
  const { items, removeItem, getTotal, isOpen, setIsOpen, addItem, clear } =
    useBasket();
  const { user, loading } = useAuth();
  const [dependents, setDependents] = useState<Participant[]>([]);
  const [addDepFor, setAddDepFor] = useState<string | null>(null); // program item id
  const [newDepName, setNewDepName] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Fetch real dependents for the logged-in user
  useEffect(() => {
    if (!user) {
      setDependents([]);
      return;
    }
    fetch("/api/account/dependents")
      .then((res) => res.json())
      .then((data) => setDependents(data.dependents || []))
      .catch(() => setDependents([]));
  }, [user]);

  const allParticipants = user ? [user, ...dependents] : [];

  const handleParticipantChange = (item: BasketItem, participantId: string) => {
    const participant = allParticipants.find((p) => p.id === participantId);
    if (participant) {
      removeItem(item.id);
      addItem({
        ...item,
        id: item.id,
        participantId: participant.id,
        participantName: participant.name,
      });
    }
  };

  const handleAddDependent = async (item: BasketItem) => {
    if (newDepName.trim()) {
      try {
        const res = await fetch("/api/account/dependents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newDepName.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to add dependent");
        const newDep = data.dependent;
        // Refetch dependents from backend for consistency
        const depRes = await fetch("/api/account/dependents");
        const depData = await depRes.json();
        setDependents(depData.dependents || []);
        setAddDepFor(null);
        setNewDepName("");
        // Set this new dependent as the participant for this program
        removeItem(item.id);
        addItem({
          ...item,
          id: item.id,
          participantId: newDep.id,
          participantName: newDep.name,
        });
        toast.success("Participant added!");
      } catch (err: unknown) {
        if (err instanceof Error) {
          toast.error(err.message || "Failed to add dependent");
        } else {
          toast.error("Failed to add dependent");
        }
      }
    }
  };

  // Inline validation: check if any program is missing a participant
  const missingParticipant = items.some(
    (item) =>
      (item.type === "program" || item.type === "dropIn") && !item.participantId
  );

  const renderBasketItem = (item: BasketItem) => {
    const showAddPerson = addDepFor === item.id;
    // Determine dropdown options
    const participantOptions = [
      { id: user.id, name: user.name },
      ...dependents,
      { id: "__add_new__", name: "Another person..." },
    ];
    // Determine selected value
    let selectedParticipantId =
      item.participantId || (dependents.length === 0 ? user.id : "");

    if ((item.type === "program" || item.type === "dropIn") && user) {
      return (
        <div className="flex flex-row justify-between w-full px-4 pb-4">
          <div className="">
            <div className="flex justify-between">
              <div>
                <b>{item.programName}</b>{" "}
                {item.type === "dropIn" && item.sessionDate && (
                  <span className="">on {formatDate(item.sessionDate)}</span>
                )}{" "}
                <span className="text-xs text-muted-foreground">
                  {item.type === "program"
                    ? `(${item.facilityName})`
                    : "(Drop-in)"}
                </span>
              </div>
            </div>
            {!item.participantId && (
              <div className="text-xs text-red-600 mt-1">
                Select a participant
              </div>
            )}
            <select
              className="w-full border rounded px-2 py-1 text-xs mt-1"
              value={selectedParticipantId}
              onChange={(e) => {
                if (e.target.value === "__add_new__") {
                  setAddDepFor(item.id);
                  setNewDepName("");
                } else {
                  handleParticipantChange(item, e.target.value);
                  setAddDepFor(null);
                }
              }}
            >
              <option
                value=""
                disabled
              >
                Select participant
              </option>
              {participantOptions.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                >
                  {p.name}
                </option>
              ))}
            </select>
            {showAddPerson && (
              <div className="mt-2 flex gap-2 justify-items-end">
                <input
                  className="w-full border rounded px-2 py-1 text-xs"
                  placeholder="Participant name"
                  value={newDepName}
                  onChange={(e) => setNewDepName(e.target.value)}
                  autoFocus
                />
                <Button
                  size="sm"
                  className="text-xs"
                  onClick={() => handleAddDependent(item)}
                  disabled={!newDepName.trim()}
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => {
                    setAddDepFor(null);
                    setNewDepName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
          <div className="text-m text-primary font-semibold mt-1">
            ${item.price}
          </div>
        </div>
      );
    }
    if (item.type === "trainingPackage") {
      return (
        <div className="flex flex-row justify-between w-full px-4 pb-4">
          <div className="">
            <div className="flex w-full justify-between">
              <div>
                <div className="font-medium">{item.trainingPackageName}</div>
                <div className="">
                  {item.sessionCount} 1:1 Training Session
                  {item.sessionCount && item.sessionCount > 1 ? "s" : ""}
                </div>
              </div>
              <div className="text-m text-primary font-semibold">
                ${item.price}
              </div>
            </div>
          </div>
        </div>
      );
    }
    // Not a program or not authed
    return (
      <div>
        <div className="font-medium">
          {item.type === "rental" ? item.facilityName : item.programName}
        </div>
        <div className="text-xs text-muted-foreground">
          {item.start} - {item.end}
        </div>
      </div>
    );
  };

  const handleRemove = (item: BasketItem) => {
    removeItem(item.id);
  };

  const handleCheckout = async () => {
    if (!user) {
      setIsOpen(false);
      window.location.href =
        "/login?redirect_url=" + encodeURIComponent(window.location.pathname);
      return;
    }
    // Check all programs have a participant
    const missing = items.filter(
      (item) => item.type === "program" && !item.participantId
    );
    if (missing.length > 0) {
      toast.error(
        "Please select a participant for all programs before proceeding to checkout."
      );
      setIsOpen(true);
      return;
    }

    try {
      // 1. Create enrollments/rentals
      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      type BookingResult = {
        enrollment?: { id: string };
        rental?: { id: string };
      };
      const bookingData: { results?: BookingResult[] } =
        await bookingRes.json();
      // 2. Collect enrollment, rental, and training package IDs
      const enrollmentIds = (bookingData.results || [])
        .filter((r) => r.enrollment)
        .map((r) => r.enrollment!.id);
      const rentalIds = (bookingData.results || [])
        .filter((r) => r.rental)
        .map((r) => r.rental!.id);
      const trainingPackageIds = items
        .filter((item) => item.type === "trainingPackage")
        .map((item) => item.trainingPackageId)
        .filter(Boolean);
      // 3. Calculate total
      const amount = Math.round(getTotal() * 100); // Stripe expects cents
      // 4. Create PaymentIntent with metadata
      const response = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          metadata: {
            userId: user.id,
            enrollmentIds: JSON.stringify(enrollmentIds),
            rentalIds: JSON.stringify(rentalIds),
            trainingPackageIds: JSON.stringify(trainingPackageIds),
          },
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create payment intent");
      }
      const resJson = await response.json();
      console.log("Stripe intent response:", resJson);
      const { clientSecret } = resJson;
      setClientSecret(clientSecret);
      setShowPaymentForm(true);
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create payment"
      );
    }
  };

  useEffect(() => {
    if (showPaymentForm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showPaymentForm]);

  return (
    <>
      <BookingBasket
        items={items}
        renderItem={renderBasketItem}
        onRemove={handleRemove}
        getTotal={getTotal}
        onCheckout={handleCheckout}
        title="Booking Basket"
        description="Review your bookings before checkout"
        open={isOpen}
        onOpenChange={setIsOpen}
        isLoading={loading}
        checkoutLabel="Proceed to Checkout"
        trigger={null}
        checkoutDisabled={missingParticipant}
      />
      {showPaymentForm && clientSecret && (
        <Elements stripe={stripePromise}>
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded shadow-lg max-w-md w-full min-h-[200px] flex flex-col justify-center">
              <PaymentForm
                clientSecret={clientSecret}
                onSuccess={() => {
                  setShowPaymentForm(false);
                  clear();
                  setIsOpen(false);
                  toast.success("Payment successful! Bookings created.");
                  // Optionally, call your booking API here if needed
                }}
                onError={(msg: string) => {
                  toast.error(msg);
                }}
              />
              <button
                className="mt-4 text-sm text-blue-600 underline"
                onClick={() => setShowPaymentForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </Elements>
      )}
    </>
  );
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString();
}
