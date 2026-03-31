import { Link } from "react-router-dom";
import Button from "../components/Button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="panel max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ember">404</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">Page not found</h1>
        <p className="mt-3 text-sm text-slate-600">
          The page you requested is unavailable or the route does not exist.
        </p>
        <Link to="/" className="mt-6 inline-flex">
          <Button>Go Home</Button>
        </Link>
      </div>
    </div>
  );
}
