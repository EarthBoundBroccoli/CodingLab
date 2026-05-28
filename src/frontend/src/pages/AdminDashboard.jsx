const stats = [
  { label: "Total Users", value: 124, headerClass: "bg-sky-400" },
  { label: "Total Problems", value: 48, headerClass: "bg-emerald-400" },
  { label: "Active Today", value: 12, headerClass: "bg-amber-400" },
  { label: "Total Problems Pending", value: 8, headerClass: "bg-rose-300" },
];

const AdminDashboard = () => {
  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white neo-brutal rounded-none overflow-hidden"
          >
            <div className={`${stat.headerClass} p-3 border-b-4 border-black`}>
              <h2 className="text-xs font-black uppercase tracking-widest text-black">
                {stat.label}
              </h2>
            </div>
            <div className="p-6 flex items-center justify-center">
              <span className="text-5xl font-black bg-white border-4 border-black px-4 py-2 shadow-[4px_4px_0px_0px_black]">
                {stat.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
