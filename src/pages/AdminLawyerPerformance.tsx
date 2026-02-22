import { useAppContext } from "../context/AppContext";
import { calculateLawyerMetrics } from "../utils/lawyerMetrics";
import { Link } from "react-router-dom";

export default function DashboardMenu() {
  const { currentUser } = useAppContext();

  if (!currentUser) return null;

  return (
    <nav className="space-y-2">
      <Link to="/dashboard">Dashboard</Link>

      {/* PERFORMANCE */}
      {(currentUser.role === "admin" || currentUser.role === "lawyer") && (
        <Link to="/dashboard/performance">
          Performance
        </Link>
      )}
    </nav>
  );
}

export default function AdminLawyerPerformance() {
  const { lawyers, transactions, courtCases, letters } = useAppContext();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Lawyer Performance</h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lawyers.map(lawyer => {
          const m = calculateLawyerMetrics(
            lawyer,
            transactions,
            courtCases,
            letters
          );

          return (
            <div
              key={lawyer.id}
              className="bg-white rounded-lg shadow p-5 border"
            >
              <h2 className="font-semibold text-lg">{lawyer.name}</h2>
              <p className="text-sm text-gray-500 mb-3">{lawyer.email}</p>

              <div className="text-sm space-y-1">
                <p><b>Transactions:</b> {m.workload.transactions}</p>
                <p><b>Cases:</b> {m.workload.cases}</p>
                <p><b>Letters:</b> {m.workload.letters}</p>
                <p><b>Notes Added:</b> {m.productivity.notes}</p>
                <p><b>Completed Cases:</b> {m.productivity.completedCases}</p>
              </div>

              <hr className="my-3" />

              <div className="text-sm">
                <p><b>Billed:</b> UGX {m.finance.billed.toLocaleString()}</p>
                <p><b>Paid:</b> UGX {m.finance.paid.toLocaleString()}</p>
                <p><b>Balance:</b> UGX {m.finance.balance.toLocaleString()}</p>
                <p className="font-semibold">
                  Collection Rate: {m.finance.collectionRate}%
                </p>
              </div>

              <div className="mt-3 text-xs text-gray-600">
                Productivity Score: {m.productivity.score}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
