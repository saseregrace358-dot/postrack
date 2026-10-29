
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyPayment } from "../../api/payment";

type PaymentStatus = "verifying" | "success" | "failed";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [message, setMessage] = useState(
    "Verifying your payment..."
  );
  const [status, setStatus] = useState<PaymentStatus>("verifying");

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const reference =
        searchParams.get("reference") ||
        searchParams.get("trxref");

      if (!reference) {
        setMessage("Payment reference is missing.");
        setStatus("failed");
        return;
      }

      try {
        const response = await verifyPayment(reference);

        if (cancelled) return;

        setMessage(
          response.data?.message ||
            "Payment verified successfully."
        );
        setStatus("success");
      } catch (error: any) {
        if (cancelled) return;

        setMessage(
          error?.response?.data?.detail ||
            "We couldn't confirm your payment. If you were charged, contact support with your payment reference before trying again."
        );
        setStatus("failed");
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
          {status === "verifying"
            ? "Verifying Payment"
            : status === "success"
              ? "Payment Successful"
              : "Payment Could Not Be Confirmed"}
        </h1>

        <p className="mb-6">{message}</p>

        {status === "success" ? (
          <button
            onClick={() => navigate("/")}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white"
          >
            Continue to DGTrack POS
          </button>
        ) : status === "failed" ? (
          <button
            onClick={() => navigate("/pricing")}
            className="rounded-lg border px-6 py-3"
          >
            Return to Pricing
          </button>
        ) : null}
      </section>
    </main>
  );
}
