import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../../api/auth";
import Button from "../../components/Button";
import FormField from "../../components/FormField";
import Loader from "../../components/Loader";
import { useToast } from "../../components/ToastProvider";
import { useAuth } from "../../context/AuthContext";
import { ROLE_HOME } from "../../lib/constants";
import { getErrorMessage } from "../../lib/errors";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const { pushToast } = useToast();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(ROLE_HOME[user.role], { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  function handleChange(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const data = await registerUser({
        name: form.name,
        email: form.email,
        password: form.password
      });
      login(data);
      pushToast({
        title: "Registration complete",
        description: "Your account is ready and you are now signed in."
      });
      navigate(ROLE_HOME[data.user.role], { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to create your account right now."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ember">Create Account</p>
      <h2 className="mt-3 text-3xl font-bold text-slate-950">Register</h2>
      <p className="mt-2 text-sm text-slate-600">
        Citizen sign up is available here. Police access is managed separately through police authentication.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <FormField
          label="Full name"
          name="name"
          placeholder="Aisha Khan"
          value={form.name}
          onChange={handleChange}
          required
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          placeholder="aisha@example.com"
          value={form.email}
          onChange={handleChange}
          required
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          placeholder="Minimum 8 characters"
          value={form.password}
          onChange={handleChange}
          required
        />
        <FormField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          placeholder="Repeat your password"
          value={form.confirmPassword}
          onChange={handleChange}
          required
        />

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

        <Button className="w-full" type="submit" disabled={submitting}>
          {submitting ? <Loader label="Creating account..." /> : "Create Account"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Already have an account?{" "}
        <Link className="font-semibold text-ember" to="/login">
          Sign in
        </Link>
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Police team?{" "}
        <Link className="font-semibold text-ember" to="/police/login">
          Go to police sign in
        </Link>
      </p>
    </div>
  );
}
