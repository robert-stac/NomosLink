import { User, Transaction, CourtCase, Letter } from "../context/AppContext";

export function calculateLawyerMetrics(
  lawyer: User,
  transactions: Transaction[],
  courtCases: CourtCase[],
  letters: Letter[]
) {
  const myTransactions = transactions.filter(t => t.lawyerId === lawyer.id);
  const myCases = courtCases.filter(c => c.lawyerId === lawyer.id);
  const myLetters = letters.filter(l => l.lawyerId === lawyer.id);

  const totalBilled = myTransactions.reduce((s, t) => s + (t.amount || 0), 0);
  const totalPaid = myTransactions.reduce(
    (s, t) => s + (t.progressNotes?.length ? t.amount * 0.6 : 0),
    0
  );

  const totalNotes =
    myTransactions.reduce((s, t) => s + (t.progressNotes?.length || 0), 0) +
    myCases.reduce((s, c) => s + (c.progressNotes?.length || 0), 0);

  const completedCases = myCases.filter(c => c.status === "Completed").length;

  return {
    workload: {
      transactions: myTransactions.length,
      cases: myCases.length,
      letters: myLetters.length,
    },
    finance: {
      billed: totalBilled,
      paid: totalPaid,
      balance: totalBilled - totalPaid,
      collectionRate:
        totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0,
    },
    productivity: {
      notes: totalNotes,
      completedCases,
      score: totalNotes + completedCases * 2,
    },
  };
}
