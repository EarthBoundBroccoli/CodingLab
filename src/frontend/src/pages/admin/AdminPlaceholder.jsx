const AdminPlaceholder = ({ title }) => {
  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="bg-white neo-brutal rounded-none overflow-hidden">
        <div className="bg-slate-900 text-white p-6 border-b-4 border-black">
          <h1 className="text-2xl lg:text-3xl font-black uppercase font-spartan tracking-tight">
            {title}
          </h1>
        </div>
        <div className="p-8">
          <p className="font-bold italic text-slate-600">
            This section will be implemented next.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminPlaceholder;
