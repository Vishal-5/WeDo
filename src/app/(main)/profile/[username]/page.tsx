"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Globe, Grid3X3, CalendarDays, Settings, UserPlus, UserMinus, Loader2, Flame, Lock, CheckCircle2, Camera, SwitchCamera } from "lucide-react";
import { userService, postService, socialService } from "@/services/index";
import { useAuthStore } from "@/store/auth.store";
import { formatDate, catColor, impactTier, fmtNum, cn } from "@/lib/utils";
import ConnectionsModal from "@/components/modals/ConnectionsModal";
import type { PostData } from "@/components/post/PostCard";
import toast from "react-hot-toast";
import api from "@/lib/api";

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: me, setUser } = useAuthStore();
  const [profile,     setProfile]     = useState<any>(null);
  const [posts,       setPosts]       = useState<PostData[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [fLoading,    setFLoading]    = useState(false);
  const [claiming,    setClaiming]    = useState(false);
  const [showPts,     setShowPts]     = useState(false);
  const [lastPts,     setLastPts]     = useState(0);

  // --- CONNECTION MODAL STATE ---
  const [isConnOpen, setIsConnOpen] = useState(false);
  
  const isOwn = me?.username === username;

  // --- SMART LENS STATE ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState("none");
  const [results, setResults] = useState<any[]>([]); 
  const [selectedItems, setSelectedItems] = useState<number[]>([]); 
  const [status, setStatus] = useState("Ready");
  const [isScanning, setIsScanning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [pointsData, setPointsData] = useState({ total_points: 0, breakdown: [] as any[] });
  const [retryTimer, setRetryTimer] = useState(0);

  // --- PROFILE DATA FETCH ---
  useEffect(() => {
    setLoading(true);
    userService.getProfile(username)
      .then(async ({ data }) => {
        setProfile(data.user); setIsFollowing(data.isFollowing ?? false);
        const uid = data.user.id || data.user._id;
        if (uid) { const { data: pd } = await postService.getUserPosts(uid); setPosts(pd.posts ?? []); }
      })
      .catch(() => toast.error("Profile not found"))
      .finally(() => setLoading(false));
  }, [username]);

  // --- SMART LENS LOGIC ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (retryTimer > 0) interval = setInterval(() => setRetryTimer((prev) => prev - 1), 1000);
    return () => { stopCamera(); if (interval) clearInterval(interval); };
  }, [retryTimer]);

  const startCamera = async (targetFacingMode: "user" | "environment" = facingMode) => {
    try {
      stopCamera();
      
      let stream: MediaStream | null = null;
      try {
        // 1. Request preferred front/rear camera
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: { ideal: targetFacingMode },
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 }
          }, 
          audio: false 
        });
      } catch (e1) {
        try {
          // 2. Direct string facingMode
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: targetFacingMode }, 
            audio: false 
          });
        } catch (e2) {
          try {
            // 3. Fallback: query video devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === "videoinput");
            const matchedDevice = videoDevices.find(d => {
              const label = (d.label || "").toLowerCase();
              return targetFacingMode === "user" 
                ? (label.includes("front") || label.includes("user") || label.includes("selfie"))
                : (label.includes("back") || label.includes("rear") || label.includes("environment"));
            });

            if (matchedDevice && matchedDevice.deviceId) {
              stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: matchedDevice.deviceId } },
                audio: false
              });
            } else {
              stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            }
          } catch (e3) {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          }
        }
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPreviewType("camera"); 
      setCameraOn(true); 
      setStatus(`Camera ready (${targetFacingMode === "user" ? "Front Camera" : "Rear Camera"})`);
    } catch (error) { 
      setStatus("Camera access failed. Check permissions."); 
    }
  };

  const toggleFacingMode = async () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    if (cameraOn) {
      await startCamera(nextMode);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOn(false); setIsRecording(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current; 
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640; 
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if(ctx) {
      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setCapturedImage(canvas.toDataURL("image/jpeg", 0.85));
      setPreviewType("captured"); 
      setStatus("Image captured. Verify to see items.");
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    setRecordedChunks([]);
    const recorder = new MediaRecorder(streamRef.current, { mimeType: "video/webm;codecs=vp8" });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) setRecordedChunks((p) => [...p, e.data]); };
    recorder.start(); mediaRecorderRef.current = recorder;
    setIsRecording(true); setStatus("Recording disposal...");
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); setIsRecording(false); setStatus("Recording complete.");
    }
  };

  const toggleItemSelection = (index: number) => {
    if (results[index].processed) return; 
    setSelectedItems((prev) => prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]);
  };

  const dataURLtoFile = (dataUrl: string, filename: string) => {
    const arr = dataUrl.split(","); const mime = arr[0].match(/:(.*?);/)?.[1]; 
    const bstr = atob(arr[1]); let n = bstr.length; const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  const verifyImage = async () => {
    if (!capturedImage) return setStatus("Capture a photo first!");
    if (retryTimer > 0) return setStatus(`API Cooling down: Wait ${retryTimer}s`);
    try {
      setIsScanning(true); setStatus("Analyzing...");
      const formData = new FormData();
      formData.append("file", dataURLtoFile(capturedImage, "garbage.jpg"));
      
      const res = await api.post("/users/detect", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const newItems = (res.data.items || []).map((item:any) => ({ ...item, processed: false }));
      setResults((prev) => [...prev, ...newItems]);
      setStatus("Items added. Select to verify action or points.");
    } catch (e: any) { 
        if(e?.response?.status === 429) setRetryTimer(35);
        setStatus("Scan failed"); 
    } finally { setIsScanning(false); }
  };

  const verifyAction = async () => {
    if (recordedChunks.length === 0 || selectedItems.length === 0) return setStatus("Record a video and select items first!");
    try {
      setIsScanning(true);
      const formData = new FormData();
      if(capturedImage) formData.append("file", dataURLtoFile(capturedImage, "reference.jpg"));
      formData.append("video", new Blob(recordedChunks, { type: "video/webm" }), "action.webm");
      const targets = results.filter((_, idx) => selectedItems.includes(idx)).map(i => i.class || i.class_name);
      formData.append("targets", JSON.stringify(targets)); 

      const res = await api.post("/users/detect", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setStatus(res.data.items?.length > 0 ? "Action Verified!" : "Action not detected.");
    } catch (e) { setStatus("Verification error"); } finally { setIsScanning(false); }
  };

  const calculatePoints = async () => {
  if (selectedItems.length === 0) return setStatus("Select items first!");
  try {
    setStatus("Calculating...");
    const itemsToProcess = results.filter((_, idx) => selectedItems.includes(idx));
    const res = await api.post("/users/calculate_points", itemsToProcess);
    
    setResults(prev => prev.map((item, idx) => selectedItems.includes(idx) ? { ...item, processed: true } : item));
    
    setPointsData(prev => ({ 
      total_points: Number((prev.total_points + res.data.total_points).toFixed(2)), 
      breakdown: [...prev.breakdown, ...res.data.breakdown] 
    }));
    
    setSelectedItems([]); 
    setStatus(`Success! Added ${res.data.total_points} points.`);
   } catch (e) { 
    setStatus("Calculation failed"); 
   }
  };

  const saveResultToProfile = async () => {
    if (pointsData.total_points <= 0) return setStatus("No Aura Points to save! Add items to total first.");
    setClaiming(true);
    try {
      setStatus("Syncing Aura Points...");
      const { data } = await api.post("/users/claim-points", { amount: pointsData.total_points });
      
      setLastPts(data.points_awarded); setShowPts(true); setTimeout(() => setShowPts(false), 1500);
      setProfile((p:any) => p ? { ...p, impact_score: data.new_score, can_claim_today: false, claim_streak: data.streak } : p);
      if (me) setUser({ ...me, impact_score: data.new_score, can_claim_today: false });
      toast.success(`🎉 +${data.points_awarded} pts! Streak: ${data.streak} day${data.streak>1?"s":""}`, { duration: 4000 });
      
      setIsModalOpen(false); setCapturedImage(null); setPreviewType("none");
      setResults([]); setSelectedItems([]); setPointsData({ total_points: 0, breakdown: [] }); stopCamera();
    } catch (error: any) {
      setStatus("Save failed. Check backend connection.");
      const detail = error?.response?.data?.detail;
      const errorMessage = Array.isArray(detail) ? detail[0].msg : (typeof detail === "string" ? detail : "Failed to claim");
      toast.error(errorMessage);
    } finally { 
      setClaiming(false); 
    }
  };

  const handleFollow = async () => {
    if (!me) { toast.error("Please log in first"); return; }
    setFLoading(true);
    try {
      const { data } = await socialService.toggleFollow(profile.id || profile._id);
      setIsFollowing(data.following);
      setProfile((p:any) => p ? { ...p, followers_count: (p.followers_count??0) + (data.following ? 1 : -1) } : p);
    } catch { toast.error("Failed"); } finally { setFLoading(false); }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-sm text-slate-500">Loading profile…</p>
      </div>
    </div>
  );

  if (!profile) return <div className="text-center py-20"><div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"><p className="text-3xl">😕</p></div><h2 className="text-xl font-semibold text-slate-900 mb-2">User not found</h2><Link href="/" className="text-emerald-600 text-sm font-medium hover:underline">← Return Home</Link></div>;

  const tier = impactTier(profile.impact_score ?? 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in relative">
      <div className="card overflow-hidden mb-6">
        <div className="h-40 bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-600 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{backgroundImage:"radial-gradient(circle at 20% 80%,white 2px,transparent 2px)",backgroundSize:"32px 32px"}} />
        </div>
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-16 mb-4">
            <div className="relative">
              <div className="w-28 h-28 rounded-xl ring-4 ring-white overflow-hidden bg-emerald-100 shadow-md">
                {profile.avatar?.url
                  ? <Image src={profile.avatar.url} alt={profile.name} width={112} height={112} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><span className="text-3xl font-bold text-emerald-700">{profile.name?.[0]?.toUpperCase()}</span></div>
                }
              </div>
              {profile.is_verified && <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center ring-3 ring-white"><CheckCircle2 className="h-4 w-4 text-white" /></div>}
            </div>
            <div className="flex items-center gap-2 mt-16">
              {isOwn
                ? <Link href="/settings" className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"><Settings className="h-4 w-4" />Edit Profile</Link>
                : <button onClick={handleFollow} disabled={fLoading} className={cn("flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all", isFollowing?"border border-slate-300 text-slate-700 hover:bg-slate-50":"bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm")}>
                    {fLoading?<Loader2 className="h-4 w-4 animate-spin" />:isFollowing?<><UserMinus className="h-4 w-4" />Following</>:<><UserPlus className="h-4 w-4" />Follow</>}
                  </button>
              }
            </div>
          </div>

          <div className="mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{profile.name}</h1>
              <span className={cn("impact-badge", catColor(profile.category))}>{profile.category}</span>
            </div>
            <p className="text-slate-500 text-sm mt-1">@{profile.username}</p>
            {(profile.city || profile.state || profile.location) && (
              <div className="flex items-center gap-1.5 mt-2 w-fit px-3 py-1.5 bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border border-slate-200">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>
                  {profile.city && profile.state 
                    ? `${profile.city}, ${profile.state}` 
                    : profile.location || profile.state || profile.city}
                </span>
              </div>
            )}
          </div>
          {profile.bio && <p className="text-slate-600 text-sm leading-relaxed mb-4">{profile.bio}</p>}

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3 mb-5 mt-5">
            {[["Posts",profile.posts_count??0],["Followers",profile.followers_count??0],["Following",profile.following_count??0]].map(([l,v])=>{
              const isClickable = l === "Followers" || l === "Following";
              return (
                <div 
                  key={l as string} 
                  onClick={isClickable ? () => setIsConnOpen(true) : undefined}
                  className={cn(
                    "text-center p-3 bg-slate-50 rounded-lg border border-slate-200 transition-all",
                    isClickable && "cursor-pointer hover:bg-emerald-50 hover:border-emerald-300"
                  )}
                >
                  <p className={cn("font-bold text-slate-900 text-lg", isClickable && "text-emerald-600")}>
                    {fmtNum(v as number)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{l}</p>
                </div>
              );
            })}
            <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
              <p className={cn("font-bold text-lg", tier.color)}>
                {typeof profile.impact_score === 'number' ? profile.impact_score.toFixed(1) : 0}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Points</p>
            </div>
          </div>

          {isOwn && (
            <div className="relative mt-4">
              {showPts && <div className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none z-10"><span className="text-emerald-600 font-bold text-lg float-up">+{lastPts} pts ⚡</span></div>}
              <button 
                onClick={() => setIsModalOpen(true)} 
                className="w-full py-3.5 rounded-lg font-semibold text-white text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
                <Camera className="h-5 w-5" /> Open Smart Lens & Record Disposal
              </button>
              {(profile.claim_streak??0) > 0 && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-xs font-semibold text-orange-700">{profile.claim_streak} day streak!</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200 bg-slate-50">
          <Grid3X3 className="h-4 w-4 text-slate-600" /><span className="text-sm font-semibold text-slate-900">Posts</span>
          <span className="ml-auto text-xs text-slate-500">{posts.length} total</span>
        </div>
        {posts.length===0
          ? <div className="text-center py-20"><div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3"><p className="text-3xl">📸</p></div><p className="text-sm text-slate-500">{isOwn?"You haven't posted yet.":`${profile.name} hasn't posted yet.`}</p></div>
          : <div className="posts-grid">
              {posts.map(p => (
                <Link key={p._id||p.id} href={`/posts/${p._id||p.id}`} className="relative aspect-square bg-slate-100 overflow-hidden group">
                  {p.media?.[0] && <Image src={p.media[0].url} alt={p.caption||""} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="33vw" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <div className="flex gap-3 text-white text-xs font-semibold"><span>❤️ {fmtNum(p.likes_count??p.likesCount??0)}</span></div>
                  </div>
                </Link>
              ))}
            </div>
        }
      </div>

      {/* --- SMART MODAL INVOCATION --- */}
      <ConnectionsModal 
        isOpen={isConnOpen} 
        onClose={() => setIsConnOpen(false)} 
        userId={profile.id || profile._id} // Fixed: Always uses the ID of the current profile
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-6xl bg-zinc-900 rounded-3xl border border-zinc-800 flex flex-col max-h-[95vh] overflow-hidden text-white">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h1 className="text-2xl font-bold">Smart Lens System</h1>
              <button onClick={() => { setIsModalOpen(false); stopCamera(); }} className="text-3xl hover:text-red-500 transition-colors">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="relative bg-black rounded-2xl h-[400px] overflow-hidden border border-zinc-700">
                    {previewType === "camera" && (
                        <video 
                          ref={(el) => { videoRef.current = el; if (el && streamRef.current) el.srcObject = streamRef.current; }} 
                          autoPlay 
                          muted 
                          playsInline 
                          className={`w-full h-full object-cover transition-transform duration-300 ${facingMode === "user" ? "-scale-x-100" : ""}`} 
                        />
                    )}
                    {previewType === "captured" && <img src={capturedImage!} className="w-full h-full object-cover" alt="Captured" />}
                    {previewType === "camera" && (
                      <button 
                        type="button"
                        onClick={toggleFacingMode}
                        className="absolute top-4 right-4 z-10 bg-black/70 hover:bg-black/90 active:scale-95 text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-md flex items-center gap-1.5 shadow-lg transition-all"
                        title="Switch camera"
                      >
                        <SwitchCamera className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{facingMode === "user" ? "Front Camera" : "Rear Camera"}</span>
                      </button>
                    )}
                    {isRecording && <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded-full animate-pulse text-xs font-bold">RECORDING DISPOSAL</div>}
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button onClick={() => startCamera()} className="bg-zinc-800 hover:bg-white hover:text-black transition-all py-2 rounded-xl font-bold text-xs text-zinc-400">Open Camera</button>
                    <button onClick={toggleFacingMode} className="bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-all py-2 rounded-xl text-xs font-bold text-zinc-300 flex items-center justify-center gap-1.5">
                      <SwitchCamera className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{facingMode === "user" ? "Switch to Rear" : "Switch to Front"}</span>
                    </button>
                    <button onClick={capturePhoto} className="bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-all py-2 rounded-xl text-xs text-zinc-400">Capture</button>
                    <button onClick={startRecording} disabled={isRecording || !cameraOn} className="bg-zinc-800 disabled:opacity-50 hover:bg-red-600 hover:text-white transition-all py-2 rounded-xl text-xs font-bold text-zinc-400">Start Rec</button>
                    <button onClick={stopRecording} disabled={!isRecording} className="bg-zinc-800 disabled:opacity-50 hover:bg-red-600 hover:text-white transition-all py-2 rounded-xl text-xs font-bold text-zinc-400">Stop Rec</button>
                    <button onClick={verifyImage} className="bg-zinc-800 hover:bg-blue-600 hover:text-white transition-all py-2 rounded-xl text-xs font-bold text-zinc-400">Verify Image</button>
                    <button onClick={verifyAction} className="bg-zinc-800 hover:bg-orange-600 hover:text-white transition-all py-2 rounded-xl text-xs font-bold text-zinc-400">Verify Action</button>
                    <button onClick={stopCamera} className="bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-all py-2 rounded-xl text-xs text-zinc-400">Off Camera</button>
                    <button onClick={saveResultToProfile} disabled={claiming} className="col-span-2 md:col-span-4 bg-green-600 hover:bg-green-500 hover:text-white transition-all py-2.5 rounded-xl text-xs font-bold flex items-center justify-center">
                        {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save to Profile"}
                    </button>
                  </div>
                </div>
                <div className="bg-zinc-800/50 rounded-2xl p-5 border border-zinc-700 flex flex-col">
                  <h2 className="text-xl font-semibold mb-4">Verification Panel</h2>
                  <div className="bg-zinc-900 p-4 rounded-xl mb-4 border border-zinc-700">
                    <p className="text-xs text-zinc-500 uppercase font-bold">System Status</p>
                    <p className="text-sm text-blue-400">{status} {isScanning && <Loader2 className="h-3 w-3 inline animate-spin" />}</p>
                  </div>
                  <div className="space-y-3 flex-1 overflow-y-auto min-h-[200px] pr-2">
                    {results.map((item, idx) => (
                      <div key={idx} onClick={() => toggleItemSelection(idx)}
                        className={`border-2 rounded-xl p-4 flex justify-between items-center transition-all ${
                          item.processed ? "opacity-40 bg-zinc-800 border-transparent cursor-not-allowed" : 
                          selectedItems.includes(idx) ? "bg-blue-600/20 border-blue-500 cursor-pointer" : "bg-zinc-900 border-zinc-700 cursor-pointer"
                        }`}>
                        <div>
                          <p className="font-bold text-lg">{item.class || item.class_name}</p>
                          <p className="text-xs text-zinc-500">{item.processed ? " POINTS ADDED" : selectedItems.includes(idx) ? " SELECTED" : "Click to select"}</p>
                        </div>
                        <div className={`${item.processed ? 'bg-zinc-700' : 'bg-blue-600'} h-10 w-10 rounded-full flex items-center justify-center font-bold`}>{item.count}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 border-t border-zinc-700 pt-6">
                    <button onClick={calculatePoints} className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-4 rounded-2xl shadow-xl mb-4">Add Selected to Total</button>
                    <div className="bg-zinc-900 rounded-2xl p-4 border border-green-600/30">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-bold text-emerald-400">Total Profile Points {"->"} </h3>
                        <span className="text-2xl font-black">{pointsData.total_points}</span>
                      </div>
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                        {pointsData.breakdown.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs text-zinc-400 border-b border-zinc-800 pb-1">
                            <span>{item.item} (x{item.count})</span>
                            <span className={`${item.total > 0 ? 'text-green-500' : 'text-red-500'} font-bold`}>{item.total > 0 ? `+${item.total}` : 'Rejected'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
