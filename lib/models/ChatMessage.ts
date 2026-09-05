import mongoose, { Schema, model, models } from "mongoose";

export interface IChatMessage {
  sessionId?: string;
  userQuery: string;
  botReply: string;
  aiModel?: string;
  provider?: string;
  language?: string;
  fallbackUsed?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    sessionId: { type: String, index: true },
    userQuery: { type: String, required: true },
    botReply: { type: String, required: true },
    aiModel: { type: String, default: "gemini-3.6-flash" },
    provider: { type: String, default: "gemini" },
    language: { type: String, default: "en" },
    fallbackUsed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const ChatMessage =
  models.ChatMessage || model<IChatMessage>("ChatMessage", ChatMessageSchema);

export default ChatMessage;
