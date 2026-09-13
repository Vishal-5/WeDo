"use client";
import { useEffect, useState, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import PostCard, { PostData } from "@/components/post/PostCard";
import { postService, groupService, userService } from "@/services/index";
import { useAuthStore } from "@/store/auth.store";
import Sidebar from "@/components/layout/Sidebar";
import StoriesRow from "@/components/feed/StoriesRow";
import CreateGroupModal from "@/components/groups/CreateGroupModal";
import Avatar from "@/components/ui/Avatar";
import { Loader2, ArrowRight, Users, Plus, Search, AtSign, Trash2, Mail, ShieldCheck, Globe, Trophy } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Hero from "@/components/hero/Hero";
import SocialToggleSlider from "@/components/feed/SocialToggleSlider";

const ModelSection = dynamic(() => import("@/components/three/ModelSection"), { ssr: false });

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  
  // --- ISOLATED DISCOVERY STATES ---
  const [normalDiscGroups, setNormalDiscGroups] = useState<any[]>([]);
  const [officialDiscGroups, setOfficialDiscGroups] = useState<any[]>([]);
  const [communityDiscGroups, setCommunityDiscGroups] = useState<any[]>([]);
  
  // Full data arrays (for View All)
  const [allOfficialDiscGroups, setAllOfficialDiscGroups] = useState<any[]>([]);
  const [showAllOfficial, setShowAllOfficial] = useState(false);
  
  const [allCommunityDiscGroups, setAllCommunityDiscGroups] = useState<any[]>([]);
  const [showAllCommunity, setShowAllCommunity] = useState(false);
  
  const [invitations, setInvitations] = useState<any[]>([]);

  const [myGroupsSearch, setMyGroupsSearch] = useState("");
  const [discSearch, setDiscSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"group" | "official" | "community">("group");

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const { ref, inView } = useInView({ threshold: 0.1 });

  // --- DATA FETCHING ---

  const loadPosts = useCallback(async (p: number) => {
    try {
      const { data } = await postService.getFeed(p);
      if (p === 1) setPosts(data.posts);
      else setPosts(prev => [...prev, ...data.posts]);
      setHasMore(data.pagination?.hasMore ?? false);
    } catch { } finally { setLoading(false); }
  }, []);

  // FIX: Fetch all 3 separated routes simultaneously!
  const fetchGroups = useCallback(async (discQuery = "") => {
    try {
      const [myGroupsRes, normRes, offRes, commRes, invitesRes] = await Promise.allSettled([
        groupService.getUserGroups(),
        groupService.getDiscoverGroups(discQuery, "normal"),
        groupService.getDiscoverGroups(discQuery, "official"),
        groupService.getDiscoverGroups(discQuery, "community"),
        groupService.getMyInvitations
          ? groupService.getMyInvitations()
          : Promise.resolve({ data: { success: false, invitations: [] } }),
      ]);

      if (myGroupsRes.status === "fulfilled" && myGroupsRes.value.data.success)
        setMyGroups(myGroupsRes.value.data.groups);

      if (normRes.status === "fulfilled" && normRes.value.data.success)
        setNormalDiscGroups(normRes.value.data.groups.slice(0, 4));

      if (offRes.status === "fulfilled" && offRes.value.data.success) {
        const allGroups = offRes.value.data.groups;
        setAllOfficialDiscGroups(allGroups);
        setOfficialDiscGroups(allGroups.slice(0, 4));
      }

      if (commRes.status === "fulfilled" && commRes.value.data.success) {
        const allGroups = commRes.value.data.groups;
        setAllCommunityDiscGroups(allGroups);
        setCommunityDiscGroups(allGroups.slice(0, 4));
      }

      if (invitesRes.status === "fulfilled" && invitesRes.value.data?.success)
        setInvitations(invitesRes.value.data.invitations);

    } catch (e) {
      console.error("Failed to fetch groups", e);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setTimeout(() => fetchGroups(discSearch), 400);
    return () => clearTimeout(timer);
  }, [discSearch, isAuthenticated, fetchGroups]);

  const handleRespondInvite = async (inviteId: string, accept: boolean) => {
    try {
      const { data } = await groupService.respondToInvitation(inviteId, accept);
      if (data.success) fetchGroups(discSearch);
    } catch (err) {
      console.error("Failed to respond to invite:", err);
    }
  };

  const handleDeleteGroup = async (e: React.MouseEvent, groupId: string, groupName: string) => {
    e.preventDefault();
    if (!window.confirm(`Are you sure you want to delete "${groupName}"? This will remove all members and messages forever.`)) return;
    try {
      const { data } = await groupService.deleteGroup(groupId);
      if (data.success) fetchGroups(discSearch);
    } catch (err) {
      console.error("Failed to delete group:", err);
    }
  };

  const handleJoin = async (groupId: string) => {
    try {
      const { data } = await groupService.joinGroup(groupId);
      if (data.success) {
        alert(data.message);
        fetchGroups(discSearch);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || "Failed to join group.";
      alert(errorMessage);
    }
  };

  const filteredMyGroups = myGroups.filter(g => {
    const search = myGroupsSearch.toLowerCase();
    const name = (g.name ?? "").toLowerCase();
    const slug = (g.slug ?? "").toLowerCase();
    return name.includes(search) || slug.includes(search);
  });

  // Strict split — each group appears in exactly one category
  const normalMyGroups   = filteredMyGroups.filter(g => !g.is_official && !g.is_community);
  const officialMyGroups = filteredMyGroups.filter(g =>  g.is_official && !g.is_community);
  const communityMyGroups = filteredMyGroups.filter(g => g.is_community);

  const hasOfficialGroup = officialMyGroups.length > 0;

  useEffect(() => {
    if (isAuthenticated) loadPosts(1);
    else setLoading(false);
  }, [isAuthenticated, loadPosts]);

  useEffect(() => {
    if (inView && hasMore && !loading && isAuthenticated) {
      const n = page + 1;
      setPage(n);
      loadPosts(n);
    }
  }, [inView, hasMore, loading, isAuthenticated, page, loadPosts]);

  if (!isAuthenticated) return <Landing />;

  // --- CONNECT TAB ---
  const connectContent = (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8 justify-center">
      <main className="feed-w w-full max-w-[640px] space-y-6">
        <StoriesRow />
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
            <p className="text-sm text-slate-500">Loading your feed…</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <p className="text-3xl">🌱</p>
            </div>
            <h3 className="font-semibold text-slate-900 text-lg mb-2">Your feed is empty</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">Follow people doing great work in your community to see their posts here.</p>
            <Link href="/explore" className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
              Discover People <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            {posts.map((p, i) => (
              <PostCard
                key={p._id || p.id}
                post={p}
                index={i}
                onDeleted={id => setPosts(prev => prev.filter(x => (x._id || x.id) !== id))}
              />
            ))}
            {hasMore && <div ref={ref} className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>}
            {!hasMore && posts.length > 0 && <p className="text-center text-sm text-slate-400 py-6">You&apos;re all caught up! 🎉</p>}
          </>
        )}
      </main>
      <Sidebar />
    </div>
  );

  // --- GROUP TAB ---
  const groupContent = (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 card p-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Users className="text-emerald-600 h-5 w-5" /> Citizen Hubs
          </h2>
          <p className="text-slate-600 text-sm mt-1">Join local initiatives or start your own movement.</p>
        </div>
        <button
          onClick={() => { setModalType("group"); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" /> Create Group
        </button>
      </div>

      {invitations.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-amber-900 flex items-center gap-2 mb-4 text-sm">
            <Mail className="h-4 w-4" /> Pending Invitations
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {invitations.map(inv => (
              <div key={inv.id} className="bg-white p-4 rounded-xl shadow-sm border border-amber-100 flex flex-col gap-3">
                <p className="text-sm text-slate-700 leading-snug">
                  <span className="font-semibold">{inv.inviter_name}</span> invited you to join{" "}
                  <span className="font-semibold text-emerald-600">{inv.group_name}</span>
                </p>
                <div className="flex gap-2 mt-auto pt-2">
                  <button onClick={() => handleRespondInvite(inv.id, false)} className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Decline</button>
                  <button onClick={() => handleRespondInvite(inv.id, true)} className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all">Accept</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Your Groups */}
        <div className="card p-6 min-h-[400px] flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Your Groups</h3>
              <span className="text-xs text-slate-500">{normalMyGroups.length} groups</span>
            </div>
            <div className="relative w-full sm:w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Filter groups..." value={myGroupsSearch} onChange={e => setMyGroupsSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
            </div>
          </div>
          {normalMyGroups.length > 0 ? (
            <div className="space-y-3">
              {normalMyGroups.map(g => (
                <Link href={`/groups/${g.slug}`} key={g.id || g._id}>
                  <div className="group flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Avatar src={g.avatar_url} name={g.name} size="sm" />
                      <div>
                        <h4 className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors text-sm">{g.name}</h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1"><AtSign className="h-3 w-3" />{g.slug ?? "—"}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-xs font-medium text-slate-600">{g.members_count} members</span>
                      {g.creator_id === user?.id ? (
                        <button onClick={e => handleDeleteGroup(e, g.id, g.name)} className="text-xs text-red-600 font-medium hover:text-red-700 flex items-center gap-1 transition-colors hover:bg-red-50 px-2 py-1 rounded">
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium">Member</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-lg">
              <Users className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium text-sm">No citizen hubs joined yet</p>
              <p className="text-slate-400 text-xs mt-1">Discover and join groups on the right</p>
            </div>
          )}
        </div>

        {/* Discover Normal */}
        <div className="card p-6 min-h-[400px] flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 text-base">Discover Groups</h3>
              <Link href="/explore/groups" className="text-emerald-600 text-xs font-semibold hover:underline">View All</Link>
            </div>
            <div className="relative w-full sm:w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search groups..." value={discSearch} onChange={e => setDiscSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
            </div>
          </div>
          {normalDiscGroups.length > 0 ? (
            <div className="space-y-3">
              {normalDiscGroups.map(g => {
                const isMember = myGroups.some(mg => mg.id === g.id);
                return (
                  <div key={g.id || g._id} className="group flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all">
                    <Link href={`/groups/${g.slug}`} className="flex items-center gap-3 flex-1">
                      <Avatar src={g.avatar_url} name={g.name} size="sm" />
                      <div>
                        <h4 className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors text-sm">{g.name}</h4>
                        <p className="text-xs text-slate-500">@{g.slug ?? "—"}</p>
                      </div>
                    </Link>
                    {isMember ? (
                      <span className="text-xs font-medium text-slate-400 px-3">Member ✓</span>
                    ) : (
                      <button onClick={() => handleJoin(g.id)} className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-all shadow-sm">
                         Join</button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-lg">
              <Search className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium text-sm">No groups found</p>
              <p className="text-slate-400 text-xs mt-1">Try adjusting your search</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // --- OFFICIAL TAB ---
  const officialContent = (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 card p-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="text-blue-600 h-5 w-5" /> Official Hubs
          </h2>
          <p className="text-slate-600 text-sm mt-1">Connect with verified municipal authorities and city officials.</p>
        </div>
        {user?.role === "authority" && (
          <button onClick={() => { setModalType("official"); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-sm">
            <Plus className="h-4 w-4" /> Create Official Hub
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Your Official Hubs */}
        <div className="card p-6 min-h-[400px] flex flex-col">
          <div className="mb-5">
            <h3 className="font-semibold text-slate-900 text-base">Your Official Hubs</h3>
            <span className="text-xs text-slate-500">{officialMyGroups.length} groups</span>
          </div>
          {officialMyGroups.length > 0 ? (
            <div className="space-y-3">
              {officialMyGroups.map(g => (
                <Link href={`/groups/${g.slug}`} key={g.id || g._id}>
                  <div className="group flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center text-blue-700 font-bold text-lg">{(g.name ?? "?")[0]}</div>
                      <div>
                        <h4 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors flex items-center gap-1 text-sm">
                          {g.name} <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        </h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1"><AtSign className="h-3 w-3" />{g.slug ?? "—"}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-xs font-medium text-amber-600 flex items-center gap-1"><Trophy className="h-3 w-3" /> {g.total_points || 0} pts</span>
                      <span className="text-xs font-medium text-slate-600">{g.members_count} members</span>
                      {g.creator_id === user?.id ? (
                        <button onClick={e => handleDeleteGroup(e, g.id, g.name)} className="text-xs text-red-600 font-medium hover:text-red-700 flex items-center gap-1 transition-colors hover:bg-red-50 px-2 py-1 rounded">
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium">Member</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-lg">
              <ShieldCheck className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium text-sm">No official hubs joined yet</p>
              <p className="text-slate-400 text-xs mt-1">Discover official groups on the right</p>
            </div>
          )}
        </div>

        {/* Discover Official */}
        <div className="card p-6 min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-900 text-base">Discover Official</h3>
            {allOfficialDiscGroups.length > 4 && (
              <button 
                onClick={() => {
                  if (showAllOfficial) {
                    setOfficialDiscGroups(allOfficialDiscGroups.slice(0, 4));
                    setShowAllOfficial(false);
                  } else {
                    setOfficialDiscGroups(allOfficialDiscGroups);
                    setShowAllOfficial(true);
                  }
                }}
                className="text-blue-600 text-xs font-semibold hover:underline"
              >
                {showAllOfficial ? "Show Less" : "View All"}
              </button>
            )}
          </div>
          {officialDiscGroups.length > 0 ? (
            <div className="space-y-3">
              {officialDiscGroups.map(g => {
                const isMember = myGroups.some(mg => mg.id === g.id);
                return (
                  <div key={g.id || g._id} className="group flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all">
                    <Link href={`/groups/${g.slug}`} className="flex items-center gap-3 flex-1">
                      <Avatar src={g.avatar_url} name={g.name} size="sm" />
                      <div>
                        <h4 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors flex items-center gap-1 text-sm">
                          {g.name} <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        </h4>
                        <p className="text-xs text-slate-500">@{g.slug ?? "—"}</p>
                      </div>
                    </Link>
                    {isMember ? (
                      <span className="text-xs font-medium text-slate-400 px-3">Member ✓</span>
                    ) : (
                      <button onClick={() => handleJoin(g.id)} disabled={hasOfficialGroup}
                        title={hasOfficialGroup ? "You can only join one Official Hub" : ""}
                        className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${hasOfficialGroup ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"}`}>
                        Join
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-lg">
              <Search className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium text-sm">No official hubs available</p>
              <p className="text-slate-400 text-xs mt-1">Check back later</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // --- COMMUNITY TAB ---
  const communityContent = (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 card p-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Globe className="text-purple-600 h-5 w-5" /> Community Networks
          </h2>
          <p className="text-slate-600 text-sm mt-1">Large-scale networks containing multiple official groups.</p>
        </div>
        {user?.role === "authority" && (
          <button onClick={() => { setModalType("community"); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-all shadow-sm">
            <Plus className="h-4 w-4" /> Create Community
          </button>
        )}
      </div>

      <div>
        {/* Discover Communities */}
        <div className="card p-6 min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-900 text-base">Discover Communities</h3>
            {allCommunityDiscGroups.length > 4 && (
              <button 
                onClick={() => {
                  if (showAllCommunity) {
                    setCommunityDiscGroups(allCommunityDiscGroups.slice(0, 4));
                    setShowAllCommunity(false);
                  } else {
                    setCommunityDiscGroups(allCommunityDiscGroups);
                    setShowAllCommunity(true);
                  }
                }}
                className="text-purple-600 text-xs font-semibold hover:underline"
              >
                {showAllCommunity ? "Show Less" : "View All"}
              </button>
            )}
          </div>
          {communityDiscGroups.length > 0 ? (
            <div className="space-y-3">
              {communityDiscGroups.map(g => {
                const isMember = myGroups.some(mg => mg.id === g.id);
                return (
                  <div key={g.id || g._id} className="group flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all">
                    <Link href={`/groups/${g.slug}`} className="flex items-center gap-3 flex-1">
                      <Avatar src={g.avatar_url} name={g.name} size="sm" />
                      <div>
                        <h4 className="font-semibold text-slate-900 group-hover:text-purple-700 transition-colors flex items-center gap-1 text-sm">
                          {g.name} <Globe className="w-3.5 h-3.5 text-purple-600" />
                        </h4>
                        <p className="text-xs text-slate-500">@{g.slug ?? "—"}</p>
                      </div>
                    </Link>
                    {isMember ? (
                      <span className="text-xs font-medium text-slate-400 px-3">Member ✓</span>
                    ) : (
                      <span className="text-xs font-medium text-purple-600 px-3 py-1.5 bg-purple-50 rounded-lg">View Only</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-lg">
              <Search className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium text-sm">No communities available</p>
              <p className="text-slate-400 text-xs mt-1">Check back later</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent pt-6">
      <div className="max-w-6xl mx-auto px-4">
        {/* FIX: Removed activeTab prop, passing only the rendered content */}
        <SocialToggleSlider
          connectContent={connectContent}
          groupContent={groupContent}
          officialContent={officialContent}
          communityContent={communityContent}
        />
      </div>

      <CreateGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUser={user}
        onSuccess={() => fetchGroups(discSearch)}
        modalType={modalType}
      />
    </div>
  );
}

function Landing() {
  return (
    <div className="bg-black min-h-screen overflow-x-hidden">
      <Hero />
      <ModelSection />
    </div>
  );
}