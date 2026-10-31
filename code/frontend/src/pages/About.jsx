const About = () => {
  return (
    <div className="max-w-[1200px] mx-auto py-16 px-4 lg:px-8">
      <div className="text-center mb-16">
        <h1 className="text-5xl lg:text-6xl font-black uppercase font-spartan text-black mb-4">About Us</h1>
        <p className="text-xl font-bold italic text-slate-700">The team behind CodingLab</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Member 1 */}
        <div className="bg-white neo-brutal p-8 flex flex-col items-center text-center space-y-6">
          <div className="w-32 h-32 rounded-full border-4 border-black bg-slate-200 flex items-center justify-center overflow-hidden">
             <span className="font-black text-slate-400">PHOTO</span>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-black uppercase italic">Member Name 1</h2>
            <p className="font-bold text-slate-600 leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
          </div>
        </div>

        {/* Member 2 */}
        <div className="bg-white neo-brutal p-8 flex flex-col items-center text-center space-y-6">
          <div className="w-32 h-32 rounded-full border-4 border-black bg-slate-200 flex items-center justify-center overflow-hidden">
             <span className="font-black text-slate-400">PHOTO</span>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-black uppercase italic">Member Name 2</h2>
            <p className="font-bold text-slate-600 leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
          </div>
        </div>

        {/* Member 3 */}
        <div className="bg-white neo-brutal p-8 flex flex-col items-center text-center space-y-6">
          <div className="w-32 h-32 rounded-full border-4 border-black bg-slate-200 flex items-center justify-center overflow-hidden">
             <span className="font-black text-slate-400">PHOTO</span>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-black uppercase italic">Member Name 3</h2>
            <p className="font-bold text-slate-600 leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
