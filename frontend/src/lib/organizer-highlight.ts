const organizerStyles = [
  {
    border: "border-l-blue-500",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
    ring: "ring-blue-400",
  },
  {
    border: "border-l-emerald-500",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    ring: "ring-emerald-400",
  },
  {
    border: "border-l-violet-500",
    badge: "border-violet-200 bg-violet-50 text-violet-700",
    dot: "bg-violet-500",
    ring: "ring-violet-400",
  },
  {
    border: "border-l-orange-500",
    badge: "border-orange-200 bg-orange-50 text-orange-700",
    dot: "bg-orange-500",
    ring: "ring-orange-400",
  },
  {
    border: "border-l-pink-500",
    badge: "border-pink-200 bg-pink-50 text-pink-700",
    dot: "bg-pink-500",
    ring: "ring-pink-400",
  },
  {
    border: "border-l-cyan-500",
    badge: "border-cyan-200 bg-cyan-50 text-cyan-700",
    dot: "bg-cyan-500",
    ring: "ring-cyan-400",
  },
] as const;

export const getOrganizerStyle = (organizer?: string) => {
  const name = organizer?.trim() || "Chưa xác định";
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = ((hash << 5) - hash + name.charCodeAt(index)) | 0;
  }
  return organizerStyles[Math.abs(hash) % organizerStyles.length];
};
