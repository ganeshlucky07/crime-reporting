import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginPoliceUser } from "../../api/auth";
import Button from "../../components/Button";
import FormField from "../../components/FormField";
import Loader from "../../components/Loader";
import { useToast } from "../../components/ToastProvider";
import { useAuth } from "../../context/AuthContext";
import { ROLE_HOME } from "../../lib/constants";
import { getErrorMessage } from "../../lib/errors";

export default function PoliceLoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const { pushToast } = useToast();
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        email: form.email.trim(),
        password: form.password
      };
      const data = await loginPoliceUser(payload);

      login(data);
      pushToast({
        title: "Police authentication successful",
        description: "Loading verification command center."
      });
      navigate("/police/verification", { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Police authentication failed. Use a police team account."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ember">Police Secure Access</p>
      <h2 className="mt-3 text-3xl font-bold text-slate-950">Police Sign In</h2>
      <p className="mt-2 text-sm text-slate-600">
        This portal is for police verification operations, all-user report review, and status updates.
      </p>

      {import.meta.env.DEV ? (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Local demo credentials: <span className="font-semibold">admin@crime.local</span> /{" "}
          <span className="font-semibold">Admin@12345</span>
        </p>
      ) : null}

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <FormField
          label="Police email"
          name="email"
          type="email"
          placeholder="officer@agency.gov"
          value={form.email}
          onChange={handleChange}
          required
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          placeholder="Enter your password"
          value={form.password}
          onChange={handleChange}
          required
        />

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

        <Button className="w-full" type="submit" disabled={submitting}>
          {submitting ? <Loader label="Signing in..." /> : "Sign In as Police"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Citizen user?{" "}
        <Link className="font-semibold text-ember" to="/login">
          Go to user login
        </Link>
      </p>
    </div>
  );
}
