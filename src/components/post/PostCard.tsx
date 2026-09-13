"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle, Bookmark, MoreHorizontal, MapPin, Send } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { socialService } from "@/services/index";
import { useAuthStore } from "@/store/auth.store";
import { timeAgo, catColor, fmtNum, cn } from "@/lib/utils";
import toast from "react-hot-toast";

export interface PostData {
  _id: string; id?: string;
  author: { id?:string; _id?:string; username:string; name:string; avatar:{url:string}; category:string; is_verified?:boolean; isVerified?:boolean };
  caption: string;
  media: Array<{ url:string; type:"image"|"video"; public_id?:string }>;
  location: string;
  impact_tags?: string[]; impactTags?: string[];
  likes_count?: number;   likesCount?: number;
  comments_count?: number; commentsCount?: number;
  is_liked?: boolean;     isLiked?: boolean;
  created_at?: string;    createdAt?: string;
}

export default function PostCard({ post, index=99, onDeleted }: { post:PostData; index?:number; onDeleted?:(id:string)=>void }) {
  const { user } = useAuthStore();
  const likes    = post.likes_count    ?? post.likesCount    ?? 0;
  const comments = post.comments_count ?? post.commentsCount ?? 0;
  const tags     = post.impact_tags    ?? post.impactTags    ?? [];
  const liked0   = post.is_liked       ?? post.isLiked       ?? false;
  const createdAt= post.created_at     ?? post.createdAt     ?? "";
  const verified = post.author.is_verified ?? post.author.isVerified ?? false;
  const pid      = post._id || post.id || "";

  const [liked,   setLiked]   = useState(liked0);
  const [cnt,     setCnt]     = useState(likes);
  const [midx,    setMidx]    = useState(0);
  const [full,    setFull]    = useState(false);
  const [saved,   setSaved]   = useState(false);

  const handleLike = async () => {
    if (!user) { toast.error("Please log in to like"); return; }
    const prev = liked; setLiked(!liked); setCnt(c => liked ? c-1 : c+1);
    try { await socialService.toggleLike(pid, "Post"); }
    catch { setLiked(prev); setCnt(c => prev ? c+1 : c-1); }
  };

  const media = post.media ?? [];
  const cur   = media[midx];

  return (
    <article className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <Link href={`/profile/${post.author.username}`} className="flex items-center gap-3 group flex-1 min-w-0">
          <Avatar src={post.author.avatar?.url} name={post.author.name} size="sm" className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors truncate">{post.author.name}</span>
              {verified && (
                <svg className="h-4 w-4 text-emerald-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className={cn("badge text-xs", catColor(post.author.category))}>{post.author.category}</span>
            </div>
            {post.location && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" />
                {post.location}
              </p>
            )}
          </div>
        </Link>
        <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 flex-shrink-0">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Media */}
      {media.length > 0 && cur && (
        <div className="relative aspect-square bg-slate-50">
          {cur.type === "video"
            ? <video src={cur.url} controls preload="metadata" className="w-full h-full object-cover" />
            : <Image 
                src={cur.url} 
                alt={post.caption||"Post"} 
                fill 
                priority={index<2} 
                loading={index<2?"eager":"lazy"}
                className="object-cover" 
                sizes="(max-width:640px) 100vw, 640px" 
              />
          }
          {media.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {media.map((_,i) => (
                <button 
                  key={i} 
                  onClick={()=>setMidx(i)}
                  className={cn(
                    "rounded-full transition-all",
                    i===midx
                      ?"w-5 h-1.5 bg-white"
                      :"w-1.5 h-1.5 bg-white/60 hover:bg-white/80"
                  )} 
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-slate-50">
        <div className="flex items-center gap-1">
          <button 
            onClick={handleLike} 
            className={cn(
              "p-2 rounded-lg transition-all",
              liked
                ?"text-red-500 hover:bg-red-50"
                :"text-slate-600 hover:text-red-500 hover:bg-red-50"
            )}
            aria-label={liked ? "Unlike" : "Like"}
          >
            <Heart className={cn("h-5 w-5", liked&&"fill-current")} />
          </button>
          <Link 
            href={`/posts/${pid}`} 
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
            aria-label="Comment"
          >
            <MessageCircle className="h-5 w-5" />
          </Link>
          <button 
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
            aria-label="Share"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <button 
          onClick={()=>setSaved(!saved)} 
          className={cn(
            "p-2 rounded-lg transition-all",
            saved
              ?"text-emerald-600 hover:bg-emerald-50"
              :"text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          )}
          aria-label={saved ? "Unsave" : "Save"}
        >
          <Bookmark className={cn("h-5 w-5", saved&&"fill-current")} />
        </button>
      </div>

      {/* Likes */}
      {cnt > 0 && (
        <p className="px-4 pt-2 text-sm font-semibold text-slate-900">
          {fmtNum(cnt)} {cnt===1?"like":"likes"}
        </p>
      )}

      {/* Caption */}
      {post.caption && (
        <div className="px-4 py-2">
          <p className="text-sm text-slate-700">
            <Link 
              href={`/profile/${post.author.username}`} 
              className="font-semibold mr-2 text-slate-900 hover:text-emerald-600 transition-colors"
            >
              {post.author.username}
            </Link>
            <span className={cn(!full&&"line-clamp-2")}>{post.caption}</span>
          </p>
          {post.caption.length > 100 && (
            <button 
              onClick={()=>setFull(!full)} 
              className="text-xs text-slate-500 hover:text-slate-700 mt-1 font-medium"
            >
              {full?"Show less":"Show more"}
            </button>
          )}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {tags.map(t => (
            <Link 
              key={t} 
              href={`/explore?tag=${t}`} 
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
            >
              #{t}
            </Link>
          ))}
        </div>
      )}

      {/* Comments Link */}
      {comments > 0 && (
        <Link 
          href={`/posts/${pid}`} 
          className="px-4 pb-2 text-xs text-slate-500 hover:text-slate-700 block transition-colors"
        >
          View all {fmtNum(comments)} comments
        </Link>
      )}

      {/* Timestamp */}
      <p className="px-4 pb-3 text-xs text-slate-400 uppercase tracking-wide">
        {timeAgo(createdAt)}
      </p>
    </article>
  );
}
