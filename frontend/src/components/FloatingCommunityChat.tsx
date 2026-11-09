"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { api, ChatMessageDto } from "@/lib/api";
import { subscribeToSync } from "@/lib/sync";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Mic,
  Square,
  Trash2,
  Pin,
  PinOff,
  Heart,
  Reply,
  Volume2,
  VolumeX,
  X,
  Minus,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  Play,
  Pause,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Users,
  ExternalLink,
  ChevronDown,
  Bell,
  BellOff,
  Image as ImageIcon,
  ZoomIn,
  Download,
} from "lucide-react";

// Web Audio synthesizer chime for incoming messages (zero asset dependency)
function playIncomingChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // Gracefully handle browser autoplay blocks
  }
}

// Client-side quick profanity checker for instant respectful hint
const PROFANITY_REGEX =
  /(?:bc|mc|chutiya|harami|bapok|sala|magi|khanki|kutta|shor|bitch|bastard|fuck|shit|asshole|fucker|dick|pussy)/i;

export default function FloatingCommunityChat() {
  const { user, isAuthenticated, isAdmin, isSuperAdmin, setShowAuthModal } = useAuth();
  const { language } = useLanguage();
  const { isDark } = useTheme();
  const isBn = language === "bn";

  const [mounted, setMounted] = useState(false);
  const formatNumber = useCallback((num: number | string) => {
    if (!isBn) return String(num);
    const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return String(num).replace(/\d/g, (d) => bnDigits[Number(d)]);
  }, [isBn]);
  const [isOpen, setIsOpen] = useState(false);

  // Decoupled Position coordinates:
  // - bubblePos: where the floating 3D orb sits (can be placed anywhere around screen edges)
  // - windowPos: where the open chatroom window sits (strictly clamped so header is NEVER off-screen)
  const [bubblePos, setBubblePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const bubblePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [windowPos, setWindowPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const windowPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [isDragging, setIsDragging] = useState(false);

  // Image attachment state
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Refs for zero-latency direct DOM manipulation during drag
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const windowRef = useRef<HTMLDivElement | null>(null);

  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    moved: boolean;
    rafId: number | null;
  }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    moved: false,
    rafId: null,
  });

  // Notification ON/OFF toggle (default true, stored in localStorage)
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  // Sound notification toggle (default true, stored in session)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("notelagbe_chat_notifications");
      if (stored !== null) setNotificationsEnabled(stored !== "false");
      const storedSound = sessionStorage.getItem("notelagbe_chat_sound");
      if (storedSound !== null) setSoundEnabled(storedSound !== "false");
    } catch {}
  }, []);

  // Chat data state
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessageDto | null>(null);
  const [activeUsersCount, setActiveUsersCount] = useState<number>(0);
  const [deleteConfirmMsg, setDeleteConfirmMsg] = useState<ChatMessageDto | null>(null);
  const [isDeletingMsg, setIsDeletingMsg] = useState<boolean>(false);

  // Text input state
  const [inputText, setInputText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessageDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profanityWarning, setProfanityWarning] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceDuration, setVoiceDuration] = useState<number>(0);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);

  // Per-student unseen messages count
  const [unseenCount, setUnseenCount] = useState<number>(0);

  // Read marker helper: update read status in localStorage for current student
  const markMessagesAsRead = useCallback(
    (msgList: ChatMessageDto[]) => {
      if (typeof window === "undefined" || msgList.length === 0) return;
      const maxId = Math.max(...msgList.map((m) => m.id));
      const storageKey = user?.id ? `notelagbe_chat_read_${user.id}` : "notelagbe_chat_read_guest";
      localStorage.setItem(storageKey, String(maxId));
      setUnseenCount(0);
    },
    [user?.id]
  );

  // Calculate unseen count based on student's lastReadId
  const updateUnseenCount = useCallback(
    (msgList: ChatMessageDto[], chatIsOpen: boolean) => {
      if (typeof window === "undefined") return;
      if (chatIsOpen) {
        markMessagesAsRead(msgList);
        return;
      }
      const storageKey = user?.id ? `notelagbe_chat_read_${user.id}` : "notelagbe_chat_read_guest";
      const lastReadId = Number(localStorage.getItem(storageKey) || 0);
      // Count unseen messages that were NOT sent by the current user
      const unseen = msgList.filter(
        (m) => m.id > lastReadId && (!user || m.senderId !== user.id)
      ).length;
      setUnseenCount(unseen);
    },
    [user, markMessagesAsRead]
  );

  // Voice playback state
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
  const [audioPlaybackRate, setAudioPlaybackRate] = useState<number>(1);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const prevMsgCountRef = useRef<number>(0);
  const isFetchingRef = useRef(false);

  // Highlighted message state (for jumping to pinned message)
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);

  // Floating "Scroll to Bottom" state (Messenger / ChatGPT style)
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
    setShowScrollBottom(isScrolledUp);
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
      setShowScrollBottom(false);
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
      setShowScrollBottom(false);
    }
  }, []);

  // Jump / Scroll smoothly to a specific message in the chat
  const scrollToMessage = useCallback((msgId: number) => {
    setIsOpen(true);
    isProgrammaticScrollRef.current = true;
    setShowScrollBottom(true);

    const performScroll = () => {
      const container = chatContainerRef.current;
      const el = document.getElementById(`chat-msg-${msgId}`);
      if (el && container) {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const currentScrollTop = container.scrollTop;
        const relativeTop = elRect.top - containerRect.top + currentScrollTop;
        
        // Center the message in the container view smoothly
        const targetScrollTop = Math.max(0, Math.round(relativeTop - (container.clientHeight / 2) + (elRect.height / 2)));
        
        container.scrollTo({
          top: targetScrollTop,
          behavior: "smooth",
        });

        setHighlightedMessageId(msgId);
        
        setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 1200);

        setTimeout(() => {
          setHighlightedMessageId((curr) => (curr === msgId ? null : curr));
        }, 3500);
      } else if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedMessageId(msgId);
        setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 1200);
        setTimeout(() => {
          setHighlightedMessageId((curr) => (curr === msgId ? null : curr));
        }, 3500);
      } else {
        isProgrammaticScrollRef.current = false;
      }
    };

    // Staggered attempts to ensure instant scrolling if open or right after open animation
    setTimeout(performScroll, 80);
    setTimeout(performScroll, 250);
  }, []);

  // Listen for external "notelagbe-open-chat" event
  useEffect(() => {
    const handleOpenChat = (e: any) => {
      setIsOpen(true);
      if (e.detail?.messageId) {
        setTimeout(() => {
          scrollToMessage(e.detail.messageId);
        }, 200);
      }
    };
    window.addEventListener("notelagbe-open-chat", handleOpenChat);
    return () => window.removeEventListener("notelagbe-open-chat", handleOpenChat);
  }, [scrollToMessage]);

  // Extract first recognized URL or route from text
  const extractUrlFromText = (text?: string | null): string | null => {
    if (!text) return null;
    const urlMatch = text.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) return urlMatch[0];
    const routeMatch = text.match(/(\/(?:courses|pricing|curriculum|faculty|dashboard)[^\s]*)/i);
    if (routeMatch) return routeMatch[0];
    return null;
  };

  // Format message text with interactive clickable links
  const renderFormattedText = (text?: string | null) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+|\/(?:courses|pricing|curriculum|faculty|dashboard)[^\s]*)/gi;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (!part) return null;
      if (part.match(/^https?:\/\//i)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 underline font-medium hover:text-cyan-200 transition-colors break-all inline-flex items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{part}</span>
            <ExternalLink className="w-2.5 h-2.5 inline shrink-0 ml-0.5" />
          </a>
        );
      }
      if (part.match(/^\/(?:courses|pricing|curriculum|faculty|dashboard)/i)) {
        return (
          <Link
            key={index}
            href={part}
            className="text-amber-300 underline font-semibold hover:text-amber-200 transition-colors inline-flex items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{part}</span>
            <ExternalLink className="w-2.5 h-2.5 inline shrink-0 ml-0.5" />
          </Link>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Clamping function for the 3D floating orb: keeps it inside the screen margins
  const clampBubblePos = useCallback((x: number, y: number) => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const size = 70;
    const minX = -(winW - size - 32);
    const maxX = 8;
    const minY = -(winH - size - 32);
    const maxY = 8;
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    };
  }, []);

  // Strict clamping function for the chat window: GUARANTEES header is NEVER off-screen
  const clampWindowPos = useCallback((x: number, y: number) => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const el = windowRef.current;
    const wWidth = el ? el.offsetWidth : Math.min(380, winW - 32);
    const wHeight = el ? el.offsetHeight : Math.min(600, winH - 32);

    // With bottom: 24, right: 24:
    // For top edge >= 16px: y >= -(winH - wHeight - 40)
    // For bottom edge <= winH - 16px: y <= 8px
    // For left edge >= 16px: x >= -(winW - wWidth - 40)
    // For right edge <= winW - 16px: x <= 8px
    const minY = -(Math.max(0, winH - wHeight - 40));
    const maxY = 8;
    const minX = -(Math.max(0, winW - wWidth - 40));
    const maxX = 8;

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync refs with states
  useEffect(() => {
    bubblePosRef.current = bubblePos;
  }, [bubblePos]);

  useEffect(() => {
    windowPosRef.current = windowPos;
  }, [windowPos]);

  // Reset position on logout
  useEffect(() => {
    if (!isAuthenticated) {
      setBubblePos({ x: 0, y: 0 });
      bubblePosRef.current = { x: 0, y: 0 };
      setWindowPos({ x: 0, y: 0 });
      windowPosRef.current = { x: 0, y: 0 };
    }
  }, [isAuthenticated]);

  // Window resize handler to maintain safe boundary clamping
  useEffect(() => {
    const handleResize = () => {
      setBubblePos((curr) => {
        const next = clampBubblePos(curr.x, curr.y);
        bubblePosRef.current = next;
        if (bubbleRef.current) {
          bubbleRef.current.style.transform = `translate3d(${next.x}px, ${next.y}px, 0)`;
        }
        return next;
      });
      setWindowPos((curr) => {
        const next = clampWindowPos(curr.x, curr.y);
        windowPosRef.current = next;
        if (windowRef.current) {
          windowRef.current.style.transform = `translate3d(${next.x}px, ${next.y}px, 0)`;
        }
        return next;
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampBubblePos, clampWindowPos]);

  // Toggle notifications (Push / Popups / Alerts)
  const handleToggleNotifications = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNotificationsEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("notelagbe_chat_notifications", String(next));
        if (next && "Notification" in window && Notification.permission === "default") {
          Notification.requestPermission().catch(() => {});
        }
      }
      toast(
        next
          ? isBn
            ? "🔔 চ্যাট নোটিফিকেশন চালু করা হয়েছে"
            : "🔔 Chat notifications turned ON"
          : isBn
          ? "🔕 চ্যাট নোটিফিকেশন বন্ধ করা হয়েছে"
          : "🔕 Chat notifications turned OFF",
        { duration: 2000 }
      );
      return next;
    });
  };

  // Toggle sound
  const handleToggleSound = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSoundEnabled((prev) => {
      const next = !prev;
      sessionStorage.setItem("notelagbe_chat_sound", String(next));
      if (next) playIncomingChime();
      return next;
    });
  };

  // Toggle open
  const handleToggleOpen = (openState: boolean) => {
    setIsOpen(openState);
    if (openState) {
      markMessagesAsRead(messages);
      // When opening: align with bubble's location but strictly clamped so the entire window is 100% on screen
      const next = clampWindowPos(bubblePosRef.current.x, bubblePosRef.current.y);
      setWindowPos(next);
      windowPosRef.current = next;
      if (windowRef.current) {
        windowRef.current.style.transform = `translate3d(${next.x}px, ${next.y}px, 0)`;
      }
    }
  };

  // 1-Click Reset position
  const handleResetPosition = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBubblePos({ x: 0, y: 0 });
    bubblePosRef.current = { x: 0, y: 0 };
    setWindowPos({ x: 0, y: 0 });
    windowPosRef.current = { x: 0, y: 0 };
    if (bubbleRef.current) bubbleRef.current.style.transform = "translate3d(0px, 0px, 0px)";
    if (windowRef.current) windowRef.current.style.transform = "translate3d(0px, 0px, 0px)";
    toast.info(isBn ? "চ্যাটরুম ডিফল্ট কোণায় ফিরিয়ে নেওয়া হয়েছে।" : "Position reset to corner.");
  };

  // Event-driven data fetcher with in-flight deduplication
  const fetchChatData = useCallback(async () => {
    if (isFetchingRef.current) return;
    if (typeof document !== "undefined" && document.hidden) return;

    try {
      isFetchingRef.current = true;
      const [msgs, pinned, active] = await Promise.all([
        api.chat.getMessages(),
        api.chat.getPinned().catch(() => null),
        api.chat.getActiveCount().catch(() => ({ activeCount: 0, status: "LIVE" })),
      ]);

      if (msgs && Array.isArray(msgs)) {
        if (
          prevMsgCountRef.current > 0 &&
          msgs.length > prevMsgCountRef.current
        ) {
          const latest = msgs[msgs.length - 1];
          if (latest && (!user || latest.senderId !== user.id)) {
            if (notificationsEnabled) {
              if (soundEnabled) playIncomingChime();
              // Show popup notification on top right side if chat is closed
              if (!isOpen) {
                toast(
                  `${latest.senderName}: ${
                    latest.text ||
                    (latest.messageType === "VOICE"
                      ? isBn
                        ? "🎙️ ভয়েস মেসেজ"
                        : "🎙️ Voice Note"
                      : isBn
                      ? "📷 ছবি"
                      : "📷 Image")
                  }`,
                  {
                    position: "top-right",
                    description: isBn ? "ক্যাম্পাস চ্যাটে নতুন বার্তা" : "New campus message",
                    action: {
                      label: isBn ? "দেখুন" : "View",
                      onClick: () => handleToggleOpen(true),
                    },
                  }
                );

                if (
                  typeof document !== "undefined" &&
                  document.hidden &&
                  typeof window !== "undefined" &&
                  "Notification" in window &&
                  Notification.permission === "granted"
                ) {
                  try {
                    new Notification(`SEU Campus Live: ${latest.senderName}`, {
                      body:
                        latest.text ||
                        (latest.messageType === "VOICE"
                          ? "🎙️ Voice Note"
                          : "📷 Image"),
                      icon: "/images/seu-logo.png",
                    });
                  } catch {}
                }
              }
            }
          }
        }
        prevMsgCountRef.current = msgs.length;
        setMessages(msgs);
        updateUnseenCount(msgs, isOpen);
      }

      setPinnedMessage(pinned || null);
      if (typeof active?.activeCount === "number") {
        setActiveUsersCount(active.activeCount);
      }
    } catch {
      // Silently retry on next event
    } finally {
      isFetchingRef.current = false;
    }
  }, [soundEnabled, notificationsEnabled, user, isOpen, isBn]);

  useEffect(() => {
    if (!mounted) return;
    fetchChatData();

    // Event-driven SSE listener: instant sync with ZERO database load
    const unsubscribe = subscribeToSync((payload) => {
      if (payload.entity === "chat" || payload.entity === "all") {
        fetchChatData();
      }
    });

    // Relaxed background heartbeat (30s when open, 60s when closed, paused if background tab)
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        fetchChatData();
      }
    }, isOpen ? 30000 : 60000);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [mounted, fetchChatData, isOpen]);

  // Sync unseen count when user logs in/out or messages update
  useEffect(() => {
    updateUnseenCount(messages, isOpen);
  }, [user?.id, updateUnseenCount, messages, isOpen]);

  // Auto-scroll on new messages (only if user is already near bottom or just opened chat, and not navigating programmatically)
  useEffect(() => {
    if (isOpen && !showScrollBottom && !isProgrammaticScrollRef.current) {
      setTimeout(() => {
        if (!isProgrammaticScrollRef.current) {
          scrollToBottom(true);
        }
      }, 100);
    }
  }, [isOpen, messages.length, showScrollBottom, scrollToBottom]);

  // Profanity detector
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    setProfanityWarning(PROFANITY_REGEX.test(val));
  };

  // Auth guard
  const checkAuthGuard = (): boolean => {
    if (!isAuthenticated) {
      toast.warning(
        isBn
          ? "ভয়েস ও মেসেজ সেবা পেতে অনুগ্রহ করে লগইন করুন।"
          : "Please sign in to send messages and voice notes.",
        {
          description: isBn
            ? "লগইন করে আপনার স্টুডেন্ট প্রোফাইল দিয়ে চ্যাটে অংশ নিন।"
            : "Sign in with your verified student profile to participate.",
        }
      );
      setShowAuthModal(true);
      return false;
    }
    if (user?.chatBlocked) {
      toast.error(
        isBn
          ? "আপনার চ্যাট অ্যাকাউন্ট সাময়িকভাবে স্থগিত করা হয়েছে।"
          : "Your chat access is temporarily suspended by an administrator."
      );
      return false;
    }
    return true;
  };

  // Image attachment handlers
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(isBn ? "শুধুমাত্র ইমেজ ফাইল সিলেক্ট করুন।" : "Please select an image file.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error(isBn ? "ছবির সাইজ ১৫MB এর কম হতে হবে।" : "Image size must be less than 15MB.");
      return;
    }
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImageFile(file);
    const preview = URL.createObjectURL(file);
    setImagePreviewUrl(preview);
    e.target.value = "";
  };

  const cancelImageAttachment = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
  };

  const handleSendImage = async () => {
    if (!selectedImageFile || !checkAuthGuard() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("file", selectedImageFile);
      const caption = inputText.trim();
      if (caption) {
        formData.append("caption", caption);
      }
      if (replyTo?.id) {
        formData.append("replyToId", String(replyTo.id));
        formData.append("replyToSender", replyTo.senderName);
        formData.append(
          "replyToText",
          replyTo.text ||
            (replyTo.messageType === "VOICE"
              ? isBn
                ? "🎙️ ভয়েস মেসেজ"
                : "🎙️ Voice Note"
              : isBn
              ? "📷 ছবি"
              : "📷 Image")
        );
      }

      const newMsg = await api.chat.sendImage(formData);
      setMessages((prev) => [...prev, newMsg]);
      markMessagesAsRead([...messages, newMsg]);
      cancelImageAttachment();
      setInputText("");
      setReplyTo(null);
      prevMsgCountRef.current += 1;
      toast.success(isBn ? "ছবি পাঠানো হয়েছে!" : "Image sent successfully!");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : isBn
          ? "ছবি পাঠানো সম্ভব হয়নি।"
          : "Failed to send image."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send Text or Image Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!checkAuthGuard()) return;

    if (selectedImageFile) {
      return handleSendImage();
    }

    const trimmed = inputText.trim();
    if (!trimmed || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const newMsg = await api.chat.sendMessage({
        text: trimmed,
        replyToId: replyTo?.id,
        replyToSender: replyTo?.senderName,
        replyToText:
          replyTo?.text ||
          (replyTo?.messageType === "VOICE"
            ? isBn
              ? "🎙️ ভয়েস মেসেজ"
              : "🎙️ Voice Note"
            : undefined),
      });

      setMessages((prev) => [...prev, newMsg]);
      markMessagesAsRead([...messages, newMsg]);
      setInputText("");
      setReplyTo(null);
      setProfanityWarning(false);
      prevMsgCountRef.current += 1;
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : isBn
          ? "মেসেজ পাঠানো সম্ভব হয়নি।"
          : "Failed to send message."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Voice recording
  const startRecording = async () => {
    if (!checkAuthGuard()) return;

    try {
      if (previewAudio) {
        previewAudio.pause();
        setPreviewAudio(null);
      }
      setIsPreviewPlaying(false);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = "audio/webm;codecs=opus";
      if (typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          mimeType = "audio/ogg;codecs=opus";
        } else {
          mimeType = "";
        }
      }

      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const recordedMime = mediaRecorder.mimeType || mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: recordedMime });
        setVoiceBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      toast.error(
        isBn
          ? "মাইক্রোফোনের অনুমতি দেওয়া হয়নি বা মাইক্রোফোন সংযোগ নেই।"
          : "Microphone permission denied or device not found."
      );
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setVoiceDuration(Math.max(1, recordingSeconds));
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (previewAudio) {
      previewAudio.pause();
      setPreviewAudio(null);
    }
    setIsPreviewPlaying(false);
    setIsRecording(false);
    setVoiceBlob(null);
    setRecordingSeconds(0);
    setVoiceDuration(0);
  };

  // Listen to recorded voice preview before sending
  const togglePreviewPlayback = () => {
    if (!voiceBlob) return;
    if (previewAudio) {
      if (isPreviewPlaying) {
        previewAudio.pause();
        setIsPreviewPlaying(false);
      } else {
        previewAudio
          .play()
          .then(() => setIsPreviewPlaying(true))
          .catch(() => setIsPreviewPlaying(false));
      }
    } else {
      const url = URL.createObjectURL(voiceBlob);
      const audio = new Audio(url);
      setPreviewAudio(audio);
      audio.onended = () => setIsPreviewPlaying(false);
      audio.onerror = () => setIsPreviewPlaying(false);
      audio
        .play()
        .then(() => setIsPreviewPlaying(true))
        .catch(() => setIsPreviewPlaying(false));
    }
  };

  const handleSendVoice = async () => {
    if (!voiceBlob || !checkAuthGuard() || isSubmitting) return;

    if (previewAudio) {
      previewAudio.pause();
      setPreviewAudio(null);
    }
    setIsPreviewPlaying(false);

    try {
      setIsSubmitting(true);
      const isMp4 = voiceBlob.type.includes("mp4");
      const ext = isMp4 ? "mp4" : "webm";
      const formData = new FormData();
      formData.append("file", voiceBlob, `voice-note.${ext}`);
      formData.append("duration", String(voiceDuration || recordingSeconds || 1));
      if (replyTo?.id) {
        formData.append("replyToId", String(replyTo.id));
        formData.append("replyToSender", replyTo.senderName);
        formData.append(
          "replyToText",
          replyTo.text || (isBn ? "🎙️ ভয়েস মেসেজ" : "🎙️ Voice Note")
        );
      }

      const newMsg = await api.chat.sendVoice(formData);
      setMessages((prev) => [...prev, newMsg]);
      markMessagesAsRead([...messages, newMsg]);
      setVoiceBlob(null);
      setVoiceDuration(0);
      setReplyTo(null);
      prevMsgCountRef.current += 1;
      toast.success(isBn ? "ভয়েস নোট পাঠানো হয়েছে!" : "Voice note sent!");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : isBn
          ? "ভয়েস পাঠানো সম্ভব হয়নি।"
          : "Failed to send voice note."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Play voice
  const handlePlayVoice = (msgId: number, voiceUrl?: string | null) => {
    if (!voiceUrl) return;

    if (playingMessageId === msgId && currentAudioRef.current) {
      if (currentAudioRef.current.paused) {
        currentAudioRef.current.play().catch(() => {});
      } else {
        currentAudioRef.current.pause();
        setPlayingMessageId(null);
      }
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    const resolvedUrl = voiceUrl.startsWith("http")
      ? voiceUrl
      : `${window.location.origin}${voiceUrl.startsWith("/") ? "" : "/"}${voiceUrl}`;

    const audio = new Audio(resolvedUrl);
    audio.preload = "auto";
    audio.playbackRate = audioPlaybackRate;
    audio
      .play()
      .then(() => {
        setPlayingMessageId(msgId);
        currentAudioRef.current = audio;
      })
      .catch((err) => {
        console.error("Voice playback error:", err);
        setPlayingMessageId(null);
        currentAudioRef.current = null;
        toast.error(isBn ? "অডিও প্লে করতে সমস্যা হয়েছে।" : "Failed to play audio.");
      });

    audio.onended = () => {
      setPlayingMessageId(null);
      currentAudioRef.current = null;
    };
    audio.onerror = () => {
      setPlayingMessageId(null);
      currentAudioRef.current = null;
      toast.error(isBn ? "অডিও লোড করতে সমস্যা হয়েছে।" : "Failed to load audio.");
    };
  };

  const cyclePlaybackRate = () => {
    const nextRate = audioPlaybackRate === 1 ? 1.5 : audioPlaybackRate === 1.5 ? 2 : 1;
    setAudioPlaybackRate(nextRate);
    if (currentAudioRef.current) currentAudioRef.current.playbackRate = nextRate;
  };

  // Like reaction
  const handleToggleLike = async (msgId: number) => {
    if (!checkAuthGuard()) return;

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          const isLiked = m.likedByMe;
          return {
            ...m,
            likedByMe: !isLiked,
            likesCount: isLiked ? Math.max(0, m.likesCount - 1) : m.likesCount + 1,
          };
        }
        return m;
      })
    );

    try {
      const updated = await api.chat.toggleLike(msgId);
      setMessages((prev) => prev.map((m) => (m.id === msgId ? updated : m)));
    } catch {
      fetchChatData();
    }
  };

  // Admin Pin
  const handleAdminPin = async (msgId: number) => {
    if (!isAdmin && !isSuperAdmin) return;
    try {
      const pinned = await api.admin.pinChatMessage(msgId);
      setPinnedMessage(pinned);
      setMessages((prev) =>
        prev.map((m) => ({
          ...m,
          pinned: m.id === msgId,
        }))
      );
      toast.success(
        isBn
          ? "মেসেজটি ২৪ ঘণ্টার জন্য পিন করা হয়েছে!"
          : "Pinned for 24 hours as campus announcement!"
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to pin message.");
    }
  };

  const handleAdminUnpin = async (msgId: number) => {
    if (!isAdmin && !isSuperAdmin) return;
    try {
      await api.admin.unpinChatMessage(msgId);
      setPinnedMessage(null);
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, pinned: false } : m)));
      toast.success(isBn ? "মেসেজ আনপিন করা হয়েছে।" : "Announcement unpinned.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to unpin message.");
    }
  };

  const handleAdminDelete = (msg: ChatMessageDto) => {
    if (!isAdmin && !isSuperAdmin) return;
    setDeleteConfirmMsg(msg);
  };

  const confirmDeleteMessage = async () => {
    if (!deleteConfirmMsg) return;
    setIsDeletingMsg(true);
    try {
      await api.admin.deleteChatMessage(deleteConfirmMsg.id);
      setMessages((prev) => prev.filter((m) => m.id !== deleteConfirmMsg.id));
      if (pinnedMessage?.id === deleteConfirmMsg.id) setPinnedMessage(null);
      toast.success(isBn ? "মেসেজ মুছে ফেলা হয়েছে।" : "Message deleted.");
      setDeleteConfirmMsg(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete message.");
    } finally {
      setIsDeletingMsg(false);
    }
  };

  // =========================================================================
  // ZERO-LATENCY DIRECT DOM DRAGGING ENGINE (144Hz / 60fps)
  // =========================================================================
  const startDrag = (
    clientX: number,
    clientY: number,
    pointerId: number,
    targetEl: HTMLElement,
    isOpenWindow: boolean
  ) => {
    setIsDragging(true);
    const targetTransformEl = isOpenWindow ? windowRef.current : bubbleRef.current;

    // Immediately remove CSS transition for true 0ms latency instantaneous mouse tracking
    if (targetTransformEl) {
      targetTransformEl.style.transition = "none";
    }

    const currentPos = isOpenWindow ? windowPosRef.current : bubblePosRef.current;
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initX: currentPos.x,
      initY: currentPos.y,
      moved: false,
      rafId: null,
    };

    try {
      targetEl.setPointerCapture(pointerId);
    } catch {}

    const onPointerMove = (e: PointerEvent) => {
      const deltaX = e.clientX - dragStartRef.current.startX;
      const deltaY = e.clientY - dragStartRef.current.startY;

      if (Math.hypot(deltaX, deltaY) > 4) {
        dragStartRef.current.moved = true;
      }

      const next = isOpenWindow
        ? clampWindowPos(dragStartRef.current.initX + deltaX, dragStartRef.current.initY + deltaY)
        : clampBubblePos(dragStartRef.current.initX + deltaX, dragStartRef.current.initY + deltaY);

      if (isOpenWindow) {
        windowPosRef.current = next;
      } else {
        bubblePosRef.current = next;
      }

      // Direct hardware-accelerated transform via requestAnimationFrame
      if (dragStartRef.current.rafId) cancelAnimationFrame(dragStartRef.current.rafId);
      dragStartRef.current.rafId = requestAnimationFrame(() => {
        if (targetTransformEl) {
          targetTransformEl.style.transform = `translate3d(${next.x}px, ${next.y}px, 0)`;
        }
      });
    };

    const cleanup = () => {
      setIsDragging(false);
      if (dragStartRef.current.rafId) cancelAnimationFrame(dragStartRef.current.rafId);

      try {
        targetEl.releasePointerCapture(pointerId);
      } catch {}

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", cleanup);

      // Restore smooth CSS transition for non-drag interactions
      if (targetTransformEl) {
        targetTransformEl.style.transition = isOpenWindow
          ? "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)"
          : "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.15s ease";
      }

      // Commit clamped coordinates to state
      if (isOpenWindow) {
        setWindowPos(windowPosRef.current);
      } else {
        setBubblePos(bubblePosRef.current);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      cleanup();

      // If user clicked/tapped without moving
      if (!dragStartRef.current.moved) {
        if (!isOpenWindow) {
          handleToggleOpen(true);
        }
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { once: true });
    window.addEventListener("pointercancel", cleanup, { once: true });
  };

  const handleBubblePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    startDrag(e.clientX, e.clientY, e.pointerId, e.currentTarget, false);
  };

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (e.button !== 0) return;
    startDrag(e.clientX, e.clientY, e.pointerId, e.currentTarget, true);
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  };

  if (!mounted) return null;

  return (
    <>
      {/* =========================================================================
          1. 3D Messenger-Style Draggable Floating Cart / Chat Orb
         ========================================================================= */}
      <div
        ref={bubbleRef}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          transform: `translate3d(${bubblePos.x}px, ${bubblePos.y}px, 0)`,
          zIndex: 9999,
          touchAction: "none",
          willChange: "transform",
          transition: isDragging
            ? "none"
            : "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.15s ease",
        }}
        onPointerDown={handleBubblePointerDown}
        className={`group select-none cursor-grab active:cursor-grabbing ${
          isOpen ? "opacity-0 pointer-events-none scale-75" : "opacity-100 scale-100"
        }`}
        title={
          isBn
            ? "SEU ক্যাম্পাস লাইভ চ্যাটরুম (ড্র্যাগ করে যেখানে খুশি সরাতে পারবেন)"
            : "SEU Community Live Chat (Drag anywhere on screen)"
        }
      >
        {/* 3D Anti-Gravity Floating Holographic Container */}
        <div className="relative flex items-center justify-center animate-float-3d group-hover:[animation-play-state:paused]">
          
          {/* Layer 1: Ambient Multi-Spectrum Cosmic Underglow */}
          <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-cyan-500 via-indigo-600 to-fuchsia-500 blur-xl opacity-60 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 animate-pulse-glow-3d" />

          {/* Layer 2: 3D Outer Gyro Orbit Ring 1 (Tilted in 3D perspective) */}
          <div className="absolute -inset-2 rounded-full border border-cyan-400/50 border-dashed pointer-events-none animate-orbit-spin" />

          {/* Layer 3: 3D Outer Gyro Orbit Ring 2 (Counter-rotating tilted ring with neon dot) */}
          <div className="absolute -inset-3.5 rounded-full border border-indigo-400/40 pointer-events-none animate-orbit-spin-reverse">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#22d3ee]" />
          </div>

          {/* Layer 4: The 3D Glassmorphic Holographic Sphere (70px) */}
          <div 
            className="relative w-[70px] h-[70px] rounded-full p-[2.5px] transition-transform duration-300 group-hover:scale-105 active:scale-95 shadow-[0_16px_40px_rgba(0,0,0,0.65),0_0_30px_rgba(37,99,235,0.35)]"
            style={{
              background: "linear-gradient(135deg, rgba(56, 189, 248, 0.85) 0%, rgba(99, 102, 241, 0.45) 50%, rgba(217, 70, 239, 0.85) 100%)",
            }}
          >
            {/* Sphere Body with Realistic 3D Curvature & Deep Radial Lighting */}
            <div 
              className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center backdrop-blur-2xl"
              style={{
                background: "radial-gradient(circle at 35% 28%, #1e3a8a 0%, #172554 35%, #0f172a 70%, #030712 100%)",
                boxShadow: "inset 0 2px 6px rgba(255, 255, 255, 0.5), inset 0 -6px 14px rgba(168, 85, 247, 0.4), inset 0 -12px 24px rgba(0, 0, 0, 0.7)"
              }}
            >
              {/* Curved 3D Glass Specular Crescent (Top Glare) */}
              <div 
                className="absolute top-1 left-2.5 w-10 h-5 rounded-[50%] pointer-events-none opacity-85"
                style={{
                  background: "radial-gradient(ellipse at 50% 30%, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.3) 45%, transparent 75%)",
                  transform: "rotate(-15deg)"
                }}
              />

              {/* Pinpoint Starlight Lens Flare */}
              <div className="absolute top-2.5 left-5 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff] pointer-events-none" />

              {/* 3D Isometric Speech Bubble with Animated Live Typing Dots */}
              <div className="relative z-10 flex flex-col items-center justify-center drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]">
                <svg 
                  className="w-8 h-8 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] transform group-hover:scale-110 transition-transform duration-300"
                  viewBox="0 0 36 36" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="orbBubbleGrad" x1="4" y1="4" x2="32" y2="30" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#38BDF8" />
                      <stop offset="0.5" stopColor="#6366F1" />
                      <stop offset="1" stopColor="#A855F7" />
                    </linearGradient>
                    <linearGradient id="orbBubbleRim" x1="4" y1="4" x2="32" y2="4" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FFFFFF" stopOpacity="0.9" />
                      <stop offset="1" stopColor="#38BDF8" stopOpacity="0.4" />
                    </linearGradient>
                  </defs>
                  
                  {/* 3D Shadow Plate under bubble */}
                  <path 
                    d="M18 6C10.268 6 4 11.373 4 18c0 2.822 1.139 5.42 3.064 7.422L6 29.5l4.898-1.47A15.342 15.342 0 0018 30c7.732 0 14-5.373 14-12S25.732 6 18 6z" 
                    fill="#000000" 
                    fillOpacity="0.35" 
                    transform="translate(0, 2)" 
                  />
                  
                  {/* Bubble Base */}
                  <path 
                    d="M18 6C10.268 6 4 11.373 4 18c0 2.822 1.139 5.42 3.064 7.422L6 29.5l4.898-1.47A15.342 15.342 0 0018 30c7.732 0 14-5.373 14-12S25.732 6 18 6z" 
                    fill="url(#orbBubbleGrad)" 
                    stroke="url(#orbBubbleRim)" 
                    strokeWidth="1.2" 
                  />

                  {/* 3 Live Bouncing Dots inside 3D Bubble */}
                  <circle cx="12" cy="18" r="2" fill="#FFFFFF" className="animate-dot-1" />
                  <circle cx="18" cy="18" r="2" fill="#FFFFFF" className="animate-dot-2" />
                  <circle cx="24" cy="18" r="2" fill="#FFFFFF" className="animate-dot-3" />
                </svg>
              </div>

              {/* Caustic Bottom Glow */}
              <div 
                className="absolute -bottom-2 w-12 h-6 rounded-full pointer-events-none opacity-60"
                style={{
                  background: "radial-gradient(ellipse at center, rgba(168, 85, 247, 0.7) 0%, transparent 70%)"
                }}
              />

              {/* Live Status Beacon (Bottom-Right) */}
              <span className="absolute bottom-1 right-1.5 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-[#090d16] shadow-[0_0_8px_#10b981]" />
              </span>
            </div>
          </div>

          {/* Per-Student Unread Badge: only shown if there are unseen messages for this student */}
          {unseenCount > 0 && (
            <div 
              className="absolute -top-1.5 -right-1.5 min-w-[24px] h-[24px] px-1.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white text-[11px] font-black tracking-normal flex items-center justify-center shadow-[0_4px_16px_rgba(225,29,72,0.9),0_0_8px_rgba(239,68,68,0.7)] border-2 border-white animate-in zoom-in-75 duration-200 z-20 pointer-events-none select-none ring-2 ring-rose-500/50"
              style={{
                textShadow: "0 1px 2px rgba(0,0,0,0.8)",
              }}
            >
              {unseenCount > 99 ? "99+" : unseenCount}
            </div>
          )}

          {/* Floating Hover Tooltip Pill */}
          <div className="absolute right-full mr-3.5 px-3 py-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-cyan-400/30 text-white text-[11px] font-bold shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{isBn ? "SEU ক্যাম্পাস লাইভ চ্যাট" : "SEU Campus Live Chat"}</span>
            <span className="text-cyan-400 font-mono text-[10px]">
              {activeUsersCount > 0 ? `✦ ${activeUsersCount} live` : "✦ LiveSync"}
            </span>
          </div>

        </div>
      </div>

      {/* =========================================================================
          2. Expanded Modern Glassmorphic Chatroom Window
         ========================================================================= */}
      {isOpen && (
        <div
          ref={windowRef}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            transform: `translate3d(${windowPos.x}px, ${windowPos.y}px, 0)`,
            zIndex: 10000,
            maxWidth: "calc(100vw - 24px)",
            willChange: "transform",
            transition: isDragging
              ? "none"
              : "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          className={`w-[380px] h-[600px] max-h-[calc(100vh-32px)] flex flex-col rounded-3xl backdrop-blur-2xl transition-colors duration-200 overflow-hidden animate-in fade-in zoom-in-95 select-none ${
            isDark
              ? "bg-[#090d16]/98 border border-white/15 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85),0_0_35px_rgba(34,211,238,0.12)] text-slate-100"
              : "bg-white/98 border border-slate-200/90 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.18),0_0_25px_rgba(59,130,246,0.12)] text-slate-800"
          }`}
        >
          {/* Radiant Top Neon Light Strip */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] shrink-0" />

          {/* Header Bar (Direct Drag Handle + Double-Click to Reset to Corner) */}
          <div
            onPointerDown={handleHeaderPointerDown}
            onDoubleClick={handleResetPosition}
            className={`relative px-4 py-3 border-b flex items-center justify-between cursor-grab active:cursor-grabbing select-none transition-colors ${
              isDark
                ? "bg-gradient-to-r from-slate-900/95 via-indigo-950/85 to-slate-900/95 border-white/10"
                : "bg-gradient-to-r from-slate-100/95 via-blue-50/90 to-slate-100/95 border-slate-200/90"
            }`}
            title={
              isBn
                ? "হেডার ধরে যেকোনো দিকে সরাতে পারেন (ডাবল-ক্লিক করলে কর্নারে রিসেট হবে)"
                : "Drag header to move chat (double-click to reset position)"
            }
          >
            {/* Left: Avatar + Title + Integrated Online Status */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-8 h-8 rounded-full p-[1.5px] bg-gradient-to-br from-cyan-400 via-indigo-500 to-fuchsia-500 shadow-[0_0_12px_rgba(34,211,238,0.35)] shrink-0">
                <div className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden relative ${
                  isDark ? "bg-slate-950" : "bg-white"
                }`}>
                  <div className="absolute top-0.5 left-1 w-3.5 h-1.5 bg-white/40 rounded-full blur-[0.5px]" />
                  <MessageSquare className="w-4 h-4 text-cyan-400 drop-shadow" />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className={`text-sm font-bold tracking-wide flex items-center gap-1 truncate ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}>
                    {isBn ? "SEU ক্যাম্পাস লাইভ" : "SEU Campus Live"}
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  </h3>
                </div>
                {/* Clean, Non-intrusive Online Pill */}
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${activeUsersCount > 0 ? "bg-emerald-400 animate-pulse" : "bg-slate-400"}`} />
                  <span className={`${activeUsersCount > 0 ? "text-emerald-500" : "text-slate-400"} font-semibold truncate`}>
                    {activeUsersCount > 0
                      ? (isBn
                          ? `${formatNumber(activeUsersCount)} জন শিক্ষার্থী লাইভ`
                          : `${activeUsersCount} SEUian${activeUsersCount === 1 ? "" : "s"} online`)
                      : (isBn ? "লাইভ কানেক্টেড" : "LiveSync connected")}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Action Buttons (Minimalist & Sleek) */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Day / Night Theme Toggle */}
              {/* Notification ON/OFF Toggle */}
              <button
                type="button"
                onClick={handleToggleNotifications}
                className={`p-1.5 rounded-xl transition-all border ${
                  notificationsEnabled
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25 shadow-xs"
                    : isDark
                    ? "bg-slate-800/80 border-slate-700 text-slate-500 hover:text-slate-300"
                    : "bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600"
                }`}
                title={
                  notificationsEnabled
                    ? isBn
                      ? "নোটিফিকেশন চালু (বন্ধ করতে ক্লিক করুন)"
                      : "Notifications ON (click to mute)"
                    : isBn
                    ? "নোটিফিকেশন বন্ধ (চালু করতে ক্লিক করুন)"
                    : "Notifications OFF (click to enable)"
                }
                aria-label="Toggle notifications"
              >
                {notificationsEnabled ? (
                  <Bell className="w-3.5 h-3.5 fill-amber-400/20" />
                ) : (
                  <BellOff className="w-3.5 h-3.5" />
                )}
              </button>

              {/* 1-Click Reset to Default Corner */}
              <button
                onClick={handleResetPosition}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors"
                title={isBn ? "ডিফল্ট কর্নারে রিসেট করুন" : "Reset position to corner"}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Sound Notification Toggle */}
              <button
                onClick={handleToggleSound}
                className={`p-1.5 rounded-xl border transition-all ${
                  soundEnabled
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                    : isDark
                    ? "bg-slate-800/80 border-slate-700 text-slate-500 hover:text-slate-300"
                    : "bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600"
                }`}
                title={
                  soundEnabled
                    ? isBn
                      ? "সাউন্ড চালু (মিউট করতে ক্লিক করুন)"
                      : "Sound ON (click to mute)"
                    : isBn
                    ? "সাউন্ড বন্ধ (চালু করতে ক্লিক করুন)"
                    : "Sound muted (click to unmute)"
                }
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Minimize */}
              <button
                onClick={() => handleToggleOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title={isBn ? "ছোট করুন" : "Minimize"}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              {/* Close */}
              <button
                onClick={() => handleToggleOpen(false)}
                className="p-1.5 rounded-xl hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                title={isBn ? "বন্ধ করুন" : "Close"}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 📌 Pinned Announcement Banner (Clickable to jump directly to notice message in chat) */}
          {pinnedMessage && (
            <div
              onClick={() => scrollToMessage(pinnedMessage.id)}
              className={`border-b px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-xs cursor-pointer active:scale-[0.99] transition-all group/pin shadow-sm ${
                isDark
                  ? "bg-gradient-to-r from-amber-500/25 via-orange-500/15 to-amber-600/25 border-amber-500/30 text-amber-100 hover:bg-amber-500/30"
                  : "bg-gradient-to-r from-amber-100/95 via-amber-50 to-orange-100/90 border-amber-300/90 text-amber-950 hover:bg-amber-100 shadow-[0_2px_8px_rgba(245,158,11,0.12)]"
              }`}
              title={isBn ? "ক্লিক করে মূল নোটিশে যান" : "Click to view this notice message in chat"}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 group-hover/pin:scale-110 transition-transform ${
                  isDark
                    ? "bg-amber-400/20 text-amber-400"
                    : "bg-amber-200/90 text-amber-800 border border-amber-300"
                }`}>
                  <Pin className={`w-3.5 h-3.5 ${isDark ? "text-amber-400 fill-amber-400" : "text-amber-800 fill-amber-800"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`font-black text-[11px] tracking-wide uppercase ${
                      isDark ? "text-amber-300" : "text-amber-900 font-extrabold"
                    }`}>
                      {isBn ? "📌 অ্যাডমিন ঘোষণা" : "📌 Admin Announcement"}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border transition-all inline-flex items-center gap-0.5 ${
                      isDark
                        ? "text-amber-300 bg-amber-400/20 border-amber-400/30 group-hover/pin:bg-amber-400 group-hover/pin:text-black"
                        : "text-amber-900 bg-amber-200 border-amber-400/60 group-hover/pin:bg-amber-300"
                    }`}>
                      <span>{isBn ? "নোটিশে যান" : "View"}</span>
                      <span>↓</span>
                    </span>
                  </div>
                  <p className={`text-[11px] font-semibold truncate mt-0.5 transition-colors ${
                    isDark
                      ? "text-amber-100 group-hover/pin:text-white"
                      : "text-amber-950 group-hover/pin:text-black"
                  }`}>
                    {pinnedMessage.text ||
                      (isBn ? "🎙️ ভয়েস নোটিশ" : "🎙️ Voice Announcement")}
                  </p>
                </div>
              </div>

              <div
                className="flex items-center gap-1 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {extractUrlFromText(pinnedMessage.text) && (
                  <Link
                    href={extractUrlFromText(pinnedMessage.text)!}
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] transition-all flex items-center gap-1 border ${
                      isDark
                        ? "bg-amber-500/30 hover:bg-amber-400 hover:text-black text-amber-200 border-amber-400/30"
                        : "bg-amber-600 hover:bg-amber-700 text-white border-amber-700 shadow-sm"
                    }`}
                    title={isBn ? "নোটিশ পেজে যান" : "Go to notice destination"}
                  >
                    <span>{isBn ? "যান" : "Go"}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                )}
                {(isAdmin || isSuperAdmin) && (
                  <button
                    onClick={() => handleAdminUnpin(pinnedMessage.id)}
                    className={`p-1 rounded transition-colors ${
                      isDark
                        ? "hover:bg-amber-500/30 text-amber-300/80 hover:text-amber-200"
                        : "hover:bg-amber-200 text-amber-800 hover:text-amber-950"
                    }`}
                    title={isBn ? "আনপিন করুন" : "Unpin announcement"}
                  >
                    <PinOff className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Messages Feed Area with Floating Scroll-to-Bottom Arrow */}
          <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
            <div
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-3.5 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
            >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <MessageSquare className="w-12 h-12 text-slate-600 mb-2" />
                <p className="font-semibold text-slate-300 text-sm">
                  {isBn ? "চ্যাটরুমে এখনো কোনো বার্তা নেই" : "No messages in chatroom yet"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {isBn
                    ? "প্রথম মেসেজটি পাঠিয়ে আলোচনা শুরু করুন!"
                    : "Send the first message to start the conversation!"}
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = user?.id === msg.senderId;
                const isRoleAdmin =
                  msg.senderRole === "ROLE_ADMIN" || msg.senderRole === "ROLE_SUPER_ADMIN";
                const isRoleFaculty = msg.senderRole === "ROLE_FACULTY";

                return (
                  <div
                    key={msg.id}
                    id={`chat-msg-${msg.id}`}
                    className={`group flex items-start gap-2.5 transition-all duration-300 rounded-2xl ${
                      highlightedMessageId === msg.id
                        ? "p-3 bg-amber-400/25 dark:bg-amber-500/30 ring-2 ring-amber-400 shadow-2xl shadow-amber-500/40 scale-[1.02] rounded-2xl animate-pulse"
                        : msg.pinned
                        ? isDark
                          ? "p-2 rounded-2xl bg-amber-500/15 border border-amber-500/40"
                          : "p-2 rounded-2xl bg-amber-100/70 border-2 border-amber-400 shadow-sm"
                        : ""
                    }`}
                  >
                    {/* User Avatar */}
                    <div className="relative shrink-0 mt-0.5">
                      {msg.senderAvatarUrl ? (
                        <img
                          src={msg.senderAvatarUrl}
                          alt={msg.senderName}
                          className="w-7 h-7 rounded-full object-cover ring-1 ring-white/20"
                        />
                      ) : (
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow ${
                            isRoleAdmin
                              ? "bg-gradient-to-tr from-amber-600 to-rose-600 ring-2 ring-amber-400/50"
                              : isRoleFaculty
                              ? "bg-gradient-to-tr from-cyan-600 to-blue-600 ring-2 ring-cyan-400/50"
                              : "bg-gradient-to-tr from-slate-700 to-indigo-800 ring-1 ring-white/20"
                          }`}
                        >
                          {msg.senderName ? msg.senderName.charAt(0).toUpperCase() : "U"}
                        </div>
                      )}
                    </div>

                    {/* Message Bubble & Content */}
                    <div className="flex-1 min-w-0">
                      {/* Sender Line */}
                      <div className="flex items-center flex-wrap gap-1.5 mb-1">
                        <span className={`font-semibold text-xs ${
                          isDark ? "text-slate-200" : "text-slate-800"
                        }`}>
                          {msg.senderName}
                        </span>

                        {/* Verified Role Badge */}
                        {isRoleAdmin ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-400">
                            <ShieldCheck className="w-2.5 h-2.5 text-amber-400" />
                            {isBn ? "অ্যাডমিন (SEU)" : "Admin"}
                          </span>
                        ) : isRoleFaculty ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full text-[9px] font-bold bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
                            <GraduationCap className="w-2.5 h-2.5 text-cyan-400" />
                            {isBn ? "শিক্ষক" : "Faculty"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-500">
                            <span className="w-1 h-1 rounded-full bg-emerald-400" />
                            {isBn ? "শিক্ষার্থী" : "Student"}
                          </span>
                        )}

                        {/* 📌 Pinned Announcement Indicator Badge */}
                        {msg.pinned && (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            isDark
                              ? "bg-amber-400/20 border border-amber-400/40 text-amber-300"
                              : "bg-amber-300 border border-amber-500 text-amber-950 font-bold"
                          }`}>
                            <Pin className="w-2.5 h-2.5 fill-current" />
                            <span>{isBn ? "পিন নোটিশ" : "PINNED"}</span>
                          </span>
                        )}

                        {/* Verified Student Email */}
                        {msg.senderEmail && (
                          <span className={`text-[10px] font-mono truncate max-w-[140px] ${
                            isDark ? "text-slate-400/70" : "text-slate-500"
                          }`}>
                            {msg.senderEmail}
                          </span>
                        )}
                      </div>

                      {/* Quoted Reply Reference */}
                      {msg.replyToText && (
                        <div
                          onClick={(e) => {
                            if (msg.replyToId) {
                              e.stopPropagation();
                              scrollToMessage(msg.replyToId);
                            }
                          }}
                          className={`mb-1 px-2.5 py-1 rounded-lg border-l-2 border-cyan-400 text-[11px] flex items-center justify-between cursor-pointer hover:opacity-85 transition-all ${
                            isDark ? "bg-white/5 text-slate-300 hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                          title={isBn ? "ক্লিক করে মূল বার্তায় যান" : "Click to view original message"}
                        >
                          <div className="truncate">
                            <span className="text-cyan-400 font-semibold">
                              {msg.replyToSender}:{" "}
                            </span>
                            <span className={isDark ? "text-slate-400" : "text-slate-500"}>{msg.replyToText}</span>
                          </div>
                          <span className="text-[10px] text-cyan-400 font-mono ml-2 shrink-0">↑ view</span>
                        </div>
                      )}

                      {/* Bubble */}
                      <div
                        className={`relative px-3.5 py-2 rounded-2xl text-xs leading-relaxed max-w-[92%] shadow-md ${
                          isMe
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-sm ml-auto border border-blue-400/30"
                            : msg.pinned
                            ? isDark
                              ? "bg-gradient-to-r from-amber-950/70 to-slate-900/90 text-amber-100 border border-amber-500/40 rounded-tl-sm shadow-amber-500/10"
                              : "bg-amber-100/95 text-amber-950 font-medium border border-amber-300 rounded-tl-sm shadow-sm"
                            : isDark
                            ? "bg-slate-800/90 text-slate-100 rounded-tl-sm border border-white/5"
                            : "bg-white text-slate-800 rounded-tl-sm border border-slate-200/90 shadow-sm"
                        }`}
                      >
                        {/* TEXT MESSAGE */}
                        {msg.messageType === "TEXT" && (
                          <div className="whitespace-pre-wrap break-words">{renderFormattedText(msg.text)}</div>
                        )}

                        {/* IMAGE MESSAGE */}
                        {(msg.messageType === "IMAGE" || msg.imageUrl) && (
                          <div className="space-y-1.5 py-0.5">
                            <div className="relative rounded-xl overflow-hidden group/img cursor-pointer bg-black/10">
                              <img
                                src={
                                  msg.imageUrl?.startsWith("http")
                                    ? msg.imageUrl
                                    : `${typeof window !== "undefined" ? window.location.origin : ""}${msg.imageUrl?.startsWith("/") ? "" : "/"}${msg.imageUrl}`
                                }
                                alt="Shared Image"
                                className="max-h-56 max-w-full rounded-xl object-cover hover:scale-[1.01] transition-transform duration-200"
                                onClick={() => setFullscreenImageUrl(msg.imageUrl || null)}
                                loading="lazy"
                              />
                              <div
                                onClick={() => setFullscreenImageUrl(msg.imageUrl || null)}
                                className="absolute inset-0 bg-black/35 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold backdrop-blur-[1px]"
                              >
                                <ZoomIn className="w-4 h-4" />
                                <span>{isBn ? "বড় করে দেখুন" : "View"}</span>
                              </div>
                            </div>
                            {msg.text && (
                              <div className="whitespace-pre-wrap break-words pt-1">{renderFormattedText(msg.text)}</div>
                            )}
                          </div>
                        )}

                        {/* VOICE MESSAGE */}
                        {msg.messageType === "VOICE" && (
                          <div className="flex items-center gap-2 py-0.5">
                            {/* Play/Pause Button */}
                            <button
                              onClick={() => handlePlayVoice(msg.id, msg.voiceUrl)}
                              className="w-7 h-7 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center shrink-0 shadow transition-transform active:scale-95"
                            >
                              {playingMessageId === msg.id ? (
                                <Pause className="w-3.5 h-3.5 fill-slate-950" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-slate-950 ml-0.5" />
                              )}
                            </button>

                            {/* Waveform Bars */}
                            <div className="flex items-center gap-0.5 h-5 flex-1 px-1">
                              {[40, 75, 55, 90, 60, 85, 45, 100, 70, 50, 80, 65, 40].map(
                                (h, i) => (
                                  <span
                                    key={i}
                                    style={{ height: `${h}%` }}
                                    className={`w-0.5 rounded-full transition-all duration-150 ${
                                      playingMessageId === msg.id
                                        ? "bg-cyan-300 animate-pulse"
                                        : "bg-slate-400/50"
                                    }`}
                                  />
                                )
                              )}
                            </div>

                            {/* Duration & Speed */}
                            <div className="flex flex-col items-end text-[10px] text-slate-300 shrink-0">
                              <span>{msg.voiceDuration || 1}s</span>
                              <button
                                onClick={cyclePlaybackRate}
                                className="font-bold text-cyan-300 hover:underline"
                                title={isBn ? "স্পিড পরিবর্তন করুন" : "Change speed"}
                              >
                                {audioPlaybackRate}x
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Timestamp & Micro Actions */}
                        <div className="flex items-center justify-between gap-2 mt-1 pt-1 border-t border-white/10 text-[10px] text-slate-400">
                          <span>{formatTime(msg.createdAt)}</span>

                          <div className="flex items-center gap-2">
                            {/* Quote Reply */}
                            <button
                              onClick={() => setReplyTo(msg)}
                              className="hover:text-cyan-300 transition-colors flex items-center gap-0.5"
                              title={isBn ? "রিপ্লাই করুন" : "Reply"}
                            >
                              <Reply className="w-3 h-3" />
                            </button>

                            {/* Like Heart */}
                            <button
                              onClick={() => handleToggleLike(msg.id)}
                              className={`flex items-center gap-1 transition-transform active:scale-125 ${
                                msg.likedByMe
                                  ? "text-rose-400 font-bold"
                                  : "text-slate-400 hover:text-rose-400"
                              }`}
                              title={isBn ? "লাইক" : "Like"}
                            >
                              <Heart
                                className={`w-3.5 h-3.5 ${
                                  msg.likedByMe ? "fill-rose-500 text-rose-500" : ""
                                }`}
                              />
                              <span>{formatNumber(msg.likesCount || 0)}</span>
                            </button>

                            {/* Admin Actions */}
                            {(isAdmin || isSuperAdmin) && (
                              <div className="flex items-center gap-1 border-l border-white/20 pl-1.5 ml-1">
                                {msg.pinned ? (
                                  <button
                                    onClick={() => handleAdminUnpin(msg.id)}
                                    className="text-amber-400 hover:text-amber-300"
                                    title={isBn ? "আনপিন করুন" : "Unpin"}
                                  >
                                    <PinOff className="w-3 h-3" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleAdminPin(msg.id)}
                                    className="text-slate-400 hover:text-amber-300"
                                    title={isBn ? "পিন করুন" : "Pin"}
                                  >
                                    <Pin className="w-3 h-3" />
                                  </button>
                                )}

                                <button
                                  onClick={() => handleAdminDelete(msg)}
                                  className="text-slate-400 hover:text-rose-400"
                                  title={isBn ? "ডিলিট করুন" : "Delete"}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
            </div>

            {/* Scroll to Bottom Floating Arrow Button (Messenger / ChatGPT style) */}
            {showScrollBottom && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 animate-in fade-in zoom-in-75 slide-in-from-bottom-2 duration-200">
                <button
                  type="button"
                  onClick={() => scrollToBottom(true)}
                  className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/95 hover:bg-slate-800 text-cyan-300 hover:text-white border border-cyan-400/50 shadow-[0_8px_25px_rgba(0,0,0,0.8),0_0_15px_rgba(34,211,238,0.35)] backdrop-blur-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer ring-1 ring-white/10"
                  title={isBn ? "সর্বশেষ মেসেজে যান ↓" : "Scroll to latest message ↓"}
                >
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                    <ChevronDown className="w-3.5 h-3.5 text-cyan-400 group-hover:text-slate-950 group-hover:translate-y-0.5 transition-all" />
                  </div>
                  <span className="text-[11px] font-bold tracking-wide">
                    {isBn ? "সর্বশেষ মেসেজ" : "Latest Message"}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* User Blocked Banner */}
          {user?.chatBlocked && (
            <div className="px-4 py-2 bg-rose-950/90 border-t border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                {isBn
                  ? "আপনার চ্যাট অ্যাকাউন্ট সাময়িকভাবে স্থগিত করা হয়েছে।"
                  : "Your chat access is temporarily suspended by an administrator."}
              </span>
            </div>
          )}

          {/* Profanity Warning */}
          {profanityWarning && (
            <div className="px-4 py-1.5 bg-amber-500/15 border-t border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                {isBn
                  ? "অনুগ্রহ করে মার্জিত ভাষা বজায় রাখুন। অশালীন শব্দ স্বয়ংক্রিয়ভাবে ফিল্টার হবে।"
                  : "Please maintain respectful language. Profanity is automatically filtered."}
              </span>
            </div>
          )}

          {/* Replying Banner */}
          {replyTo && (
            <div className={`px-4 py-1.5 border-t flex items-center justify-between text-xs transition-colors ${
              isDark ? "bg-indigo-950/80 border-indigo-500/30 text-indigo-200" : "bg-blue-50 border-blue-200 text-blue-900"
            }`}>
              <div className="flex items-center gap-2 truncate">
                <Reply className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="truncate">
                  {isBn ? "রিপ্লাই দিচ্ছেন" : "Replying to"}{" "}
                  <span className="font-bold">{replyTo.senderName}</span>: &quot;
                  {replyTo.text ||
                    (replyTo.messageType === "VOICE"
                      ? isBn
                        ? "🎙️ ভয়েস মেসেজ"
                        : "🎙️ Voice Note"
                      : isBn
                      ? "📷 ছবি"
                      : "📷 Image")}&quot;
                </span>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Image Attachment Preview Bar */}
          {selectedImageFile && imagePreviewUrl && (
            <div className={`px-3.5 py-2.5 border-t flex items-center justify-between gap-3 shadow-inner transition-colors ${
              isDark ? "bg-slate-900/95 border-indigo-500/30 text-white" : "bg-blue-50/95 border-blue-200 text-slate-800"
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-blue-300 dark:border-white/20 shadow-sm bg-black/10">
                  <img
                    src={imagePreviewUrl}
                    alt="Attachment preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold truncate">
                    {selectedImageFile.name}
                  </span>
                  <span className="text-[10px] text-blue-600 dark:text-cyan-400 font-medium">
                    {(selectedImageFile.size / (1024 * 1024)).toFixed(2)} MB • {isBn ? "ছবি প্রস্তুত (পাঠাতে পারেন)" : "Image ready to send"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={cancelImageAttachment}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 transition-colors"
                >
                  {isBn ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleSendImage}
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/30 active:scale-95 transition-all"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {isBn ? "পাঠান" : "Send"}
                </button>
              </div>
            </div>
          )}

          {/* Voice Preview Bar */}
          {voiceBlob && (
            <div className="px-4 py-2.5 bg-emerald-950/90 border-t border-emerald-500/40 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-2.5 text-xs text-emerald-300">
                <button
                  type="button"
                  onClick={togglePreviewPlayback}
                  className="w-7 h-7 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 flex items-center justify-center shrink-0 shadow transition-transform active:scale-95"
                  title={isPreviewPlaying ? (isBn ? "থামান" : "Pause preview") : (isBn ? "শুনুন" : "Play preview")}
                >
                  {isPreviewPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-slate-950" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-slate-950 ml-0.5" />
                  )}
                </button>
                <div className="flex flex-col">
                  <span className="font-bold text-emerald-200 text-xs">
                    {isPreviewPlaying
                      ? (isBn ? "প্লে হচ্ছে..." : "Playing...")
                      : (isBn ? "ভয়েস রেকর্ড তৈরি" : "Voice ready")}
                  </span>
                  <span className="text-[10px] text-emerald-400/80">
                    {voiceDuration}s • {isBn ? "পাঠানোর আগে শুনে নিন" : "Preview before sending"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
                >
                  {isBn ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleSendVoice}
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/25 active:scale-95 transition-all"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {isBn ? "পাঠান" : "Send"}
                </button>
              </div>
            </div>
          )}

          {/* Recording in Progress Bar */}
          {isRecording && (
            <div className="px-4 py-2 bg-rose-950/90 border-t border-rose-500/40 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2 text-xs text-rose-300 font-mono font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span>
                  {isBn ? "রেকর্ডিং: " : "Recording: "}
                  00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelRecording}
                  className="p-1.5 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700"
                  title={isBn ? "বাতিল" : "Cancel"}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={stopRecording}
                  className="p-1.5 rounded-full bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                  title={isBn ? "সমাপ্ত করুন" : "Done"}
                >
                  <Square className="w-3.5 h-3.5 fill-slate-950" />
                </button>
              </div>
            </div>
          )}

          {/* Bottom Input Area */}
          {!isRecording && !voiceBlob && (
            <form
              onSubmit={handleSendMessage}
              className={`p-2.5 border-t flex items-center gap-2 transition-colors ${
                isDark ? "bg-slate-950/90 border-white/10" : "bg-slate-100/90 border-slate-200"
              }`}
            >
              {/* Hidden File Input for Images */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />

              {/* Image Upload Button */}
              <button
                type="button"
                onClick={() => {
                  if (checkAuthGuard()) {
                    imageInputRef.current?.click();
                  }
                }}
                disabled={Boolean(user?.chatBlocked)}
                className={`p-2 rounded-full border transition-all shrink-0 ${
                  user?.chatBlocked
                    ? "opacity-40 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400"
                    : isDark
                    ? "bg-slate-800/80 hover:bg-indigo-600/40 border-white/10 text-cyan-300 hover:text-white"
                    : "bg-white hover:bg-blue-50 border-slate-300 text-blue-600 hover:text-blue-700 shadow-sm"
                }`}
                title={isBn ? "ছবি যুক্ত করুন" : "Attach image"}
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {/* Mic Button */}
              <button
                type="button"
                onClick={startRecording}
                disabled={Boolean(user?.chatBlocked)}
                className={`p-2 rounded-full border transition-all shrink-0 ${
                  user?.chatBlocked
                    ? "opacity-40 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400"
                    : isDark
                    ? "bg-slate-800/80 hover:bg-indigo-600/40 border-white/10 text-cyan-300 hover:text-white"
                    : "bg-white hover:bg-blue-50 border-slate-300 text-blue-600 hover:text-blue-700 shadow-sm"
                }`}
                title={isBn ? "ভয়েস রেকর্ড করুন" : "Record voice"}
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Text Input Pill */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  onClick={() => {
                    if (!isAuthenticated) checkAuthGuard();
                  }}
                  disabled={Boolean(user?.chatBlocked)}
                  placeholder={
                    user?.chatBlocked
                      ? isBn
                        ? "আপনার চ্যাট স্থগিত রয়েছে..."
                        : "Your chat is suspended..."
                      : selectedImageFile
                      ? isBn
                        ? "ছবির সাথে ক্যাপশন লিখুন..."
                        : "Add a caption for image..."
                      : isAuthenticated
                      ? isBn
                        ? "একটি বার্তা লিখুন..."
                        : "Type a message..."
                      : isBn
                      ? "লগইন করে চ্যাটে অংশ নিন..."
                      : "Sign in to participate..."
                  }
                  className={`w-full rounded-full px-4 py-2 text-xs transition-colors disabled:opacity-50 focus:outline-none ${
                    isDark
                      ? "bg-slate-900/90 border border-white/15 focus:border-cyan-400 text-white placeholder-slate-400"
                      : "bg-white border border-slate-300 focus:border-blue-500 text-slate-900 placeholder-slate-400 shadow-inner"
                  }`}
                />
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={(!inputText.trim() && !selectedImageFile) || isSubmitting || Boolean(user?.chatBlocked)}
                className={`p-2 rounded-full transition-all shrink-0 ${
                  (!inputText.trim() && !selectedImageFile) || isSubmitting || user?.chatBlocked
                    ? isDark
                      ? "opacity-40 cursor-not-allowed bg-slate-800 text-slate-500"
                      : "opacity-40 cursor-not-allowed bg-slate-200 text-slate-400"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg active:scale-95"
                }`}
                title={isBn ? "পাঠান" : "Send"}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          )}

          {/* Admin Delete Confirmation Modal Overlay */}
          {deleteConfirmMsg && (
            <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 rounded-3xl animate-in fade-in zoom-in-95 duration-150">
              <div
                className="w-full max-w-[320px] bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl space-y-3.5 text-left text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">
                      {isBn ? "মেসেজ ডিলিট নিশ্চিতকরণ" : "Delete Message"}
                    </h4>
                    <p className="text-[11px] text-slate-400">SEU Campus Live</p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {isBn
                    ? `আপনি কি নিশ্চিত ${deleteConfirmMsg.senderName}-এর এই মেসেজটি পার্মানেন্টলি ডিলিট করতে চান?`
                    : `Are you sure you want to permanently delete this message sent by ${deleteConfirmMsg.senderName}?`}
                </p>

                {deleteConfirmMsg.text && (
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 italic truncate max-h-16 overflow-hidden">
                    "{deleteConfirmMsg.text}"
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmMsg(null)}
                    disabled={isDeletingMsg}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    {isBn ? "বাতিল" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteMessage}
                    disabled={isDeletingMsg}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-md shadow-rose-600/30 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isDeletingMsg ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{isBn ? "ডিলিট হচ্ছে..." : "Deleting..."}</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isBn ? "ডিলিট করুন" : "Delete"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Image Lightbox Modal */}
      {fullscreenImageUrl && (
        <div
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setFullscreenImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={fullscreenImageUrl}
              alt="Fullscreen attachment"
              className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
            />
            <div className="flex items-center gap-3 mt-3">
              <a
                href={fullscreenImageUrl}
                download="chat-image"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-colors border border-white/10"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isBn ? "ডাউনলোড করুন" : "Download"}</span>
              </a>
              <button
                onClick={() => setFullscreenImageUrl(null)}
                className="px-4 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>{isBn ? "বন্ধ করুন" : "Close"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
