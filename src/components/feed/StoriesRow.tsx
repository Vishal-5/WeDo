"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { userService } from "@/services/index"; 
import { useAuthStore } from "@/store/auth.store";
import Avatar from "@/components/ui/Avatar";

export default function StoriesRow() {
  const { user } = useAuthStore();
  const [following, setFollowing] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id && !user?._id) return; 
    const uid = user.id || user._id;

    userService.getFollowing(uid)
      .then(({ data }) => {
        if (data.success) setFollowing(data.following || data.users || []);
      })
      .catch((err) => console.error("Stories failed to load:", err));
  }, [user]);

  if (!user) return null;

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center gap-4 overflow-x-auto scrollbar-thin">

        {/* Your Story */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-slate-200 p-0.5 transition-transform group-hover:scale-105">
              <Avatar
                src={user.avatar?.url}
                name={user.name || "Me"}
                className="w-full h-full rounded-full"
              />
            </div>

            <div className="absolute bottom-0 right-0 bg-emerald-600 rounded-full p-1 border-2 border-white text-white">
              <Plus className="h-3 w-3 stroke-[3]" />
            </div>
          </div>
          <span className="text-xs font-medium text-slate-600">Your Story</span>
        </div>

        {/* Following Stories */}
        {following.map((u) => (
          <Link
            key={u.id || u._id}
            href={`/profile/${u.username}`}
            className="flex flex-col items-center gap-2 flex-shrink-0 group"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-400 via-emerald-500 to-green-500 p-0.5 transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-white rounded-full p-0.5">
                <Avatar
                  src={u.avatar?.url}
                  name={u.name}
                  className="w-full h-full rounded-full"
                />
              </div>
            </div>

            <span className="text-xs font-medium text-slate-600 truncate w-16 text-center">
              {u.name.split(" ")[0]}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
