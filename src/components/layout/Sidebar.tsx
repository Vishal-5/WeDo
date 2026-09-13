"use client";
import Link from "next/link";
import { useState } from "react";
import { Zap, Flame, TrendingUp } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import Avatar from "@/components/ui/Avatar";
import ConnectionsModal from "../modals/ConnectionsModal"; 
import { impactTier, fmtNum, cn } from "@/lib/utils";

export default function Sidebar() {
  const { user } = useAuthStore();
  
  // Modal State
  const [isConnOpen, setIsConnOpen] = useState(false);

  if (!user) return null;

  // Formatting score to 1 decimal place
  const score   = Number(user.impact_score || 0).toFixed(1);
  const posts   = user.posts_count    ?? 0;
  const foll    = user.followers_count ?? 0;
  const folling = user.following_count ?? 0;
  const streak  = user.claim_streak   ?? 0;
  const canClaim= user.can_claim_today ?? false;
  const tier    = impactTier(Number(score));

  return (
    <aside className="w-80 shrink-0 hidden lg:block space-y-4">
      {/* Profile Card */}
      <div className="card">
        <div className="h-24 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-t-xl" />
        <div className="px-5 pb-5">
          <div className="-mt-12 mb-3">
            <Link href={`/profile/${user.username}`}>
              <Avatar src={user.avatar?.url} name={user.name} size="lg" className="ring-4 ring-white shadow-sm" />
            </Link>
          </div>
          
          <Link href={`/profile/${user.username}`} className="group block mb-4">
            <p className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors text-base">{user.name}</p>
            <p className="text-sm text-slate-500">@{user.username}</p>
          </Link>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[["Posts", posts, false], ["Followers", foll, true], ["Following", folling, true]].map(([l, v, clickable]) => (
              <button
                key={l as string}
                onClick={clickable ? () => setIsConnOpen(true) : undefined}
                disabled={!clickable}
                className={cn(
                  "text-center py-2.5 rounded-lg transition-all",
                  clickable
                    ? "bg-slate-50 hover:bg-emerald-50 cursor-pointer"
                    : "bg-slate-50 cursor-default"
                )}
              >
                <p className="font-semibold text-base text-slate-900">
                  {fmtNum(v as number)}
                </p>
                <p className="text-xs text-slate-500">{l}</p>
              </button>
            ))}
          </div>

          {/* Impact Score */}
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-slate-700">Impact Score</span>
              </div>
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", 
                "bg-white/60 text-emerald-700")}>{tier.label}</span>
            </div>
            <p className="text-2xl font-bold text-emerald-700 mb-2">{score} pts</p>
            <div className="h-2 bg-white/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-500"
                style={{width:`${Math.min((Number(score)%100)/100*100,100)}%`}}
              />
            </div>
          </div>

          {/* Streak */}
          {streak > 0 && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2.5 bg-orange-50 rounded-xl border border-orange-200">
              <Flame className="h-5 w-5 text-orange-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-700">{streak} day streak!</p>
                <p className="text-xs text-orange-600">Keep it going</p>
              </div>
            </div>
          )}

          {/* Daily Points CTA */}
          <Link 
            href={`/profile/${user.username}`}
            className={cn(
              "mt-3 w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all",
              canClaim 
                ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm" 
                : "bg-slate-100 text-slate-500 cursor-default"
            )}
          >
            <Zap className="h-4 w-4" />
            {canClaim ? "Claim Daily Points!" : "Points claimed ✓"}
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3">
        <p className="text-xs text-slate-400">
          © 2026 WeDoCivic · <Link href="/about" className="hover:text-emerald-600 transition-colors">About</Link>
        </p>
      </div>
      
      {/* Connections Modal */}
      <ConnectionsModal 
        isOpen={isConnOpen} 
        onClose={() => setIsConnOpen(false)} 
        userId={user.id || user._id} 
      />
    </aside>
  );
}
