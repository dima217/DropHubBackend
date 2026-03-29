import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Channel } from './entities/channel.entity';
import { ChannelMember } from './entities/channel-member.entity';
import { Message } from './entities/message.entity';
import { MessageReaction } from './entities/message-reaction.entity';
import { ReadCursor } from './entities/read-cursor.entity';
import { CreateChannelDto } from './dto/create-channel.dto';
import { JwtPayload } from 'src/auth/types';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Channel)
    private channelRepo: Repository<Channel>,
    @InjectRepository(ChannelMember)
    private memberRepo: Repository<ChannelMember>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectRepository(MessageReaction)
    private reactionRepo: Repository<MessageReaction>,
    @InjectRepository(ReadCursor)
    private readCursorRepo: Repository<ReadCursor>,
  ) {}

  async getChannels(userId: string) {
    const members = await this.memberRepo.find({
      where: { userId },
      relations: ['channel'],
      order: { joinedAt: 'DESC' },
    });

    const items = await Promise.all(
      members.map(async (m) => {
        const channel = m.channel;
        const memberCount = await this.memberRepo.count({
          where: { channelId: channel.id },
        });
        const lastMessage = await this.messageRepo.findOne({
          where: { channelId: channel.id, deletedAt: IsNull() },
          order: { createdAt: 'DESC' },
        });
        return {
          channel_id: channel.id,
          name: channel.name,
          type: channel.type,
          created_by: channel.createdBy,
          created_at: channel.createdAt,
          member_count: memberCount,
          last_message_at: lastMessage ? Math.floor(lastMessage.createdAt.getTime() / 1000) : null,
          last_message_preview: lastMessage?.content?.slice(0, 100) || null,
          last_message_by: lastMessage?.senderId || null,
          muted: m.muted,
          role: m.role,
          description: channel.description,
        };
      }),
    );

    return { items, count: items.length };
  }

  async createChannel(dto: CreateChannelDto, user: JwtPayload) {
    const userId = user.id.toString();

    if (dto.type === 'direct') {
      const memberIds = [userId, ...dto.member_ids].filter((id) => id !== userId);
      if (memberIds.length !== 1) {
        throw new BadRequestException('Direct channel must have exactly one other member');
      }
      const otherUserId = memberIds[0];

      const existing = await this.findDirectChannel(userId, otherUserId);
      if (existing) {
        const member = await this.memberRepo.findOne({
          where: { channelId: existing.id, userId },
        });
        return {
          channel_id: existing.id,
          ...(await this.formatChannelForResponse(existing, userId, member)),
        };
      }

      const channel = this.channelRepo.create({
        name: dto.name || 'Direct',
        type: 'direct',
        description: dto.description,
        createdBy: userId,
      });
      await this.channelRepo.save(channel);

      await this.memberRepo.save([
        this.memberRepo.create({
          channelId: channel.id,
          userId,
          memberType: 'member',
          role: 'member',
        }),
        this.memberRepo.create({
          channelId: channel.id,
          userId: otherUserId,
          memberType: 'member',
          role: 'member',
        }),
      ]);

      const member = await this.memberRepo.findOne({
        where: { channelId: channel.id, userId },
      });
      return {
        channel_id: channel.id,
        ...(await this.formatChannelForResponse(channel, userId, member)),
      };
    }

    if (!dto.name?.trim()) {
      throw new BadRequestException('Group channel must have a name');
    }
    const channel = this.channelRepo.create({
      name: dto.name,
      type: 'group',
      description: dto.description,
      createdBy: userId,
    });
    await this.channelRepo.save(channel);

    const members: ChannelMember[] = [
      this.memberRepo.create({
        channelId: channel.id,
        userId,
        memberType: 'admin',
        role: 'admin',
      }),
      ...dto.member_ids.map((uid) =>
        this.memberRepo.create({
          channelId: channel.id,
          userId: uid,
          memberType: 'member',
          role: 'member',
        }),
      ),
    ];
    await this.memberRepo.save(members);

    const member = await this.memberRepo.findOne({
      where: { channelId: channel.id, userId },
    });
    return {
      channel_id: channel.id,
      ...(await this.formatChannelForResponse(channel, userId, member)),
    };
  }

  async createRoomChannel(roomId: string, ownerUserId: number | string, ownerName?: string) {
    const userId = ownerUserId.toString();
    const normalizedName = ownerName?.trim();
    const channelName = normalizedName?.length ? `${normalizedName}'s room` : 'Room chat';

    return this.channelRepo.manager.transaction(async (manager) => {
      const channelRepository = manager.getRepository(Channel);
      const memberRepository = manager.getRepository(ChannelMember);

      const channel = channelRepository.create({
        name: channelName,
        type: 'group',
        description: 'Auto-created room chat',
        createdBy: userId,
        roomId,
      });
      const savedChannel = await channelRepository.save(channel);

      const ownerMember = memberRepository.create({
        channelId: savedChannel.id,
        userId,
        memberType: 'admin',
        role: 'admin',
      });
      await memberRepository.save(ownerMember);

      return savedChannel;
    });
  }

  async deleteChannel(channelId: string): Promise<void> {
    await this.channelRepo.delete({ id: channelId });
  }

  async addMembersToRoomChannel(channelId: string, userIds: Array<number | string>) {
    if (userIds.length === 0) {
      return { added: 0 };
    }

    const channel = await this.channelRepo.findOne({
      where: { id: channelId },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }
    if (channel.type !== 'group') {
      throw new BadRequestException('Room channel must be group type');
    }

    const normalizedUserIds = userIds.map((id) => id.toString());
    const existing = await this.memberRepo.find({
      where: { channelId, userId: In(normalizedUserIds) },
    });
    const existingIds = new Set(existing.map((member) => member.userId));
    const membersToInsert = normalizedUserIds
      .filter((id) => !existingIds.has(id))
      .map((id) =>
        this.memberRepo.create({
          channelId,
          userId: id,
          memberType: 'member',
          role: 'member',
        }),
      );

    if (membersToInsert.length > 0) {
      await this.memberRepo.save(membersToInsert);
    }

    return { added: membersToInsert.length };
  }

  async removeMembersFromRoomChannel(channelId: string, userIds: Array<number | string>) {
    if (userIds.length === 0) {
      return { removed: 0 };
    }

    const normalizedUserIds = userIds.map((id) => id.toString());
    const result = await this.memberRepo.delete({
      channelId,
      userId: In(normalizedUserIds),
      memberType: 'member',
    });

    return { removed: result.affected ?? 0 };
  }

  private async findDirectChannel(userId1: string, userId2: string) {
    const members1 = await this.memberRepo.find({
      where: { userId: userId1 },
      select: ['channelId'],
    });
    const channelIds = members1.map((m) => m.channelId);

    const directChannels = await this.channelRepo.find({
      where: { id: In(channelIds), type: 'direct' },
    });

    for (const ch of directChannels) {
      const count = await this.memberRepo.count({
        where: {
          channelId: ch.id,
          userId: In([userId1, userId2]),
        },
      });
      if (count === 2) return ch;
    }
    return null;
  }

  private async formatChannelForResponse(
    channel: Channel,
    userId: string,
    member: ChannelMember | null,
  ) {
    const memberCount = await this.memberRepo.count({
      where: { channelId: channel.id },
    });
    const lastMessage = await this.messageRepo.findOne({
      where: { channelId: channel.id, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return {
      name: channel.name,
      type: channel.type,
      created_by: channel.createdBy,
      created_at: channel.createdAt,
      member_count: memberCount,
      last_message_at: lastMessage ? Math.floor(lastMessage.createdAt.getTime() / 1000) : null,
      last_message_preview: lastMessage?.content?.slice(0, 100) || null,
      last_message_by: lastMessage?.senderId || null,
      muted: member?.muted ?? false,
      role: member?.role ?? 'member',
      description: channel.description,
    };
  }

  async ensureMember(channelId: string, userId: string) {
    const member = await this.memberRepo.findOne({
      where: { channelId, userId },
    });
    if (!member) {
      throw new ForbiddenException('Not a member of this channel');
    }
    return member;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getMessages(channelId: string, userId: string, limit = 50, before?: string) {
    await this.ensureMember(channelId, userId);

    const qb = this.messageRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.reactions', 'reactions')
      .where('m.channel_id = :channelId', { channelId })
      .andWhere('m.deleted_at IS NULL')
      .orderBy('m.created_at', 'DESC');

    if (before) {
      const beforeMsg = await this.messageRepo.findOne({
        where: { id: before, channelId },
      });
      if (beforeMsg) {
        qb.andWhere('m.created_at < :beforeAt', {
          beforeAt: beforeMsg.createdAt,
        });
      }
    }

    const messages = await qb.getMany();
    const cursors = await this.readCursorRepo.find({
      where: { channelId },
    });
    const read_cursor: Record<string, string> = {};
    for (const c of cursors) {
      read_cursor[c.userId] = c.messageId;
    }

    const items = messages.map((m) => this.formatMessage(m));
    console.log(items);
    return { items, count: items.length, read_cursor };
  }

  async getMembers(channelId: string, userId: string) {
    await this.ensureMember(channelId, userId);
    const members = await this.memberRepo.find({
      where: { channelId },
      order: { joinedAt: 'ASC' },
    });
    return members.map((m) => ({
      id: m.id,
      channel_id: m.channelId,
      user_id: m.userId,
      member_type: m.memberType,
      role: m.role,
      joined_at: m.joinedAt,
      muted: m.muted,
    }));
  }

  async addMembers(channelId: string, userId: string, memberIds: string[]) {
    const member = await this.ensureMember(channelId, userId);
    if (member.memberType !== 'admin') {
      throw new ForbiddenException('Only admins can add members');
    }

    const channel = await this.channelRepo.findOne({
      where: { id: channelId },
    });
    if (!channel || channel.type === 'direct') {
      throw new BadRequestException('Cannot add members to direct channel');
    }

    const existing = await this.memberRepo.find({
      where: { channelId, userId: In(memberIds) },
    });
    const existingIds = new Set(existing.map((e) => e.userId));
    const toAdd = memberIds.filter((id) => !existingIds.has(id));

    for (const uid of toAdd) {
      await this.memberRepo.save(
        this.memberRepo.create({
          channelId,
          userId: uid,
          memberType: 'member',
          role: 'member',
        }),
      );
    }

    return { added: toAdd.length };
  }

  async removeMember(channelId: string, userId: string, targetUserId: string) {
    const member = await this.ensureMember(channelId, userId);
    const target = await this.memberRepo.findOne({
      where: { channelId, userId: targetUserId },
    });
    if (!target) {
      throw new NotFoundException('Member not found');
    }
    if (userId !== targetUserId && member.memberType !== 'admin') {
      throw new ForbiddenException('Only admins can remove other members');
    }
    await this.memberRepo.remove(target);
    return { removed: true };
  }

  // --- WebSocket / Message operations ---

  async sendMessage(
    channelId: string,
    senderId: string,
    content: string,
    clientRequestId?: string,
    mentions?: string[],
    replyToId?: string,
  ) {
    try {
    await this.ensureMember(channelId, senderId);

    this.logger.debug('Creating message:', {
      channelId,
      senderId,
      content,
      clientRequestId,
      mentions,
      replyToId,
    });
    const msg = this.messageRepo.create({
      channelId,
      senderId,
      senderType: 'user',
      content,
      contentType: 'text',
      replyToId: replyToId || null,
      mentions: mentions || [],
      clientRequestId: clientRequestId || null,
    });
    this.logger.debug('Message created:', msg);
    await this.messageRepo.save(msg);

    const fullMsg = await this.messageRepo.findOne({
      where: { id: msg.id },
      relations: ['reactions'],
    });
      if (!fullMsg) throw new NotFoundException('Message not found');
      return fullMsg;
    } catch (error) {
      this.logger.error('Error sending message:', error);
      throw error;
    }
  }

  async editMessage(channelId: string, messageId: string, userId: string, content: string) {
    await this.ensureMember(channelId, userId);
    const msg = await this.messageRepo.findOne({
      where: { id: messageId, channelId },
    });
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.senderId !== userId) throw new ForbiddenException('Not your message');
    if (msg.deletedAt) throw new BadRequestException('Message is deleted');

    msg.content = content;
    msg.editedAt = new Date();
    await this.messageRepo.save(msg);
    return msg;
  }

  async deleteMessage(channelId: string, messageId: string, userId: string) {
    await this.ensureMember(channelId, userId);
    const msg = await this.messageRepo.findOne({
      where: { id: messageId, channelId },
    });
    if (!msg) throw new NotFoundException('Message not found');
    const member = await this.memberRepo.findOne({
      where: { channelId, userId },
    });
    if (msg.senderId !== userId && member?.memberType !== 'admin') {
      throw new ForbiddenException('Cannot delete this message');
    }

    msg.deletedAt = new Date();
    msg.deletedBy = userId;
    await this.messageRepo.save(msg);
    return msg;
  }

  async pinMessage(channelId: string, messageId: string, userId: string, unpin?: boolean) {
    const msg = await this.messageRepo.findOne({
      where: { id: messageId, channelId },
    });
    if (!msg) throw new NotFoundException('Message not found');

    if (unpin) {
      msg.pinnedAt = null;
      msg.pinnedBy = null;
    } else {
      msg.pinnedAt = new Date();
      msg.pinnedBy = userId;
    }
    await this.messageRepo.save(msg);
    return msg;
  }

  async setReadCursor(channelId: string, userId: string, messageId: string) {
    await this.ensureMember(channelId, userId);
    const msg = await this.messageRepo.findOne({
      where: { id: messageId, channelId },
    });
    if (!msg) throw new NotFoundException('Message not found');

    let cursor = await this.readCursorRepo.findOne({
      where: { channelId, userId },
    });
    if (!cursor) {
      cursor = this.readCursorRepo.create({
        channelId,
        userId,
        messageId,
      });
    } else {
      cursor.messageId = messageId;
    }
    await this.readCursorRepo.save(cursor);
    return cursor;
  }

  async react(
    channelId: string,
    messageId: string,
    userId: string,
    emoji: string,
    remove?: boolean,
  ) {
    await this.ensureMember(channelId, userId);
    const msg = await this.messageRepo.findOne({
      where: { id: messageId, channelId },
    });
    if (!msg) throw new NotFoundException('Message not found');

    const existing = await this.reactionRepo.findOne({
      where: { messageId, userId, emoji },
    });

    if (remove) {
      if (existing) await this.reactionRepo.remove(existing);
      return { removed: true };
    }

    if (existing) return existing;
    const reaction = this.reactionRepo.create({
      messageId,
      userId,
      emoji,
    });
    await this.reactionRepo.save(reaction);
    return reaction;
  }

  formatMessage(m: Message) {
    const reactionsByEmoji: Record<string, string[]> = {};

    (m.reactions || []).forEach((r) => {
      if (!reactionsByEmoji[r.emoji]) {
        reactionsByEmoji[r.emoji] = [];
      }
      reactionsByEmoji[r.emoji].push(r.userId);
    });

    return {
      message_id: m.id,
      channel_id: m.channelId,
      sender_id: m.senderId,
      sender_type: m.senderType,
      content: m.content,
      content_type: m.contentType,
      reply_to: m.replyToId,
      reactions: reactionsByEmoji,
      mentions: Array.isArray(m.mentions) ? m.mentions : [],
      created_at: m.createdAt,
      edited_at: m.editedAt,
      deleted_at: m.deletedAt,
      deleted_by: m.deletedBy,
      pinned_at: m.pinnedAt,
      pinned_by: m.pinnedBy,
      client_request_id: m.clientRequestId,
    };
  }
}
