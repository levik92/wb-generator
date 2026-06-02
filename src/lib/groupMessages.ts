// Telegram-style message grouping with date separators.
// Consecutive messages of the same sender within `gapSeconds` are grouped:
// the sender label appears once at the top, the timestamp once at the bottom.

export type SenderType = "user" | "ai" | "admin" | "system";

export interface ChatMessage {
  id: string;
  sender_type: SenderType | string;
  content: string;
  created_at: string;
  attachment_url?: string | null;
}

export interface MessageInGroup<M extends ChatMessage> {
  msg: M;
  position: "single" | "first" | "middle" | "last";
}

export interface MessageGroup<M extends ChatMessage = ChatMessage> {
  key: string;
  sender_type: M["sender_type"];
  startedAt: string;
  endedAt: string;
  items: MessageInGroup<M>[];
}

export interface ChatTimelineDateSeparator {
  type: "date";
  key: string;
  date: string; // ISO date for the start of that day
}

export interface ChatTimelineGroup<M extends ChatMessage = ChatMessage> {
  type: "group";
  group: MessageGroup<M>;
}

export type ChatTimelineItem<M extends ChatMessage = ChatMessage> =
  | ChatTimelineDateSeparator
  | ChatTimelineGroup<M>;

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

export const buildChatTimeline = <M extends ChatMessage>(
  messages: M[],
  opts: { gapSeconds?: number } = {}
): ChatTimelineItem<M>[] => {
  const gap = (opts.gapSeconds ?? 60) * 1000;
  const out: ChatTimelineItem<M>[] = [];
  if (!messages.length) return out;

  let currentDayKey = "";
  let currentGroup: MessageGroup<M> | null = null;

  const flushPositions = (group: MessageGroup<M>) => {
    if (group.items.length === 1) {
      group.items[0].position = "single";
    } else {
      group.items.forEach((item, idx) => {
        if (idx === 0) item.position = "first";
        else if (idx === group.items.length - 1) item.position = "last";
        else item.position = "middle";
      });
    }
  };

  for (const msg of messages) {
    const dKey = dayKey(msg.created_at);
    if (dKey !== currentDayKey) {
      if (currentGroup) {
        flushPositions(currentGroup);
        currentGroup = null;
      }
      currentDayKey = dKey;
      out.push({ type: "date", key: `date-${dKey}`, date: msg.created_at });
    }

    const isSystem = msg.sender_type === "system";
    const canGroup =
      currentGroup &&
      !isSystem &&
      currentGroup.sender_type === msg.sender_type &&
      new Date(msg.created_at).getTime() -
        new Date(currentGroup.endedAt).getTime() <=
        gap;

    if (canGroup && currentGroup) {
      currentGroup.items.push({ msg, position: "last" });
      currentGroup.endedAt = msg.created_at;
    } else {
      if (currentGroup) flushPositions(currentGroup);
      currentGroup = {
        key: `g-${msg.id}`,
        sender_type: msg.sender_type,
        startedAt: msg.created_at,
        endedAt: msg.created_at,
        items: [{ msg, position: "single" }],
      };
      out.push({ type: "group", group: currentGroup });
    }
  }

  if (currentGroup) flushPositions(currentGroup);
  return out;
};

// Tailwind helpers to round message bubbles based on grouping position.
// Side: "user" bubbles align right (own side), "other" bubbles align left.
export const bubbleRoundingClasses = (
  side: "own" | "other",
  position: MessageInGroup<ChatMessage>["position"]
): string => {
  if (side === "own") {
    switch (position) {
      case "single":
        return "rounded-2xl rounded-br-md";
      case "first":
        return "rounded-2xl rounded-br-md";
      case "middle":
        return "rounded-2xl rounded-r-md";
      case "last":
        return "rounded-2xl rounded-tr-md";
    }
  } else {
    switch (position) {
      case "single":
        return "rounded-2xl rounded-bl-md";
      case "first":
        return "rounded-2xl rounded-bl-md";
      case "middle":
        return "rounded-2xl rounded-l-md";
      case "last":
        return "rounded-2xl rounded-tl-md";
    }
  }
  return "rounded-2xl";
};
