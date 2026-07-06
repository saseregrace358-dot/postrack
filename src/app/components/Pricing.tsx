import { initializePayment } from "../../api/payment";

const plans = [
  {
    name: "starter",
    title: "Starter",
    price: 5000,
    products: 100,
    employees: 3,
  },
  {
    name: "professional",
    title: "Professional",
    price: 15000,
    products: 1000,
    employees: 10,
  },
  {
    name: "enterprise",
    title: "Enterprise",
    price: 30000,
    products: "Unlimited",
    employees: "Unlimited",
  },
];

export default function Pricing() {
  const subscribe = async (plan: string) => {
    try {
      const res = await initializePayment(plan);

      window.location.href =
        res.data.authorization_url;
    } catch (err) {
      console.log(err);
      alert("Unable to initialize payment.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8">

      <h1 className="text-4xl font-bold text-center mb-10">
        Choose Your Plan
      </h1>

      <div className="grid md:grid-cols-3 gap-8">

        {plans.map((plan) => (

          <div
            key={plan.name}
            className="bg-white rounded-xl shadow-lg p-6"
          >

            <h2 className="text-2xl font-bold">
              {plan.title}
            </h2>

            <p className="text-3xl font-bold text-blue-600 mt-4">
              ₦{plan.price.toLocaleString()}
            </p>

            <div className="mt-6 space-y-3">

              <p>
                Products: {plan.products}
              </p>

              <p>
                Employees: {plan.employees}
              </p>

            </div>

            <button
              onClick={() => subscribe(plan.name)}
              className="w-full mt-8 bg-blue-600 text-white py-3 rounded-lg"
            >
              Subscribe
            </button>

          </div>

        ))}

      </div>

    </div>
  );
}