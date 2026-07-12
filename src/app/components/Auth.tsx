import { loginUser, registerUser } from "../../api/auth";
import { useState } from "react";
import { motion } from "motion/react";
import { Mail, Lock, User, Eye, EyeOff, Store } from "lucide-react";
import {
  forgotPassword,
  verifyResetCode,
  resetPassword,
} from "../../api/auth";
import toast from "react-hot-toast";

interface AuthProps {
  onLogin: (token: string) => void;
}
import { employeeLogin } from "../../api/employee";


export function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [resetCode, setResetCode] = useState("");
const [newPassword, setNewPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

const [verifyingCode, setVerifyingCode] = useState(false);
const [savingPassword, setSavingPassword] = useState(false);

 const [showForgotModal, setShowForgotModal] = useState(false);
 const [resetStep, setResetStep] = useState<
  "email" | "code" | "password"
>("email");
 const handleVerifyCode = async () => {
  try {
    setVerifyingCode(true);

    await verifyResetCode(resetEmail, resetCode);

    toast.success("Code verified.");

    setResetStep("password");
    

  } catch (err: any) {
    alert(
      err.response?.data?.detail ||
      "Invalid verification code."
    );
  } finally {
    setVerifyingCode(false);
  }
};
const handleResetPassword = async () => {
  if (newPassword !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  try {
    setSavingPassword(true);

    await resetPassword(
      resetEmail,
      resetCode,
      newPassword
    );

    toast.success("Password changed successfully.");

setShowForgotModal(false);

setResetStep("email");

setResetEmail("");
setResetCode("");
setNewPassword("");
setConfirmPassword("");

  } catch (err: any) {
    alert(
      err.response?.data?.detail ||
      "Unable to reset password."
    );
  } finally {
    setSavingPassword(false);
  }
};
  const [formData, setFormData] = useState({
  name: "",
  email: "",
  password: "",
  business_name: "",
});
  const [loading, setLoading] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (loading) return;

  setLoading(true);

  try {
    if (isLogin) {
      try {
        const res = await loginUser({
          email: formData.email,
          password: formData.password,
        });

        localStorage.setItem(
          "token",
          res.data.access_token
        );

        localStorage.setItem(
            "user",
            JSON.stringify({
              ...res.data.user,
              role: "owner",
              permissions: ["all"]
            })
          );

        onLogin(res.data.access_token);
      } catch {

        const employeeRes = await employeeLogin({
          name: formData.email,
          password: formData.password,
        });

        localStorage.setItem(
          "token",
          employeeRes.data.access_token
        );

        localStorage.setItem(
        "user",
        JSON.stringify({
          role: "employee",
          permissions: employeeRes.data.user.permissions,
          name: employeeRes.data.user.name,
          id: employeeRes.data.user.id
        })
      );

localStorage.setItem("role", "employee");

        onLogin(
          employeeRes.data.access_token
        );
      }

      return;
    }

    await registerUser({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      business_name: formData.business_name,
    });
    

    const res = await loginUser({
      email: formData.email,
      password: formData.password,
    });

    if (rememberMe) {
      localStorage.setItem(
        "token",
        res.data.access_token
      );
    } else {
      sessionStorage.setItem(
        "token",
        res.data.access_token
      );
    }

    localStorage.setItem(
      "role",
      res.data.user?.role || "owner"
    );
localStorage.setItem(
  "user",
   JSON.stringify({
    ...res.data.user,
    role: "owner",
    permissions: ["all"],
  })
);

    onLogin(res.data.access_token);
  } catch (err: any) {
    console.log(err);

    alert(
      err?.response?.data?.detail ||
      "Login failed"
    );
  } finally {
    setLoading(false);
  }
};
const [resetEmail, setResetEmail] = useState("");
const [sendingReset, setSendingReset] = useState(false);

const handleForgotPassword = async () => {
  if (!resetEmail.trim()) {
    toast.error("Enter your email");
    return;
  }

  try {
    setSendingReset(true);

    await forgotPassword(resetEmail);

toast.success("Verification code sent.");

setResetStep("code");

    setShowForgotModal(false);
    setResetEmail("");

  } catch (err: any) {
    toast.error(
      err.response?.data?.detail ||
      "Unable to send reset email."
    );
  } finally {
    setSendingReset(false);
  }
};
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <motion.div

        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="size-16 mx-auto bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg flex items-center justify-center mb-4">
            <Store className="size-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Point of sale Tracker </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isLogin ? "Welcome back" : "Start selling today"}
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your name"
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg placeholder:text-gray-500 text-gray-900"
                    required={!isLogin}
                  />
                </div>
                
              </motion.div>
            )}

            <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email or Staff Name
                </label>

                <input
                  type="text"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: e.target.value,
                    })
                  }
                  placeholder="Enter email or staff name"
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg placeholder:text-gray-500 text-gray-900"
                  required
                />
                          
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg placeholder:text-gray-500 text-gray-900"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>
     {!isLogin && (         
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-2">
      Business Name
    </label>

    <div className="relative">
      <Store className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
      
      <input
        type="text"
        value={formData.business_name}
        onChange={(e) =>
          setFormData({ ...formData, business_name: e.target.value })
        }
        placeholder="e.g Seun Store"
        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg placeholder:text-gray-500 text-gray-900"
        required
      />
    </div>
    
  </div>
 )}
            </div>

            {isLogin && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                 <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="size-4 rounded border-slate-300 text-blue-600"
                  />
                  <span className="text-slate-600">Remember me</span>
                </label>
                <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Forgot password?
              </button>
              </div>
            )}

            <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"

        >
          {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
        </button>
            <div className="text-center mt-1">
                    {isLogin ? (
                      <p className="text-sm text-slate-600">
                        Don't have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setIsLogin(false)}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Sign Up
                        </button>
                      </p>
                    ) : (
                      <p className="text-sm text-slate-600">
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setIsLogin(true)}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Login
                        </button>
                      </p>
                    )}
                  </div>
                  {!isLogin && (
              <p className="text-xs text-slate-500 text-center">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>
            )}
          </form>

        </div>

        

        {/* Demo credentials hint */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-400">
            Use any email and password to continue
          </p>
        </div>
      </motion.div>
      {showForgotModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">

    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">

     {resetStep === "email" && (
<>
    <h2 className="text-2xl font-bold text-slate-800 mb-2">
        Forgot Password
    </h2>

    <p className="text-gray-500 mb-5">
        Enter the email address linked to your account.
        We'll send you a 6-digit verification code.
    </p>

    <input
        type="email"
        value={resetEmail}
        onChange={(e) => setResetEmail(e.target.value)}
        placeholder="Enter your email"
        className="w-full border rounded-lg p-3 mb-5"
    />

    <div className="flex justify-end gap-3">
        <button
            onClick={() => {
                setShowForgotModal(false);
                setResetEmail("");
                setResetStep("email");
            }}
            className="px-5 py-2 rounded-lg border"
        >
            Cancel
        </button>

        <button
            onClick={handleForgotPassword}
            disabled={sendingReset}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg"
        >
            {sendingReset ? "Sending..." : "Send Code"}
        </button>
    </div>
</>
)}

{resetStep === "code" && (
<>
    <h2 className="text-2xl font-bold text-slate-800 mb-2">
        Verify Code
    </h2>

    <p className="text-gray-500 mb-5">
        Enter the 6-digit verification code sent to your email.
    </p>

    <input
        type="text"
        value={resetCode}
        onChange={(e) => setResetCode(e.target.value)}
        maxLength={6}
        placeholder="123456"
        className="w-full border rounded-lg p-3 text-center tracking-[8px] text-xl"
    />

    <button
  onClick={handleVerifyCode}
  disabled={verifyingCode}
  className="w-full mt-5 bg-blue-600 text-white py-3 rounded-lg disabled:opacity-50"
>
  {verifyingCode ? "Verifying..." : "Verify Code"}
</button>
</>
)}
{resetStep === "password" && (
<>
    <h2 className="text-2xl font-bold text-slate-800 mb-2">
        Create New Password
    </h2>

    <p className="text-gray-500 mb-5">
        Your verification code has been confirmed.
    </p>

    <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="New Password"
        className="w-full border rounded-lg p-3 mb-4"
    />

    <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm Password"
        className="w-full border rounded-lg p-3"
    />

    <button
  onClick={handleResetPassword}
  disabled={savingPassword}
  className="w-full mt-5 bg-green-600 text-white py-3 rounded-lg disabled:opacity-50"
>
  {savingPassword ? "Saving..." : "Save Password"}
</button>
</>
)}

    </div>

  </div>
)}
    </div>
  );
}
