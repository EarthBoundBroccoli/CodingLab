import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { getBackendURL, useSession } from "../lib/auth-client";
import { buildYearActivity } from "../lib/profile-activity";
import { 
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid 
} from "recharts";


const Profile = () => {
    const { data: session, isPending } = useSession();
    const { userId: paramUserId } = useParams();
    const isOwnProfile = !paramUserId || paramUserId === session?.user?.id;
    const targetId = paramUserId || session?.user?.id;
    const [attempt, setAttempt] = useState(0);
    const [currentYear] = useState(() => new Date().getUTCFullYear());
    const [selectedYear, setSelectedYear] = useState(currentYear);

    const [profileData, setProfileData] = useState({
        user: null,
        stats: null,
        loading: true,
        error: null
    });

    useEffect(() => {
        if (isPending || !targetId) return;
        const controller = new AbortController();
        const options = { withCredentials: true, signal: controller.signal, timeout: 15000 };
        const fetchProfile = async () => {
            try {
                const [statsResult, identityResult] = await Promise.allSettled([
                    axios.get(`${getBackendURL()}/api/submissions/user-stats`, {
                        ...options, params: isOwnProfile ? {} : { userId: targetId }
                    }),
                    axios.get(`${getBackendURL()}${isOwnProfile ? '/api/leaderboard/me' : `/api/users/profile/${targetId}`}`, options)
                ]);
                if (controller.signal.aborted) return;
                if (statsResult.status === 'rejected') throw statsResult.reason;
                if (!isOwnProfile && identityResult.status === 'rejected') throw identityResult.reason;
                const identity = identityResult.status === 'fulfilled' ? identityResult.value.data : null;
                setProfileData({
                    targetId,
                    user: isOwnProfile ? session.user : identity.user,
                    stats: {
                        ...statsResult.value.data,
                        campusRank: identity?.campusRank ?? null,
                        university: isOwnProfile ? identity?.university : identity?.user?.university
                    },
                    warning: !identity ? "Campus rank is unavailable right now. Your competitive stats are still shown." : "",
                    loading: false, error: null
                });
            } catch (error) {
                if (!controller.signal.aborted) setProfileData({
                    targetId, user: null, stats: null, loading: false,
                    error: error.response?.status === 404 ? "This student profile was not found." : "Unable to load this profile. Please try again."
                });
            }
        };
        fetchProfile();
        return () => controller.abort();
    }, [session, isPending, targetId, isOwnProfile, attempt]);

    const retry = () => {
        setProfileData(previous => ({ ...previous, loading: true }));
        setAttempt(value => value + 1);
    };

    const yearlyContributions = useMemo(() => {
        const activity = profileData.stats?.activityHistory || [];
        const years = new Set([currentYear, currentYear - 1]);
        activity.forEach(item => years.add(Number(item.date.slice(0, 4))));
        return Object.fromEntries([...years].map(year => [year, buildYearActivity(activity, year)]));
    }, [profileData.stats?.activityHistory, currentYear]);
    const availableYears = Object.keys(yearlyContributions).map(Number).sort((a, b) => b - a);

    if (isPending || profileData.loading || profileData.targetId !== targetId) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center bg-base-200">
                <div className="flex flex-col items-center gap-4">
                    <span className="loading loading-ring loading-lg text-black"></span>
                    <span className="font-black text-xl uppercase tracking-widest text-black">Loading Competitive Profile...</span>
                </div>
            </div>
        );
    }

    if (profileData.error) return (
        <div className="max-w-3xl mx-auto my-12 p-8 bg-white neo-brutal space-y-4" role="alert">
            <p>{profileData.error}</p>
            <button type="button" className="btn rounded-none bg-slate-900 text-white" onClick={retry}>Try again</button>
        </div>
    );

    const { user, stats } = profileData;
    const cfStats = stats?.codeforcesStats || {
        solvedAllTime: stats?.totalSolved || 0,
        solvedLastYear: 0,
        solvedLastMonth: 0,
        maxStreakAllTime: stats?.longestStreak || 0,
        maxStreakLastYear: 0,
        maxStreakLastMonth: 0
    };

    const rating = stats?.contestRating ?? 1000;
    const maxRating = Math.max(rating, stats?.maxRating ?? rating);
    const ratingTier = stats?.ratingTier || "NOVICE";
    const ratingHistory = stats?.ratingHistory || [];

    const activeYearObj = yearlyContributions[selectedYear] || yearlyContributions[currentYear];
    const firstWeekday = new Date(Date.UTC(selectedYear, 0, 1)).getUTCDay();
    const displayHeatmap = [...Array(firstWeekday).fill(null), ...activeYearObj.data];
    const totalYearContributions = activeYearObj.total;

    // Helper for tier color styling
    const getTierBadgeStyle = (tier) => {
        const t = (tier || "").toUpperCase();
        if (t === "GRANDMASTER") return "bg-red-500 text-white border-black shadow-[3px_3px_0px_0px_black]";
        if (t === "MASTER") return "bg-amber-500 text-black border-black shadow-[3px_3px_0px_0px_black]";
        if (t === "CANDIDATE MASTER") return "bg-purple-600 text-white border-black shadow-[3px_3px_0px_0px_black]";
        if (t === "EXPERT") return "bg-blue-600 text-white border-black shadow-[3px_3px_0px_0px_black]";
        if (t === "SPECIALIST") return "bg-cyan-400 text-black border-black shadow-[3px_3px_0px_0px_black]";
        if (t === "APPRENTICE") return "bg-emerald-400 text-black border-black shadow-[3px_3px_0px_0px_black]";
        return "bg-slate-200 text-black border-black shadow-[3px_3px_0px_0px_black]";
    };

    return (
        <div className="max-w-[1400px] mx-auto py-8 px-4 lg:px-8 text-black">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h1 className="text-3xl font-black uppercase font-spartan tracking-tight">Profile</h1>
                {isOwnProfile && <Link to="/growth" className="text-sm font-bold underline underline-offset-4">View practice progress</Link>}
            </div>
            {profileData.warning && <p role="status" className="bg-white border-2 border-black p-4 mb-6 text-sm">{profileData.warning} <button type="button" className="underline font-bold" onClick={retry}>Retry</button></p>}

            <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-8 items-start">
                <aside className="bg-white neo-brutal overflow-hidden">
                    <div className="p-6 border-b-2 border-black">
                        <div className="w-20 h-20 bg-emerald-400 border-2 border-black flex items-center justify-center mb-4 overflow-hidden">
                            {user?.image ? <img src={user.image} alt={user.name} className="w-full h-full object-cover" /> : <span className="text-3xl font-black">{user?.name?.[0]?.toUpperCase() || 'U'}</span>}
                        </div>
                        <h2 className="text-2xl font-black font-spartan break-words">{user?.name || 'Student'}</h2>
                        {isOwnProfile && <p className="text-xs text-slate-500 mt-1 break-all">{user?.email}</p>}
                        <p className="text-sm font-bold mt-3">{stats?.university?.name || 'University not listed'}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                            <span className={`px-2 py-1 text-[10px] font-black uppercase border-2 ${getTierBadgeStyle(ratingTier)}`}>{ratingTier}</span>
                            <span className="px-2 py-1 text-[10px] font-bold uppercase border-2 border-black">{user?.role?.replaceAll('_', ' ') || 'student'}</span>
                        </div>
                    </div>
                    <dl className="divide-y divide-slate-200 px-6 text-sm">
                        {[
                            ['Contest rating', rating], ['Peak rating', maxRating],
                            ['Campus rank', profileData.warning ? 'Unavailable' : stats?.campusRank ? `#${stats.campusRank}` : 'Unranked'],
                            ['Problems solved', cfStats.solvedAllTime],
                            ['Longest streak', `${stats?.longestStreak ?? 0} days`], ['Rated contests', ratingHistory.length]
                        ].map(([label, value]) => <div key={label} className="py-3 flex justify-between items-center gap-3"><dt className="text-slate-600">{label}</dt><dd className="font-black tabular-nums">{value}</dd></div>)}
                    </dl>
                    <div className="p-5 border-t-2 border-black flex flex-col gap-3">
                        {isOwnProfile && <Link to="/settings" className="btn btn-sm rounded-none bg-slate-900 text-white font-black uppercase border-2 border-black">Edit profile</Link>}
                        <Link to={stats?.university?._id ? `/leaderboard/university/${stats.university._id}` : '/leaderboard'} className="text-center text-xs font-bold underline underline-offset-4">View leaderboard</Link>
                    </div>
                </aside>

                <div className="min-w-0 space-y-8">
                    <section className="bg-white neo-brutal overflow-hidden">
                        <div className="bg-sky-400 px-5 py-4 border-b-4 border-black flex flex-wrap justify-between items-center gap-3">
                            <h2 className="text-xl font-black uppercase font-spartan tracking-tight">Solving activity</h2>
                            <select aria-label="Activity year" value={selectedYear} onChange={event => setSelectedYear(Number(event.target.value))} className="bg-white border-2 border-black px-2 py-1 text-xs font-bold rounded-none">
                                {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                            </select>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-sm"><strong>{totalYearContributions}</strong> accepted submissions in {selectedYear}</p>
                            <div className="overflow-x-auto pb-2">
                                <div className="min-w-max">
                                    <div className="relative h-5 ml-7 text-[10px] text-slate-500">
                                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => {
                                            const dayOffset = (Date.UTC(selectedYear, index, 1) - Date.UTC(selectedYear, 0, 1)) / 86400000;
                                            return <span key={month} className="absolute" style={{ left: `${Math.floor((firstWeekday + dayOffset) / 7) * 15}px` }}>{month}</span>;
                                        })}
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="grid grid-rows-7 gap-[3px] w-5 text-[9px] text-slate-500">
                                            {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((day, index) => <span key={index} className="h-3 leading-3">{day}</span>)}
                                        </div>
                                        <div className="inline-grid grid-rows-7 grid-flow-col gap-[3px]">
                                            {displayHeatmap.map((day, index) => <div key={day?.date || `padding-${index}`}
                                                title={day ? `${day.count} accepted submissions on ${day.date} (UTC)` : undefined}
                                                className={`w-3 h-3 ${!day ? '' : day.level === 0 ? 'bg-slate-100 border border-slate-200' : day.level === 1 ? 'bg-emerald-200' : day.level === 2 ? 'bg-emerald-400' : day.level === 3 ? 'bg-emerald-600' : 'bg-emerald-800'}`} />)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-wrap justify-between items-center gap-3 text-xs text-slate-500">
                                <details><summary className="cursor-pointer underline underline-offset-2">How activity is counted</summary><p className="max-w-sm mt-2">Accepted submissions include repeat solutions. Solved totals count each problem once. Activity and streaks use UTC days.</p></details>
                                <div className="flex items-center gap-1" aria-label="Activity increases from light to dark green"><span className="mr-1">Less</span>{['bg-slate-100', 'bg-emerald-200', 'bg-emerald-400', 'bg-emerald-600', 'bg-emerald-800'].map(color => <span key={color} className={`w-3 h-3 ${color}`} />)}<span className="ml-1">More</span></div>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white neo-brutal overflow-hidden">
                        <div className="bg-sky-400 px-5 py-4 border-b-4 border-black"><h2 className="text-xl font-black uppercase font-spartan tracking-tight">Contest rating</h2></div>
                        {ratingHistory.length ? <>
                            <div className="h-60 p-4 sm:p-6">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={ratingHistory} margin={{ top: 10, right: 10, bottom: 5, left: -15 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="contestName" fontSize={11} tickLine={false} minTickGap={30} />
                                        <YAxis fontSize={11} tickLine={false} domain={['dataMin - 100', 'dataMax + 100']} />
                                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '2px solid black', fontSize: '12px' }} />
                                        <Line name="Rating" type="linear" dataKey="newRating" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="overflow-x-auto border-t-2 border-black">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-100 text-[10px] uppercase border-b-2 border-black"><tr>{['Contest', 'Rank', 'Change', 'Rating'].map(label => <th key={label} className="px-5 py-3 font-black">{label}</th>)}</tr></thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {[...ratingHistory].reverse().map((item, index) => <tr key={item.contestId || index} className="hover:bg-slate-50">
                                            <td className="px-5 py-3 font-bold">{item.contestName}</td><td className="px-5 py-3 tabular-nums">{item.rank ? `#${item.rank}` : '?'}</td>
                                            <td className={`px-5 py-3 font-bold tabular-nums ${Number(item.ratingChange) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{item.ratingChange}</td><td className="px-5 py-3 tabular-nums">{item.newRating}</td>
                                        </tr>)}
                                    </tbody>
                                </table>
                            </div>
                        </> : <div className="p-8 text-sm text-slate-600 space-y-3"><p>No rated contests yet. Your results will appear here after your first rated contest.</p>{isOwnProfile && <Link to="/contests" className="font-bold underline underline-offset-4 text-black">Browse contests</Link>}</div>}
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Profile;
