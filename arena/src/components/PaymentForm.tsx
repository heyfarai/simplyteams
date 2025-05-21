import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { useState } from "react";

type PaymentFormProps = {
  clientSecret: string;
  onSuccess?: () => void;
  onError?: (msg: string) => void;
};

export function PaymentForm({
  clientSecret,
  onSuccess,
  onError,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    const { error, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: { card: elements.getElement(CardElement)! },
      }
    );

    setLoading(false);

    if (error) {
      onError?.(error.message || "Payment failed");
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement options={{ hidePostalCode: true }} />
      <button
        type="submit"
        disabled={!stripe || loading}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        {loading ? "Processing..." : "Pay"}
      </button>
    </form>
  );
}
