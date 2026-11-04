
import { useState } from "react";
import type { FormEvent } from "react";
import { motion } from "motion/react";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  Store,
  ArrowLeft,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  loginUser,
  registerUser,
  forgotPassword,
  verifyResetCode,
  resetPassword,
} from "../../api/auth";

import { employeeLogin } from "../../api/employee";

interface AuthProps {
  onLogin: (token: string) => void;
}

type ResetStep = "email" | "code" | "password";

export function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    business_name: "",
    currency: "",
  });

  // Password reset states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>("email");

  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [sendingReset, setSendingReset] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Save login session in the selected storage.
  const saveAuthSession = (
    token: string,
    user: Record<string, any>,
    storageType: "local" | "session"
  ) => {
    // Remove old sessions to prevent conflicting tokens.
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");

    localStorage.removeItem("user");
    sessionStorage.removeItem("user");

    localStorage.removeItem("role");
    sessionStorage.removeItem("role");

    localStorage.removeItem("permissions");
    sessionStorage.removeItem("permissions");

    const storage =
      storageType === "local" ? localStorage : sessionStorage;

    storage.setItem("token", token);
    storage.setItem("user", JSON.stringify(user));

    if (user.role) {
      storage.setItem("role", user.role);
    }

    if (user.permissions) {
      storage.setItem(
        "permissions",
        JSON.stringify(user.permissions)
      );
    }
  };

  // Display backend errors without hiding network failures.
  const getErrorMessage = (
    error: any,
    fallback: string
  ): string => {
    if (error.response?.data?.detail) {
      return error.response.data.detail;
    }

    if (error.response?.status >= 500) {
      return "The server is temporarily unavailable. Please try again.";
    }

    if (!error.response) {
      return "Unable to connect to the server. Check your internet connection and try again.";
    }

    return fallback;
  };

  // Login and registration
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      if (isLogin) {
        let token: string;
        let user: Record<string, any>;

        try {
          // First attempt: owner login.
          const res = await loginUser({
            email: formData.email.trim(),
            password: formData.password,
          });

          token = res.data.access_token;

          user = {
            ...res.data.user,
            role: "owner",
            permissions: ["all"],
          };

        } catch (ownerError: any) {
          const status = ownerError.response?.status;

          // Only try employee login when the owner endpoint
          // explicitly rejects the credentials.
          //
          // Do not make another request for network errors,
          // timeouts, or server errors.
          if (status !== 400 && status !== 401) {
          throw ownerError;
        }
          const employeeRes = await employeeLogin({
            email: formData.email.trim(),
            password: formData.password,
          });

          token = employeeRes.data.access_token;

          user = {
            role: "employee",
            permissions: employeeRes.data.user.permissions,
            name: employeeRes.data.user.name,
            id: employeeRes.data.user.id,
          };
        }

        saveAuthSession(
          token,
          user,
          rememberMe ? "local" : "session"
        );

        onLogin(token);

        return;
      }

      // Registration validation
      if (!formData.currency) {
        toast.error("Please select your business currency.");
        return;
      }

      if (!termsAccepted || !privacyAccepted) {
        toast.error(
          "Please accept the Terms and Privacy Policy."
        );
        return;
      }

      await registerUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        business_name: formData.business_name.trim(),
        currency: formData.currency,
        terms_accepted: termsAccepted,
        privacy_policy_accepted: privacyAccepted,
      });

      // Log in after successful registration.
      const res = await loginUser({
        email: formData.email.trim(),
        password: formData.password,
      });

      const token = res.data.access_token;

      const user = {
        ...res.data.user,
        role: "owner",
        permissions: ["all"],
      };

      saveAuthSession(token, user, "local");

      toast.success("Account created successfully!");

      onLogin(token);

    } catch (err: any) {
      console.error("Authentication error:", err);

      toast.error(
        getErrorMessage(
          err,
          isLogin ? "Login failed." : "Registration failed."
        )
      );

    } finally {
      setLoading(false);
    }
  };

  // Close and reset password modal
  const closeForgotPassword = () => {
    setShowForgotModal(false);
    setResetStep("email");
    setResetEmail("");
    setResetCode("");
    setNewPassword("");
    setConfirmPassword("");
  };

  // Send password reset code
  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      toast.error("Enter your email.");
      return;
    }

    try {
      setSendingReset(true);

      await forgotPassword(resetEmail.trim());

      toast.success("Verification code sent successfully!");

      setResetStep("code");

    } catch (err: any) {
      toast.error(
        getErrorMessage(err, "Unable to send reset email.")
      );

    } finally {
      setSendingReset(false);
    }
  };

  // Verify password reset code
  const handleVerifyCode = async () => {
    if (!resetCode.trim()) {
      toast.error("Enter your verification code.");
      return;
    }

    try {
      setVerifyingCode(true);

      await verifyResetCode(
        resetEmail.trim(),
        resetCode.trim()
      );

      toast.success("Code verified successfully!");

      setResetStep("password");

    } catch (err: any) {
      toast.error(
        getErrorMessage(err, "Invalid verification code.")
      );

    } finally {
      setVerifyingCode(false);
    }
  };

  // Save new password
  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Enter and confirm your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setSavingPassword(true);

      await resetPassword(
        resetEmail.trim(),
        resetCode.trim(),
        newPassword
      );

      toast.success("Password updated successfully!");

      closeForgotPassword();

    } catch (err: any) {
      toast.error(
        getErrorMessage(err, "Unable to reset password.")
      );

    } finally {
      setSavingPassword(false);
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

          <h1 className="text-3xl font-bold text-slate-900">
            Point of sale Tracker
          </h1>

          <p className="text-slate-500 text-sm mt-1">
            {isLogin ? "Welcome back" : "Start selling today"}
          </p>
        </div>

        {/* Authentication Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-4">

            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name
                </label>

                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />

                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                      })
                    }
                    placeholder="Enter your name"
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg placeholder:text-gray-500 text-gray-900"
                    required
                  />
                </div>
              </motion.div>
            )}

            {/* Email or Staff Name */}
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
                className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg placeholder:text-gray-500 text-gray-900"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />

                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      password: e.target.value,
                    })
                  }
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-lg placeholder:text-gray-500 text-gray-900"
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
            </div>

            {/* Business Name */}
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
                      setFormData({
                        ...formData,
                        business_name: e.target.value,
                      })
                    }
                    placeholder="e.g Seun Store"
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg placeholder:text-gray-500 text-gray-900"
                    required
                  />
                </div>
              </div>
            )}

            {/* Business Currency */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Business Currency
                </label>

                <select
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      currency: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  required
                >
                  <option value="" disabled>
                    Select your business currency
                  </option>

                  <option value="NGN">Nigerian Naira (₦)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="GBP">British Pound (£)</option>
                  <option value="EUR">Euro (€)</option>
                  <option value="CAD">Canadian Dollar (C$)</option>
                  <option value="AUD">Australian Dollar (A$)</option>
                  <option value="GHS">Ghanaian Cedi (GH₵)</option>
                  <option value="KES">Kenyan Shilling (KSh)</option>
                  <option value="ZAR">South African Rand (R)</option>
                  <option value="INR">Indian Rupee (₹)</option>
                  <option value="JPY">Japanese Yen (¥)</option>
                  <option value="CHF">Swiss Franc (CHF)</option>
                </select>

                <p className="text-xs text-slate-500 mt-1">
                  This will be your business's original currency.
                  You can change it later in Settings.
                </p>
              </div>
            )}

            {/* Login Options */}
            {isLogin && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) =>
                      setRememberMe(e.target.checked)
                    }
                    className="size-4 rounded border-slate-300 text-blue-600"
                  />

                  <span className="text-slate-600">
                    Remember me
                  </span>
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-60"
            >
              {loading
                ? "Please wait..."
                : isLogin
                  ? "Login"
                  : "Create Account"}
            </button>

            {/* Switch Login / Registration */}
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

            {/* Terms and Privacy */}
            {!isLogin && (
              <div className="space-y-3 text-sm text-slate-600">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={termsAccepted}
                    onChange={(e) =>
                      setTermsAccepted(e.target.checked)
                    }
                    className="mt-1"
                  />

                  <span>
                    I agree to the{" "}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      Terms and Conditions
                    </a>.
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={privacyAccepted}
                    onChange={(e) =>
                      setPrivacyAccepted(e.target.checked)
                    }
                    className="mt-1"
                  />

                  <span>
                    I have read and acknowledge the{" "}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      Privacy Policy
                    </a>.
                  </span>
                </label>
              </div>
            )}
          </form>
        </div>

        {/* Demo Hint */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-400">
            Use your registered email or staff name and password.
          </p>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">

            {/* Email Step */}
            {resetStep === "email" && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <div />

                  <button
                    type="button"
                    onClick={closeForgotPassword}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <X size={22} />
                  </button>
                </div>

                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  Forgot Password
                </h2>

                <p className="text-gray-500 mb-5">
                  Enter the email linked to your account.
                  We'll send you a 6-digit verification code.
                </p>

                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full border rounded-lg p-3 mb-5"
                />

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={sendingReset}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg disabled:opacity-50"
                >
                  {sendingReset ? "Sending..." : "Send Code"}
                </button>
              </>
            )}

            {/* Verification Step */}
            {resetStep === "code" && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <button
                    type="button"
                    onClick={() => setResetStep("email")}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                  >
                    <ArrowLeft size={18} />
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={closeForgotPassword}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <X size={22} />
                  </button>
                </div>

                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  Verify Code
                </h2>

                <p className="text-gray-500 mb-5">
                  Enter the 6-digit verification code sent to your email.
                </p>

                <input
                  type="text"
                  inputMode="numeric"
                  value={resetCode}
                  onChange={(e) =>
                    setResetCode(
                      e.target.value.replace(/\D/g, "").slice(0, 6)
                    )
                  }
                  maxLength={6}
                  placeholder="123456"
                  className="w-full border rounded-lg p-3 text-center tracking-[8px] text-xl"
                />

                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={verifyingCode}
                  className="w-full mt-5 bg-blue-600 text-white py-3 rounded-lg disabled:opacity-50"
                >
                  {verifyingCode ? "Verifying..." : "Verify Code"}
                </button>
              </>
            )}

            {/* New Password Step */}
            {resetStep === "password" && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <button
                    type="button"
                    onClick={() => setResetStep("code")}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                  >
                    <ArrowLeft size={18} />
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={closeForgotPassword}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <X size={22} />
                  </button>
                </div>

                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  Create New Password
                </h2>

                <p className="text-gray-500 mb-5">
                  Your verification code has been confirmed.
                </p>

                {/* New Password */}
                <div className="relative mb-4">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />

                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password"
                    className="w-full pl-11 pr-12 py-3 border rounded-lg"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? (
                      <EyeOff className="size-5" />
                    ) : (
                      <Eye className="size-5" />
                    )}
                  </button>
                </div>

                {/* Confirm Password */}
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />

                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    placeholder="Confirm Password"
                    className="w-full pl-11 pr-12 py-3 border rounded-lg"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? (
                      <EyeOff className="size-5" />
                    ) : (
                      <Eye className="size-5" />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={savingPassword}
                  className="w-full mt-5 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg disabled:opacity-50"
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
