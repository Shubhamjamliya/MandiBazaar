import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";

export default function Wallet() {
  const { user } = useAuth();
  const balance = Number(user?.walletAmount || 0);

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-white border-b border-neutral-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-neutral-900">Wallet</h1>
          <Link
            to="/"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
            Back
          </Link>
        </div>
      </div>

      <div className="px-4 py-6">
        <div className="bg-white rounded-2xl border border-neutral-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
            Available Balance
          </p>
          <p className="text-3xl font-bold text-neutral-900 mt-2">
            ₹{balance.toFixed(2)}
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            Wallet balance is used for refunds and eligible offers.
          </p>
        </div>

        <div className="mt-4 bg-white rounded-2xl border border-neutral-100 p-4">
          <p className="text-sm font-semibold text-neutral-900">Transactions</p>
          <p className="text-xs text-neutral-500 mt-1">
            No transactions to show.
          </p>
        </div>
      </div>
    </div>
  );
}
