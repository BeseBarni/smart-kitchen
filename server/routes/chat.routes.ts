import { zValidator } from "@hono/zod-validator";
import {
  chatMapper,
  chatService,
  conversationIdSchema,
  conversationItemsQuerySchema,
  conversationStreamInputSchema,
  createChatInputSchema,
  createConversationInputSchema,
  listConversationsQuerySchema,
  updateConversationTitleSchema,
} from "@app/modules";
import { streamConversationTurn } from "@app/ai";
import { Hono, type Context } from "hono";
import { z } from "zod";
import type { AuthEnvironment } from "../middleware/auth.middleware";
import { requireAuth } from "../middleware/auth.middleware";
import { resultToResponse } from "../middleware/error-handler";

const conversationParams = z.object({ id: conversationIdSchema });

async function streamResponse(
  context: Context<AuthEnvironment>,
  userId: string,
  conversationId: string,
  message: { message: string; attachments?: Array<{ name: string; mimeType: string; url?: string }> },
): Promise<Response> {
  const result = await streamConversationTurn({
    userId,
    conversationId,
    userMessage: message,
    abortSignal: context.req.raw.signal,
  });
  if (!result.success) return resultToResponse(context, result);
  const response = result.data.result.toUIMessageStreamResponse({
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "X-Conversation-Id": conversationId,
    },
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export const chatRoutes = new Hono<AuthEnvironment>()
  .get("/conversations", requireAuth, zValidator("query", listConversationsQuerySchema), async (context) =>
    resultToResponse(
      context,
      await chatService.listConversations(context.get("userId"), context.req.valid("query")),
    ),
  )
  .post("/conversations", requireAuth, zValidator("json", createConversationInputSchema), async (context) =>
    resultToResponse(
      context,
      await chatService.createConversation(context.get("userId"), context.req.valid("json")),
      201,
    ),
  )
  .get(
    "/conversations/:id",
    requireAuth,
    zValidator("param", conversationParams),
    zValidator("query", conversationItemsQuerySchema),
    async (context) => {
      const result = await chatService.getConversationWithItems(
        context.get("userId"),
        context.req.valid("param").id,
        context.req.valid("query"),
      );
      if (!result.success) return resultToResponse(context, result);
      return context.json({
        ...result.data,
        messages: chatMapper.toClientHistory(result.data.items),
      });
    },
  )
  .patch(
    "/conversations/:id",
    requireAuth,
    zValidator("param", conversationParams),
    zValidator("json", updateConversationTitleSchema),
    async (context) =>
      resultToResponse(
        context,
        await chatService.updateTitle(
          context.get("userId"),
          context.req.valid("param").id,
          context.req.valid("json").title,
        ),
      ),
  )
  .delete("/conversations/:id", requireAuth, zValidator("param", conversationParams), async (context) =>
    resultToResponse(
      context,
      await chatService.deleteConversation(context.get("userId"), context.req.valid("param").id),
    ),
  )
  .post(
    "/conversations/:id/stream",
    requireAuth,
    zValidator("param", conversationParams),
    zValidator("json", conversationStreamInputSchema),
    async (context) =>
      streamResponse(
        context,
        context.get("userId"),
        context.req.valid("param").id,
        context.req.valid("json"),
      ),
  )
  .post("/chat", requireAuth, zValidator("json", createChatInputSchema), async (context) => {
    const userId = context.get("userId");
    const input = context.req.valid("json");
    let conversationId = input.conversationId;
    if (!conversationId) {
      const created = await chatService.createConversation(userId);
      if (!created.success) return resultToResponse(context, created);
      conversationId = created.data.id;
    }
    return streamResponse(context, userId, conversationId, input);
  });
