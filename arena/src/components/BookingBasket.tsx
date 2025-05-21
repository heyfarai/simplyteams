"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart } from "lucide-react";

export type BookingBasketProps<T> = {
  items?: T[];
  renderItem: (item: T) => React.ReactNode;
  onRemove: (item: T) => void;
  getTotal: (items: T[]) => number;
  onCheckout: () => Promise<void>;
  title?: string;
  description?: string;
  emptyMessage?: string;
  checkoutLabel?: string;
  isLoading?: boolean;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  checkoutDisabled?: boolean;
};

export function BookingBasket<T>({
  items = [],
  renderItem,
  onRemove,
  getTotal,
  onCheckout,
  title = "Booking Basket",
  description = "Review your selections before proceeding to checkout",
  emptyMessage = "Your basket is empty",
  checkoutLabel = "Proceed to Checkout",
  isLoading = false,
  trigger,
  open,
  onOpenChange,
  checkoutDisabled = false,
}: BookingBasketProps<T>) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const handleCheckout = async () => {
    if (!isSignedIn) {
      router.push(
        "/sign-in?redirect_url=" + encodeURIComponent(window.location.pathname)
      );
      return;
    }

    try {
      setIsCheckingOut(true);
      await onCheckout();
      setIsOpen(false); // Close the sheet after successful checkout
    } catch (error) {
      console.error("Checkout failed:", error);
      // You might want to show a toast notification here
    } finally {
      setIsCheckingOut(false);
    }
  };

  const defaultTrigger = (
    <Button
      variant="outline"
      size="icon"
      className="relative"
    >
      <ShoppingCart className="hiddenh-5 w-5" />
      {items.length > 0 && (
        <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
          {items.length}
        </span>
      )}
    </Button>
  );

  return (
    <Sheet
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SheetTrigger asChild>{trigger || defaultTrigger}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="flex flex-col h-[calc(100vh-8rem)]">
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col w-full p-2 bg-muted/70 rounded-lg"
                >
                  <div className="flex items-end justify-end w-full">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(item)}
                      className="text-destructive hover:text-destructive/90"
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="">{renderItem(item)}</div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total:</span>
                <span>${getTotal(items).toFixed(2)}</span>
              </div>

              <Button
                className="w-full"
                onClick={handleCheckout}
                disabled={
                  isCheckingOut || items.length === 0 || checkoutDisabled
                }
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  checkoutLabel
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default BookingBasket;
