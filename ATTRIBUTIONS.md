This Figma Make file includes components from [shadcn/ui](https://ui.shadcn.com/) used under [MIT license](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md).

This Figma Make file includes photos from [Unsplash](https://unsplash.com) used under [license](https://unsplash.com/license).


  // 🔥 normalize old + new data
    const safeSales: Sale[] = savedSales.map((sale: any) => {
      const payments: Payment[] = sale.payments ?? [];

      const totalPaid =
        payments.length > 0
          ? payments.reduce((s, p) => s + p.amount, 0)
          : sale.amountPaid ?? 0;

      return {
        ...sale,
        payments,
        balance: sale.total - totalPaid,
        status:
          totalPaid >= sale.total ? "PAID" : "debt",
      };
    });

    setSales(safeSales);
  };

  // 🔥 ADD PAYMENT FUNCTION (CORE FEATURE)
  const addPayment = (saleId: string, amount: number) => {
    const updated = sales.map((sale) => {
      if (sale.id !== saleId) return sale;

      const payments = sale.payments ?? [];

      const newPayment: Payment = {
        amount,
        date: new Date().toISOString(),
        method: sale.paymentMethod,
      };

      const updatedPayments = [...payments, newPayment];

      const totalPaid = updatedPayments.reduce(
        (s, p) => s + p.amount,
        0
      );

      return {
        ...sale,
        payments: updatedPayments,
        balance: sale.total - totalPaid,
        status:
          totalPaid >= sale.total
            ? "PAID"
            : "DEBT",
      };
    });

    setSales(updated);
    localStorage.setItem("sales", JSON.stringify(updated));

    // refresh selected sale
    const refreshed = updated.find(
      (s) => s.id === saleId
    );
    if (refreshed) setSelectedSale(refreshed);

    setPayAmount("");
  };
 {/* RECEIPT MODAL (UPDATED ONLY WHERE NEEDED) */}
      {selectedSale && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedSale(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold mb-2">
              Receipt
            </h3>

            {/* ITEMS */}
            {selectedSale.items.map((item, i) => (
              <div
                key={i}
                className="flex justify-between text-sm"
              >
                <span>{item.name}</span>
                <span>
                  ₦{item.price * item.quantity}
                </span>
              </div>
            ))}

            {/* PAYMENTS */}
            <div className="border-t mt-2 pt-2">
              <p className="font-semibold text-sm">
                Payments
              </p>

              {selectedPayments.map((p, i) => (
                <div
                  key={i}
                  className="flex justify-between text-xs"
                >
                  <span>{formatDate(p.date)}</span>
                  <span>₦{p.amount}</span>
                </div>
              ))}
            </div>

            {/* ADD PAYMENT (ONLY IF DEBT) */}
            {selectedSale.status === "DEBT" && (
              <div className="border-t mt-3 pt-3">
                <input
                  type="number"
                  placeholder="Enter payment"
                  value={payAmount}
                  onChange={(e) =>
                    setPayAmount(e.target.value)
                  }
                  className="w-full p-2 border rounded"
                />

                <button
                  onClick={() =>
                    addPayment(
                      selectedSale.id,
                      Number(payAmount)
                    )
                  }
                  className="w-full mt-2 bg-blue-600 text-white p-2 rounded"
                >
                  Add Payment
                </button>
              </div>
            )}

            {/* TOTALS */}
            <div className="border-t mt-3 pt-2 text-sm">
              <p>Total: ₦{selectedSale.total}</p>
              <p>Paid: ₦{totalPaid}</p>
              <p>Balance: ₦{balance}</p>
              <p>Status: {selectedSale.status}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}