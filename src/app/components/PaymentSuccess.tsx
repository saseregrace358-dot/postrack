
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyPayment } from "../../api/payment";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Verifying your payment...");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const reference =
        searchParams.get("reference") ||
        searchParams.get("trxref");

      if (!reference) {
        setMessage("Payment reference is missing.");
        return;
      }

      try {
        const response = await verifyPayment(reference);

        if (cancelled) return;

        setMessage(
          response.data?.message || "Payment verified successfully."
        );
        setSuccess(true);
      } catch (error: any) {
        if (cancelled) return;

        setMessage(
          error?.response?.data?.detail ||
          "We couldn't verify your payment. If you were charged, contact support with your payment reference."
        );
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-xl border p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">
          {success ? "Payment Successful" : "Payment Status"}
        </h1>

        <p className="mb-6">{message}</p>

        {success && (
          <button
            onClick={() => navigate("/")}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white"
          >
            Continue to DGTrack POS
          </button>
        )}
      </section>
    </main>
  );
}
