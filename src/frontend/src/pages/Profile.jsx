import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { getBackendURL, useSession } from "../lib/auth-client";
import { buildYearActivity } from "../lib/profile-activity";
import { ArrowUpRight, Building2, Pencil, Trophy } from 'lucide-react';
import './profile.css';
import { 
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid 
} from "recharts";

const getProfileLinks = socials => {
    const links = [];
    for (const [key, label, prefix] of [
        ['codeforces', 'Codeforces', 'https://codeforces.com/profile/'],
        ['github', 'GitHub', 'https://github.com/'],
        ['linkedin', 'LinkedIn', 'https://www.linkedin.com/in/'],
        ['website', 'Website', 'https://'],
    ]) {
        const value = typeof socials?.[key] === 'string' ? socials[key].trim() : '';
        if (!value) continue;
        try {
            const url = new URL(/^https?:\/\//i.test(value) ? value : prefix + (key === 'website' ? value : encodeURIComponent(value.replace(/^@/, ''))));
            if (!['http:', 'https:'].includes(url.protocol) || value.includes('://') && !/^https?:\/\//i.test(value)) continue;
            links.push({ label, href: url.href });
        } catch { /* Leave invalid saved links out of the profile. */ }
    }
    return links;
};

const Profile = () => {
    const { data: session, isPending } = useSession();
    const { userId: paramUserId } = useParams();
    const isOwnProfile = !paramUserId || paramUserId === session?.user?.id;
    const targetId = paramUserId || session?.user?.id;
    const [attempt, setAttempt] = useState(0);
    const [currentYear] = useState(() => new Date().getUTCFullYear());
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [showAllContests, setShowAllContests] = useState(false);

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
                    axios.get(`${getBackendURL()}/api/users/profile/${encodeURIComponent(targetId)}`, options)
                ]);
                if (controller.signal.aborted) return;
                if (statsResult.status === 'rejected') throw statsResult.reason;
                if (!isOwnProfile && identityResult.status === 'rejected') throw identityResult.reason;
                const identity = identityResult.status === 'fulfilled' ? identityResult.value.data : null;
                setProfileData({
                    targetId,
                    user: identity?.user || session.user,
                    stats: {
                        ...statsResult.value.data,
                        isRated: identity?.stats?.isRated ?? null,
                        campusRank: identity?.campusRank ?? null,
                        university: identity?.user?.university
                    },
                    warning: !identity ? "Profile details and campus rank are unavailable right now. Your competitive stats are still shown." : "",
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
    const isRated = stats?.isRated === true;
    const ratingTier = isRated ? stats?.ratingTier || "NOVICE" : 'UNRATED';
    const ratingHistory = isRated ? stats?.ratingHistory || [] : [];
    const recentContests = [...ratingHistory].reverse();
    const visibleContests = showAllContests ? recentContests : recentContests.slice(0, 5);
    const latestChange = ratingHistory.length ? Number(recentContests[0].ratingChange) : null;
    const profileLinks = getProfileLinks(user?.socials);

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

    const activityColors = ['#f1f5f9', '#a7f3d0', '#34d399', '#059669', '#065f46'];
    const calendarWidth = Math.ceil(displayHeatmap.length / 7) * 15 + 48;
    const activeDays = activeYearObj.data.filter(day => day.count > 0).length;
    const bestDay = Math.max(0, ...activeYearObj.data.map(day => day.count));

    return (
        <div className="student-profile">
            <header className="profile-page-heading">
                <div><h1>Profile</h1><p>Solving activity and competitive record.</p></div>
                {isOwnProfile && <Link to="/growth" className="profile-text-link">Practice progress <ArrowUpRight size={16} /></Link>}
            </header>
            {profileData.warning && <p role="status" className="profile-notice">{profileData.warning} <button type="button" className="profile-text-link" onClick={retry}>Retry</button></p>}
            <div className="profile-layout">
                <aside className="profile-panel profile-identity">
                    <div className="profile-avatar">
                        {user?.image ? <img src={user.image} alt={user.name} /> : <span>{user?.name?.[0]?.toUpperCase() || 'U'}</span>}
                    </div>
                    <h2>{user?.name || 'Student'}</h2>
                    {isOwnProfile && <p className="profile-email">{user?.email}</p>}
                    <div className="profile-badges">
                        <span className={`px-2 py-1 text-[10px] font-black uppercase border-2 ${getTierBadgeStyle(ratingTier)}`}>{ratingTier}</span>
                        <span className="profile-role">{user?.role?.replaceAll('_', ' ') || 'student'}</span>
                    </div>
                    <p className="profile-university"><Building2 size={16} aria-hidden="true" /><span>{stats?.university?.name || user?.institution || 'University not listed'}</span></p>
                    {typeof user?.bio === 'string' && user.bio.trim() && <p className="profile-bio">{user.bio}</p>}
                    {profileLinks.length > 0 && <div className="profile-socials">{profileLinks.map(link => <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="profile-text-link">{link.label}<span className="sr-only"> (opens in a new tab)</span></a>)}</div>}
                    <dl className="profile-sidebar-stats">
                        {[
                            ['Problems solved', cfStats.solvedAllTime],
                            ['Rated contests', ratingHistory.length],
                            ['Longest streak', `${stats?.longestStreak ?? 0} days`],
                            ['Campus rank', profileData.warning ? 'Unavailable' : stats?.campusRank ? `#${stats.campusRank}` : isRated ? 'Unranked' : 'Unrated'],
                        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
                    </dl>
                    <div className="profile-sidebar-actions">
                        {isOwnProfile && <Link to="/settings" className="profile-edit-button"><Pencil size={14} /> Edit profile</Link>}
                        <Link to={stats?.university?._id ? `/leaderboard/university/${stats.university._id}` : '/leaderboard'} className="profile-text-link">Campus leaderboard <ArrowUpRight size={15} /></Link>
                    </div>
                </aside>
                <div className="profile-content">
                    <section className="profile-panel">
                        <header className="profile-panel-heading"><h2>Solving activity</h2>
                            <select aria-label="Activity year" value={selectedYear} onChange={event => setSelectedYear(Number(event.target.value))} className="profile-year-picker">{availableYears.map(year => <option key={year} value={year}>{year}</option>)}</select>
                        </header>
                        <p className="profile-activity-summary"><strong>{totalYearContributions.toLocaleString()}</strong> accepted submissions in {selectedYear}</p>
                        <div className="profile-calendar">
                            <svg viewBox={`0 0 ${calendarWidth} 144`} role="img" aria-label={`${totalYearContributions} accepted submissions across ${activeDays} active days in ${selectedYear}. Activity uses UTC dates.`}>
                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => {
                                    const dayOffset = (Date.UTC(selectedYear, index, 1) - Date.UTC(selectedYear, 0, 1)) / 86400000;
                                    return <text key={month} x={44 + Math.floor((firstWeekday + dayOffset) / 7) * 15} y="12">{month}</text>;
                                })}
                                {[['Mon', 1], ['Wed', 3], ['Fri', 5]].map(([label, row]) => <text key={label} x="0" y={33 + row * 15}>{label}</text>)}
                                {displayHeatmap.map((day, index) => day && <rect key={day.date} x={44 + Math.floor(index / 7) * 15} y={24 + index % 7 * 15} width="11" height="11" rx="1" fill={activityColors[day.level]} stroke={day.level === 0 ? '#e2e8f0' : 'none'} strokeWidth=".6"><title>{day.count} accepted submissions on {day.date} (UTC)</title></rect>)}
                            </svg>
                        </div>
                        <div className="profile-activity-footer">
                            <div className="profile-activity-totals"><span>Active days <strong>{activeDays}</strong></span><span>Most in a day <strong>{bestDay}</strong></span></div>
                            <div className="profile-legend" aria-label="Activity increases from light to dark green">Less {activityColors.map(color => <span key={color} style={{ backgroundColor: color }} />)} More</div>
                        </div>
                    </section>
                    <div className="profile-bottom-grid">
                        <section className="profile-panel">
                            <header className="profile-panel-heading"><h2>Contest rating</h2><span className="profile-section-note">{ratingHistory.length} rated {ratingHistory.length === 1 ? 'contest' : 'contests'}</span></header>
                            <dl className="profile-rating-metrics">
                                <div><dt>Current</dt><dd className={!isRated ? 'profile-rating-status' : undefined}>{profileData.warning ? '—' : isRated ? rating : 'Unrated'}</dd></div>
                                <div><dt>Personal best</dt><dd>{isRated ? maxRating : '—'}</dd></div>
                                <div><dt>Last change</dt><dd className={latestChange === null || !Number.isFinite(latestChange) ? 'text-slate-400' : latestChange >= 0 ? 'text-emerald-700' : 'text-red-700'}>{latestChange !== null && Number.isFinite(latestChange) ? `${latestChange > 0 ? '+' : ''}${latestChange}` : '—'}</dd></div>
                            </dl>
                            {ratingHistory.length ? <>
                                <div className="profile-rating-chart"><ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={ratingHistory} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="contestName" fontSize={10} tickLine={false} minTickGap={30} />
                                        <YAxis fontSize={10} tickLine={false} domain={['dataMin - 100', 'dataMax + 100']} />
                                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #111', fontSize: '12px' }} />
                                        <Line name="Rating" type="linear" dataKey="newRating" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} />
                                    </LineChart>
                                </ResponsiveContainer></div>
                                <div className="overflow-x-auto"><table className="profile-contest-table">
                                    <thead><tr>{['Contest', 'Rank', 'Change'].map(label => <th key={label}>{label}</th>)}</tr></thead>
                                    <tbody>{visibleContests.map((item, index) => <tr key={item.contestId || index}>
                                        <td>{/^[a-f\d]{24}$/i.test(item.contestId || '') ? <Link to={`/contests/${item.contestId}`}>{item.contestName}</Link> : item.contestName}</td>
                                        <td className="tabular-nums">{item.rank ? `#${item.rank}` : '—'}</td><td className={`font-bold tabular-nums ${Number(item.ratingChange) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{item.ratingChange}</td>
                                    </tr>)}</tbody>
                                </table></div>
                                {ratingHistory.length > 5 && <div className="profile-expand"><button type="button" aria-expanded={showAllContests} onClick={() => setShowAllContests(value => !value)} className="profile-text-link">{showAllContests ? 'Show latest 5' : `View all ${ratingHistory.length} results`}</button></div>}
                            </> : <div className="profile-empty profile-rating-empty">
                                <Trophy size={28} strokeWidth={1.5} aria-hidden="true" /><h3>{profileData.warning ? 'Contest status unavailable' : 'No rated contest results yet'}</h3>
                                <p>{isOwnProfile ? 'Complete a rated contest to earn a campus rank. The 1000 starting rating does not count toward university rankings before your first result.' : 'This student will be eligible for competitive rankings after completing a rated contest.'}</p>
                                {isOwnProfile && <Link to="/contests" className="profile-text-link">Find a contest <ArrowUpRight size={16} /></Link>}
                            </div>}
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
