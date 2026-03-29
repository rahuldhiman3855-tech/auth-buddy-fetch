export interface Creator {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  category: string;
  followers: number;
  isVerified: boolean;
}

export interface VideoPost {
  id: string;
  creatorId: string;
  creator: Creator;
  thumbnailUrl: string;
  videoUrl: string;
  title: string;
  description: string;
  views: number;
  likes: number;
  comments: number;
  duration: string;
  createdAt: string;
  category: string;
  isPremium: boolean;
}

export const categories = [
  { id: "all", name: "All", emoji: "🔥" },
  { id: "fitness", name: "Fitness", emoji: "💪" },
  { id: "yoga", name: "Yoga", emoji: "🧘" },
  { id: "finance", name: "Finance", emoji: "💰" },
  { id: "astrology", name: "Astrology", emoji: "✨" },
  { id: "dance", name: "Dance", emoji: "💃" },
  { id: "lifestyle", name: "Lifestyle", emoji: "🌟" },
  { id: "wellness", name: "Wellness", emoji: "🍃" },
  { id: "cooking", name: "Cooking", emoji: "🍳" },
  { id: "music", name: "Music", emoji: "🎵" },
];

const avatars = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
];

const thumbnails = [
  "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1545389336-cf090694435e?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&h=600&fit=crop",
  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=600&fit=crop",
];

export const creators: Creator[] = [
  { id: "1", username: "priya_fitness", displayName: "Priya Sharma", avatar: avatars[0], bio: "Certified fitness trainer | Transform your body & mind 💪", category: "fitness", followers: 125000, isVerified: true },
  { id: "2", username: "rahul_yoga", displayName: "Rahul Kapoor", avatar: avatars[1], bio: "Yoga instructor | Mindfulness & flexibility", category: "yoga", followers: 89000, isVerified: true },
  { id: "3", username: "anita_astro", displayName: "Anita Desai", avatar: avatars[2], bio: "Vedic astrologer | Daily predictions ✨", category: "astrology", followers: 210000, isVerified: true },
  { id: "4", username: "vikram_finance", displayName: "Vikram Mehta", avatar: avatars[3], bio: "Financial advisor | Wealth creation tips", category: "finance", followers: 156000, isVerified: true },
  { id: "5", username: "neha_dance", displayName: "Neha Patel", avatar: avatars[4], bio: "Classical & Bollywood dancer 💃", category: "dance", followers: 340000, isVerified: true },
  { id: "6", username: "arjun_wellness", displayName: "Arjun Singh", avatar: avatars[5], bio: "Holistic wellness coach 🍃", category: "wellness", followers: 67000, isVerified: false },
];

const videoTitles: Record<string, string[]> = {
  fitness: ["10-Min Full Body HIIT", "Abs Workout at Home", "Upper Body Strength", "Morning Cardio Blast"],
  yoga: ["Sunrise Flow Yoga", "Deep Stretch for Beginners", "Meditation Guide", "Power Yoga Session"],
  astrology: ["Weekly Horoscope Reading", "Moon Phase Energy", "Venus Transit Effects", "Birth Chart Basics"],
  finance: ["Stock Market Today", "Mutual Fund Strategy", "Tax Saving Tips 2026", "Crypto vs Gold"],
  dance: ["Bollywood Choreography", "Classical Kathak Basics", "Dance Fitness Routine", "Learn Garba Steps"],
  wellness: ["Morning Routine Secrets", "Ayurvedic Diet Tips", "Sound Healing Session", "Stress Relief Guide"],
};

export function generateVideos(count: number = 20): VideoPost[] {
  const videos: VideoPost[] = [];
  for (let i = 0; i < count; i++) {
    const creator = creators[i % creators.length];
    const catTitles = videoTitles[creator.category] || videoTitles.fitness;
    videos.push({
      id: `v${i + 1}`,
      creatorId: creator.id,
      creator,
      thumbnailUrl: thumbnails[i % thumbnails.length],
      videoUrl: "",
      title: catTitles[i % catTitles.length],
      description: `Amazing ${creator.category} content by ${creator.displayName}`,
      views: Math.floor(Math.random() * 500000) + 10000,
      likes: Math.floor(Math.random() * 50000) + 1000,
      comments: Math.floor(Math.random() * 5000) + 100,
      duration: `${Math.floor(Math.random() * 15) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
      createdAt: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
      category: creator.category,
      isPremium: Math.random() > 0.7,
    });
  }
  return videos;
}

export function formatCount(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}
