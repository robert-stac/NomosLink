import Sidebar from "../components/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 bg-gray-100 p-6 min-h-screen">{children}</main>
    </div>
  );
}
