import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getBackendURL, useSession, authClient } from "../lib/auth-client";
import { 
  User as UserIcon, Code2, Shield, Building, Save, CheckCircle2, AlertCircle
} from "lucide-react";

const Settings = () => {
  const navigate = useNavigate();
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [socials, setSocials] = useState({
    codeforces: "",
    github: "",
    linkedin: "",
    website: ""
  });

  const [preferredLang, setPreferredLang] = useState(() => localStorage.getItem("cl_pref_lang") || "cpp");
  const [editorTheme, setEditorTheme] = useState(() => localStorage.getItem("cl_editor_theme") || "vs-dark");
  const [tabSize, setTabSize] = useState(() => localStorage.getItem("cl_tab_size") || "4");
  const [keybinding, setKeybinding] = useState(() => localStorage.getItem("cl_keybinding") || "standard");

  const [universities, setUniversities] = useState([]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${getBackendURL()}/api/users/settings`, { withCredentials: true });
        const { user, universities: uniList } = res.data;

        setName(user.name || "");
        setBio(user.bio || "");
        setImage(user.image || "");
        setUniversityId(user.university?._id || user.university || "");
        setSocials(user.socials || { codeforces: "", github: "", linkedin: "", website: "" });
        setUniversities(uniList || []);
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await axios.patch(
        `${getBackendURL()}/api/users/settings`,
        { name, bio, image, universityId, socials },
        { withCredentials: true }
      );

      try {
        if (authClient?.updateUser) {
          await authClient.updateUser({ image, name });
        }
      } catch (err) {}

      showToast("✓ Avatar DP & Settings Saved!");
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      console.error("Error saving profile settings:", err);
      showToast("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEditorPrefs = (e) => {
    e.preventDefault();
    localStorage.setItem("cl_pref_lang", preferredLang);
    localStorage.setItem("cl_editor_theme", editorTheme);
    localStorage.setItem("cl_tab_size", tabSize);
    localStorage.setItem("cl_keybinding", keybinding);
    showToast("✓ Editor Preferences Saved!");
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <span className="loading loading-ring loading-lg text-black"></span>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto py-10 px-4 lg:px-8 space-y-8 text-black">
      {toast && (
        <div className="fixed right-4 bottom-4 z-50 bg-emerald-400 text-black border-4 border-black px-5 py-3 font-black uppercase text-xs shadow-[4px_4px_0px_0px_black] animate-bounce">
          {toast}
        </div>
      )}

      <div className="bg-white border-4 border-black p-6 lg:p-8 neo-brutal flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black uppercase font-spartan">Account Settings</h1>
          <p className="font-bold text-xs text-slate-600 uppercase tracking-wider mt-1">
            Manage your competitive identity, code editor preferences, and security settings
          </p>
        </div>
        <div className="badge bg-emerald-400 text-black border-2 border-black font-black uppercase px-3 py-2 text-xs">
          Role: {session?.user?.role || "Student"}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-b-4 border-black pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`px-5 py-2.5 font-black uppercase text-xs border-2 border-black transition-all cursor-pointer ${
            activeTab === "profile"
              ? "bg-emerald-400 text-black shadow-[3px_3px_0px_0px_black]"
              : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          <UserIcon size={16} className="inline mr-2" /> Profile & Identity
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("editor")}
          className={`px-5 py-2.5 font-black uppercase text-xs border-2 border-black transition-all cursor-pointer ${
            activeTab === "editor"
              ? "bg-emerald-400 text-black shadow-[3px_3px_0px_0px_black]"
              : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Code2 size={16} className="inline mr-2" /> Code Editor Defaults
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("university")}
          className={`px-5 py-2.5 font-black uppercase text-xs border-2 border-black transition-all cursor-pointer ${
            activeTab === "university"
              ? "bg-emerald-400 text-black shadow-[3px_3px_0px_0px_black]"
              : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Building size={16} className="inline mr-2" /> Campus Affiliation
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`px-5 py-2.5 font-black uppercase text-xs border-2 border-black transition-all cursor-pointer ${
            activeTab === "security"
              ? "bg-emerald-400 text-black shadow-[3px_3px_0px_0px_black]"
              : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Shield size={16} className="inline mr-2" /> Account & Security
        </button>
      </div>

      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile} className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] neo-brutal space-y-6">
          <div className="border-b-4 border-black pb-4">
            <h2 className="text-xl font-black uppercase font-spartan">Public Identity Settings</h2>
            <p className="text-xs font-bold text-slate-500">Visible on your public competitive profile card</p>
          </div>

          {/* Live DP Avatar Preview Box */}
          <div className="flex items-center gap-6 p-4 border-2 border-black bg-slate-50">
            <div className="w-20 h-20 rounded-full border-4 border-black bg-emerald-400 overflow-hidden flex items-center justify-center text-3xl font-black text-black shadow-[3px_3px_0px_0px_black] shrink-0">
              {image ? (
                <img 
                  src={image} 
                  alt="Avatar Preview" 
                  className="w-full h-full object-cover" 
                  onError={(e) => { e.target.style.display = 'none'; }} 
                />
              ) : (
                <span>{name ? name[0].toUpperCase() : "U"}</span>
              )}
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-sm uppercase text-black">Avatar DP Preview</h4>
              <p className="text-xs font-bold text-slate-500">
                Paste any direct image URL (PNG/JPG/WebP) below. It will update your DP in the Navbar and Profile header.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="font-black text-xs uppercase tracking-wider block text-slate-700">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input input-bordered w-full border-2 border-black font-bold text-sm rounded-none focus:outline-none focus:border-emerald-500"
                placeholder="Your Name"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="font-black text-xs uppercase tracking-wider block text-slate-700">Avatar Image URL</label>
              <input
                type="url"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                className="input input-bordered w-full border-2 border-black font-bold text-sm rounded-none focus:outline-none focus:border-emerald-500"
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-black text-xs uppercase tracking-wider block text-slate-700">Bio / Motto</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="textarea textarea-bordered w-full border-2 border-black font-bold text-sm rounded-none focus:outline-none focus:border-emerald-500"
              placeholder="e.g. Competitive Programmer | Dhaka University CSE '26"
            ></textarea>
          </div>

          <div className="border-t-2 border-slate-200 pt-4 space-y-4">
            <h3 className="font-black text-sm uppercase tracking-wider text-slate-800">Competitive Social Handles</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-xs uppercase text-slate-600">Codeforces Handle</label>
                <input
                  type="text"
                  value={socials.codeforces}
                  onChange={(e) => setSocials({ ...socials, codeforces: e.target.value })}
                  className="input input-bordered w-full border-2 border-black font-bold text-xs rounded-none"
                  placeholder="e.g. tourist"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-xs uppercase text-slate-600">GitHub Username</label>
                <input
                  type="text"
                  value={socials.github}
                  onChange={(e) => setSocials({ ...socials, github: e.target.value })}
                  className="input input-bordered w-full border-2 border-black font-bold text-xs rounded-none"
                  placeholder="e.g. octocat"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-xs uppercase text-slate-600">LinkedIn Profile URL</label>
                <input
                  type="url"
                  value={socials.linkedin}
                  onChange={(e) => setSocials({ ...socials, linkedin: e.target.value })}
                  className="input input-bordered w-full border-2 border-black font-bold text-xs rounded-none"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-xs uppercase text-slate-600">Portfolio Website</label>
                <input
                  type="url"
                  value={socials.website}
                  onChange={(e) => setSocials({ ...socials, website: e.target.value })}
                  className="input input-bordered w-full border-2 border-black font-bold text-xs rounded-none"
                  placeholder="https://yourportfolio.dev"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn bg-black text-white border-4 border-black rounded-none font-black uppercase hover:bg-emerald-400 hover:text-black shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer"
          >
            <Save size={18} className="mr-2" /> {saving ? "Saving..." : "Save Profile Settings"}
          </button>
        </form>
      )}

      {activeTab === "editor" && (
        <form onSubmit={handleSaveEditorPrefs} className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] neo-brutal space-y-6">
          <div className="border-b-4 border-black pb-4">
            <h2 className="text-xl font-black uppercase font-spartan">Code Editor Preferences</h2>
            <p className="text-xs font-bold text-slate-500">Configure your default coding language and editor options in Problem Workspace</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="font-black text-xs uppercase tracking-wider block text-slate-700">Preferred Programming Language</label>
              <select
                value={preferredLang}
                onChange={(e) => setPreferredLang(e.target.value)}
                className="select select-bordered w-full border-2 border-black font-bold text-sm rounded-none focus:outline-none"
              >
                <option value="cpp">C++20 (GCC 13.2)</option>
                <option value="python">Python 3.12</option>
                <option value="java">Java 21</option>
                <option value="javascript">JavaScript (Node.js 20)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="font-black text-xs uppercase tracking-wider block text-slate-700">Editor Color Theme</label>
              <select
                value={editorTheme}
                onChange={(e) => setEditorTheme(e.target.value)}
                className="select select-bordered w-full border-2 border-black font-bold text-sm rounded-none focus:outline-none"
              >
                <option value="vs-dark">VS Code Dark</option>
                <option value="monokai">Monokai Dark</option>
                <option value="github-dark">GitHub Dark Theme</option>
                <option value="light">Acid Light Theme</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="font-black text-xs uppercase tracking-wider block text-slate-700">Tab Indentation Width</label>
              <select
                value={tabSize}
                onChange={(e) => setTabSize(e.target.value)}
                className="select select-bordered w-full border-2 border-black font-bold text-sm rounded-none focus:outline-none"
              >
                <option value="2">2 Spaces</option>
                <option value="4">4 Spaces</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="font-black text-xs uppercase tracking-wider block text-slate-700">Keybinding Mode</label>
              <select
                value={keybinding}
                onChange={(e) => setKeybinding(e.target.value)}
                className="select select-bordered w-full border-2 border-black font-bold text-sm rounded-none focus:outline-none"
              >
                <option value="standard">Standard Cursor</option>
                <option value="vim">Vim Keybindings Mode</option>
                <option value="emacs">Emacs Keybindings Mode</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn bg-black text-white border-4 border-black rounded-none font-black uppercase hover:bg-emerald-400 hover:text-black shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer"
          >
            <Save size={18} className="mr-2" /> Save Editor Preferences
          </button>
        </form>
      )}

      {activeTab === "university" && (
        <form onSubmit={handleSaveProfile} className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] neo-brutal space-y-6">
          <div className="border-b-4 border-black pb-4">
            <h2 className="text-xl font-black uppercase font-spartan">Bangladeshi University Affiliation</h2>
            <p className="text-xs font-bold text-slate-500">Select your university to participate in Campus Leaderboards and Intra-University Contests</p>
          </div>

          <div className="space-y-2 max-w-xl">
            <label className="font-black text-xs uppercase tracking-wider block text-slate-700">University / Institution</label>
            <select
              value={universityId}
              onChange={(e) => setUniversityId(e.target.value)}
              className="select select-bordered w-full border-2 border-black font-bold text-sm rounded-none focus:outline-none"
            >
              <option value="">-- Select Your Bangladeshi University --</option>
              {universities.map((uni) => (
                <option key={uni._id} value={uni._id}>
                  {uni.name} ({uni.shortName})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn bg-black text-white border-4 border-black rounded-none font-black uppercase hover:bg-emerald-400 hover:text-black shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer"
          >
            <Save size={18} className="mr-2" /> {saving ? "Saving..." : "Save Campus Affiliation"}
          </button>
        </form>
      )}

      {activeTab === "security" && (
        <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] neo-brutal space-y-6">
          <div className="border-b-4 border-black pb-4">
            <h2 className="text-xl font-black uppercase font-spartan">Account & Security</h2>
            <p className="text-xs font-bold text-slate-500">Manage login credentials and session security</p>
          </div>

          <div className="p-4 bg-slate-100 border-2 border-black space-y-2">
            <span className="font-black text-xs uppercase text-slate-500 block">Registered Email</span>
            <div className="flex items-center gap-3">
              <span className="font-black text-base text-black">{session?.user?.email}</span>
              <span className="badge bg-emerald-400 text-black border border-black font-black uppercase text-[10px]">Verified Account</span>
            </div>
          </div>

          <div className="border-t-2 border-slate-200 pt-4 space-y-4">
            <h3 className="font-black text-sm uppercase tracking-wider text-black">Active Device Sessions</h3>
            <div className="p-4 border-2 border-black bg-slate-50 flex justify-between items-center">
              <div>
                <p className="font-bold text-xs text-black uppercase">Current Browser Session (This Device)</p>
                <p className="text-[11px] text-slate-500 font-bold">Active now • Windows Desktop</p>
              </div>
              <span className="badge bg-emerald-300 text-black border border-black font-black uppercase text-[10px]">Active Now</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
