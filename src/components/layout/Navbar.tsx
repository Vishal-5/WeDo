"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Search, Bell, PlusSquare, Home, Compass, CalendarCheck, LogOut, User, Settings, Trophy, X, Menu } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import Avatar from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import CreatePostModal from "@/components/post/CreatePostModal";
import { useChatStore } from "@/store/chat.store";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { clearChat } = useChatStore();
  const router = useRouter();
  const pathname = usePathname();
  const [showCreate, setShowCreate] = useState(false);
  const [showMenu,   setShowMenu]   = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [q,          setQ]          = useState("");
  const menuRef   = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ... (Keep existing useEffects and search function) ...
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => { if (showSearch) searchRef.current?.focus(); }, [showSearch]);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) { router.push(`/explore?q=${encodeURIComponent(q.trim())}`); setShowSearch(false); setQ(""); }
  };

  const score = user?.impact_score ?? 0;

  const links = [
    { href:"/",               icon:Home,          label:"Home" },
    { href:"/explore",        icon:Compass,       label:"Explore" },
    { href:"/events",         icon:CalendarCheck, label:"Events" },
    { href:"/leaderboard",    icon:Trophy,        label:"Leaderboard" },
    { href:"/notifications",  icon:Bell,          label:"Notifications" },
  ];

  // ✅ New handleLogout function to ensure both Auth and Chat are cleared
  const handleLogout = () => {
    clearChat(); // Wipe the bot's memory
    logout();    // Clear auth state
    router.push("/");
    setShowMenu(false);
  };

  const isLanding = pathname === "/" && !isAuthenticated;

  return (
    <>
      <nav className={cn(
        "fixed top-0 w-full z-50 transition-colors duration-300",
        isLanding ? "bg-transparent" : "glass-nav"
      )}>
        {/* Top Row: Logo, Search, Desktop Navigation Icons, User Menu */}
        <div className={cn(
          "transition-all duration-300",
          isLanding 
            ? "border-b border-white/10 bg-black/40 backdrop-blur-md text-white" 
            : "border-b border-slate-100/80 bg-white/95 backdrop-blur-md text-slate-900"
        )}>
          <div className="container-custom h-16 relative flex items-center justify-between gap-3 sm:gap-4">
            
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group z-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm overflow-hidden">
                <img src="/new.jpeg" alt="WeDoCivic" className="w-full h-full object-cover rounded-xl" />
              </div>
              <span className={cn(
                "font-semibold text-lg hidden sm:inline-block tracking-tight transition-colors",
                isLanding ? "text-white" : "text-slate-900"
              )}>
                WeDoCivic
              </span>
            </Link>

            {/* Centered Search Bar */}
            <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-full max-w-[280px] lg:max-w-[360px] z-10 pointer-events-auto">
              <form 
                onSubmit={search} 
                className="w-full"
              >
                <div className="relative w-full">
                  <Search className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-colors",
                    isLanding ? "text-white/60" : "text-slate-400"
                  )} />
                  <input 
                    value={q} 
                    onChange={e => setQ(e.target.value)} 
                    placeholder="Search people, causes, posts..."
                    className={cn(
                      "input text-sm pl-10 pr-4 py-2 w-full transition-colors shadow-xs",
                      isLanding 
                        ? "bg-white/10 border-white/20 text-white placeholder-white/60 focus:bg-white/20 focus:border-emerald-400" 
                        : "bg-slate-50/80 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500"
                    )}
                  />
                </div>
              </form>
            </div>

            {/* Right Section: Desktop Nav Icons + Avatar */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0 z-10">
              {isAuthenticated ? (
                <>
                  {/* Desktop Right Nav Icons: Home, Explore, Events, Leaderboard, Notifications, Create */}
                  <div className="hidden md:flex items-center gap-1 lg:gap-2 mr-1">
                    {links.map(({ href, icon: Icon, label }) => {
                      const isActive = pathname === href;
                      return (
                        <Link 
                          key={href} 
                          href={href} 
                          title={label}
                          aria-label={label}
                          className={cn(
                            "relative p-2 rounded-xl transition-all duration-200 flex items-center justify-center group",
                            isActive 
                              ? "text-emerald-600" 
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                          )}
                        >
                          <Icon className="h-5 w-5 transition-transform group-hover:scale-105" strokeWidth={isActive ? 2.25 : 1.85} />
                          {isActive && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                          )}
                        </Link>
                      );
                    })}

                    {/* Create Button */}
                    <button 
                      onClick={() => setShowCreate(true)} 
                      title="Create"
                      aria-label="Create post"
                      className="relative p-2 rounded-xl text-slate-600 hover:text-emerald-600 hover:bg-emerald-50/80 transition-all duration-200 flex items-center justify-center group"
                    >
                      <PlusSquare className="h-5 w-5 transition-transform group-hover:scale-105" strokeWidth={1.85} />
                    </button>
                  </div>

                  {/* Mobile Search Toggle */}
                  <button 
                    onClick={() => setShowSearch(!showSearch)} 
                    className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    aria-label="Toggle search"
                  >
                    <Search className="h-5 w-5 text-slate-600" />
                  </button>

                  {/* Mobile Menu Toggle */}
                  <button 
                    onClick={() => setShowMenu(!showMenu)} 
                    className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                    aria-label="Menu"
                  >
                    <Menu className="h-5 w-5" />
                  </button>

                  {/* Avatar Dropdown */}
                  <div className="relative" ref={menuRef}>
                    <button 
                      onClick={() => setShowMenu(!showMenu)}
                      className="rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all flex items-center"
                      aria-label="User menu"
                    >
                      <Avatar src={user?.avatar?.url} name={user?.name} size="sm" />
                    </button>

                    {showMenu && (
                      <div className="absolute right-0 top-14 w-60 bg-white border border-slate-200 rounded-xl shadow-dropdown overflow-hidden animate-scale-in z-50">
                        {/* User Info Header */}
                        <div className="px-4 py-3.5 bg-slate-50 border-b border-slate-200">
                          <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">@{user?.username}</p>
                          <p className="text-xs text-emerald-600 font-medium mt-1.5">⚡ {score.toLocaleString()} impact pts</p>
                        </div>
                        
                        {/* Mobile Nav Links */}
                        <div className="md:hidden border-b border-slate-200">
                          {links.map(({href, icon: Icon, label}) => (
                            <Link 
                              key={href} 
                              href={href} 
                              onClick={() => setShowMenu(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <Icon className="h-4 w-4 text-slate-400" /> {label}
                            </Link>
                          ))}
                          <button
                            onClick={() => { setShowMenu(false); setShowCreate(true); }}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors w-full text-left font-medium"
                          >
                            <PlusSquare className="h-4 w-4 text-emerald-600" /> Create Post
                          </button>
                        </div>

                        {/* Menu Links */}
                        <Link 
                          href={`/profile/${user?.username}`} 
                          onClick={() => setShowMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <User className="h-4 w-4 text-slate-400" /> Profile
                        </Link>
                        <Link 
                          href="/settings" 
                          onClick={() => setShowMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Settings className="h-4 w-4 text-slate-400" /> Settings
                        </Link>

                        {user?.role === "admin" && (
                          <Link 
                            href="/admin" 
                            onClick={() => setShowMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-purple-600 hover:bg-purple-50 transition-colors"
                          >
                            <Settings className="h-4 w-4" /> Admin Panel
                          </Link>
                        )}

                        <div className="border-t border-slate-200" />
                        
                        {/* Logout Button */}
                        <button 
                          onClick={handleLogout}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                        >
                          <LogOut className="h-4 w-4" /> Log out
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link 
                    href="/login" 
                    className={cn(
                      "text-sm font-medium px-4 py-2 transition-colors whitespace-nowrap",
                      isLanding 
                        ? "text-white/90 hover:text-white" 
                        : "text-slate-700 hover:text-emerald-600"
                    )}
                  >
                    Log in
                  </Link>
                  <Link 
                    href="/register" 
                    className="btn btn-primary text-sm whitespace-nowrap shadow-md hover:shadow-emerald-500/20"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search Overlay */}
        {showSearch && (
          <div className={cn(
            "md:hidden absolute top-16 left-0 right-0 border-b shadow-dropdown animate-slide-down z-40",
            isLanding ? "bg-zinc-900/95 border-zinc-800 backdrop-blur-md" : "bg-white border-slate-200"
          )}>
            <div className="container-custom py-3">
              <form onSubmit={search} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input 
                  ref={searchRef}
                  value={q} 
                  onChange={e => setQ(e.target.value)} 
                  placeholder="Search people, causes, posts..."
                  className={cn(
                    "input text-sm pl-10 pr-10",
                    isLanding ? "bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400" : ""
                  )}
                />
                <button 
                  type="button"
                  onClick={() => {setShowSearch(false); setQ("");}}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="Close search"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </form>
            </div>
          </div>
        )}
      </nav>

      {/* Spacer for fixed single-row navbar: hidden on landing page so background covers full screen */}
      {!isLanding && <div className="h-16" />}

      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
    </>
  );
}
