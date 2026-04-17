import { Injectable } from "@nestjs/common";
import { ChatService } from "../../chat/chat.service";
import { ConversationType } from "../../chat/entities/conversation.entity";
import { MessageType } from "../../chat/entities/message.entity";

export interface EmergencyChatOptions {
  userId: string;
  mechanicId: string;
  emergencyRequestId?: string;
  problemType: string;
  location: { lat: number; lng: number };
}

export interface QuickMessageTemplate {
  id: string;
  category: "status" | "eta" | "info" | "help";
  message: string;
  icon: string;
}

@Injectable()
export class EmergencyChatService {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Create emergency chat with mechanic
   */
  async createEmergencyChat(options: EmergencyChatOptions) {
    const initialMessage = this.getInitialEmergencyMessage(options);

    const conversation = await this.chatService.getOrCreateConversation(
      {
        type: ConversationType.MECHANIC,
        participantId: options.mechanicId,
        referenceId: options.emergencyRequestId,
        referenceType: "emergency_request",
        initialMessage,
      },
      options.userId,
    );

    return {
      conversationId: conversation.id,
      quickTemplates: this.getQuickMessageTemplates(options.problemType),
    };
  }

  /**
   * Get initial emergency message
   */
  private getInitialEmergencyMessage(options: EmergencyChatOptions): string {
    const problemLabels = {
      battery_dead: "🔋 Battery Dead / Jump Start",
      flat_tire: "🛞 Flat Tire",
      out_of_fuel: "⛽ Out of Fuel",
      engine_trouble: "🔧 Engine Trouble",
      towing_required: "🚗 Towing Required",
      ev_charging_issue: "⚡ EV Charging Issue",
      accident: "🚙 Accident / Collision",
      general: "🔩 General Issue",
    };

    const problemLabel = problemLabels[options.problemType] || "Emergency";
    const locationLink = `https://maps.google.com/?q=${options.location.lat},${options.location.lng}`;

    return `🚨 EMERGENCY: ${problemLabel}\n\n📍 Location: ${locationLink}\n\nI need immediate assistance. Please confirm you're on your way.`;
  }

  /**
   * Get quick message templates based on problem type
   */
  getQuickMessageTemplates(problemType: string): QuickMessageTemplate[] {
    const commonTemplates: QuickMessageTemplate[] = [
      {
        id: "eta_request",
        category: "eta",
        message: "⏰ How long until you arrive?",
        icon: "⏰",
      },
      {
        id: "confirm",
        category: "status",
        message: "✅ Confirmed. I'll be here waiting.",
        icon: "✅",
      },
      {
        id: "additional_help",
        category: "help",
        message: "🆘 I need additional help/equipment",
        icon: "🆘",
      },
      {
        id: "location_update",
        category: "info",
        message: "📍 My exact location is: [Share Location]",
        icon: "📍",
      },
      {
        id: "thank_you",
        category: "status",
        message: "🙏 Thank you for coming!",
        icon: "🙏",
      },
    ];

    // Problem-specific templates
    const specificTemplates: Record<string, QuickMessageTemplate[]> = {
      battery_dead: [
        {
          id: "battery_age",
          category: "info",
          message: "🔋 Battery is more than 3 years old",
          icon: "🔋",
        },
        {
          id: "tried_jump",
          category: "info",
          message: "⚡ Already tried jump start - didn't work",
          icon: "⚡",
        },
      ],
      flat_tire: [
        {
          id: "spare_tire",
          category: "info",
          message: "🛞 I have a spare tire in the trunk",
          icon: "🛞",
        },
        {
          id: "no_spare",
          category: "help",
          message: "❌ No spare tire available",
          icon: "❌",
        },
      ],
      engine_trouble: [
        {
          id: "engine_sound",
          category: "info",
          message: "🔊 Engine making unusual sounds",
          icon: "🔊",
        },
        {
          id: "smoke",
          category: "help",
          message: "💨 Smoke coming from engine",
          icon: "💨",
        },
      ],
      accident: [
        {
          id: "injuries",
          category: "help",
          message: "🚑 There are injuries - called 911",
          icon: "🚑",
        },
        {
          id: "police_called",
          category: "status",
          message: "👮 Police have been notified",
          icon: "👮",
        },
      ],
    };

    const specific = specificTemplates[problemType] || [];
    return [...commonTemplates, ...specific];
  }

  /**
   * Get mechanic quick response templates
   */
  getMechanicQuickTemplates(): QuickMessageTemplate[] {
    return [
      {
        id: "on_way",
        category: "status",
        message: "🚗 On my way! ETA: [X] minutes",
        icon: "🚗",
      },
      {
        id: "arrived",
        category: "status",
        message: "📍 I've arrived at your location",
        icon: "📍",
      },
      {
        id: "need_info",
        category: "info",
        message: "❓ Can you provide more details about the issue?",
        icon: "❓",
      },
      {
        id: "additional_tools",
        category: "info",
        message: "🔧 I need to get additional tools/parts",
        icon: "🔧",
      },
      {
        id: "delay",
        category: "status",
        message: "⏱️ Running 10 minutes late due to traffic",
        icon: "⏱️",
      },
      {
        id: "completed",
        category: "status",
        message: "✅ Service completed! Safe to drive now.",
        icon: "✅",
      },
      {
        id: "follow_up",
        category: "status",
        message: "📞 Please call me if you have any issues",
        icon: "📞",
      },
    ];
  }

  /**
   * Send emergency status update
   */
  async sendEmergencyStatusUpdate(
    conversationId: string,
    userId: string,
    status: "en_route" | "arrived" | "working" | "completed" | "delayed",
    additionalInfo?: string,
  ) {
    const statusMessages = {
      en_route: "🚗 I'm on my way to your location",
      arrived: "📍 I've arrived. Looking for your vehicle now.",
      working: "🔧 Working on fixing the issue",
      completed: "✅ All done! Your vehicle is ready.",
      delayed: "⏱️ Running a bit late",
    };

    const message = additionalInfo
      ? `${statusMessages[status]}\n\n${additionalInfo}`
      : statusMessages[status];

    return this.chatService.sendMessage(
      {
        conversationId,
        content: message,
        type: MessageType.TEXT,
      },
      userId,
    );
  }

  /**
   * Send location share message
   */
  async shareLocation(
    conversationId: string,
    userId: string,
    lat: number,
    lng: number,
    label?: string,
  ) {
    const locationMessage = label
      ? `📍 ${label}\nhttps://maps.google.com/?q=${lat},${lng}`
      : `📍 My location:\nhttps://maps.google.com/?q=${lat},${lng}`;

    return this.chatService.sendMessage(
      {
        conversationId,
        content: locationMessage,
        type: MessageType.TEXT,
      },
      userId,
    );
  }

  /**
   * Send ETA update
   */
  async sendETAUpdate(
    conversationId: string,
    mechanicId: string,
    etaMinutes: number,
    trafficConditions?: string,
  ) {
    let message = `⏰ I'll be there in approximately ${etaMinutes} minutes.`;

    if (trafficConditions && trafficConditions !== "low") {
      const trafficEmoji =
        {
          moderate: "🟡",
          heavy: "🟠",
          severe: "🔴",
        }[trafficConditions] || "";

      message += `\n${trafficEmoji} Traffic: ${trafficConditions}`;
    }

    return this.chatService.sendMessage(
      {
        conversationId,
        content: message,
        type: MessageType.TEXT,
      },
      mechanicId,
    );
  }

  /**
   * Get emergency chat summary
   */
  async getEmergencyChatSummary(conversationId: string, userId: string) {
    const conversation = await this.chatService.getConversation(
      conversationId,
      userId,
    );
    const messages = await this.chatService.getMessages(conversationId, userId);

    const mechanicMessages = messages.filter((m) => m.senderId !== userId);
    const userMessages = messages.filter((m) => m.senderId === userId);

    // Extract status updates
    const statusUpdates = messages
      .filter(
        (m) =>
          m.content.includes("🚗") ||
          m.content.includes("📍") ||
          m.content.includes("✅"),
      )
      .map((m) => ({
        timestamp: m.createdAt,
        status: this.extractStatus(m.content),
        message: m.content,
      }));

    return {
      conversationId: conversation.id,
      createdAt: conversation.createdAt,
      totalMessages: messages.length,
      userMessages: userMessages.length,
      mechanicMessages: mechanicMessages.length,
      statusUpdates,
      lastMessage: messages[messages.length - 1],
    };
  }

  /**
   * Extract status from message content
   */
  private extractStatus(content: string): string {
    if (content.includes("on my way") || content.includes("🚗"))
      return "en_route";
    if (content.includes("arrived") || content.includes("📍")) return "arrived";
    if (content.includes("working") || content.includes("🔧")) return "working";
    if (content.includes("completed") || content.includes("✅"))
      return "completed";
    if (
      content.includes("late") ||
      content.includes("delay") ||
      content.includes("⏱️")
    )
      return "delayed";
    return "unknown";
  }
}
