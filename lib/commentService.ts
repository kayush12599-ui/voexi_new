import { supabase } from './supabase';
import { getLocalMediaServerUrl } from './bunnyStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isUuid = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export interface CommentItem {
  id: string;
  post_id?: string;
  user_id?: string;
  user?: string;
  content: string;
  text: string;
  type?: 'text' | 'voice' | 'image' | 'video';
  media_url?: string | null;
  parent_id?: string | null;
  created_at: string;
  is_pinned?: boolean;
  likes_count?: number;
  profiles?: {
    username?: string;
    channel_name?: string;
    avatar_url?: string;
  };
}

export interface CommentFetchResult {
  allComments: CommentItem[];
  topLevelComments: CommentItem[];
  repliesMap: { [parentId: string]: CommentItem[] };
  totalCount: number;
}

export const CommentService = {
  /**
   * Helper to check if a comment is a nested reply.
   * A comment is strictly a reply if and only if it possesses a valid parent_id.
   */
  isReplyComment(c: any): boolean {
    if (!c) return false;
    return !!(c.parent_id || c.parentId);
  },

  /**
   * Process and reconstruct strict parent-child threads with 100% stable parent ID matching.
   * ABSOLUTE RULE: Never match or shift replies based on username regex fallbacks.
   */
  processCommentThreads(allComments: CommentItem[]) {
    if (!Array.isArray(allComments) || allComments.length === 0) {
      return { topLevelComments: [], repliesMap: {} };
    }

    const topLevelComments = allComments.filter(c => !this.isReplyComment(c));
    const rawReplyComments = allComments.filter(c => this.isReplyComment(c));
    const repliesMap: { [parentId: string]: CommentItem[] } = {};

    const topLevelIdSet = new Set(topLevelComments.map(p => p.id));

    rawReplyComments.forEach(c => {
      const pId = c.parent_id || c.parentId;

      // STRICT RULE: Attach ONLY if parent_id exists in topLevelComments.
      // Never fall back to fuzzy regex matching by username!
      if (pId && topLevelIdSet.has(pId)) {
        if (!repliesMap[pId]) repliesMap[pId] = [];
        repliesMap[pId].push(c);
      }
    });

    return {
      topLevelComments: topLevelComments.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)),
      repliesMap
    };
  },

  /**
   * Fetch, merge, de-duplicate & thread comments for any post
   */
  async fetchCommentsForPost(postItem: any): Promise<CommentFetchResult> {
    if (!postItem) {
      return { allComments: [], topLevelComments: [], repliesMap: {}, totalCount: 0 };
    }

    const targetPostId = typeof postItem === 'object' ? String(postItem.id || postItem.filename || '') : String(postItem);

    try {
      const localServerUrl = getLocalMediaServerUrl();

      // Parallel fetch from Local Media Server AND Supabase DB using exact targetPostId
      const [mediaServerRes, supabaseRes] = await Promise.allSettled([
        fetch(`${localServerUrl}/api/comments?file=${encodeURIComponent(targetPostId)}`).then(r => r.json()).catch(() => null),
        isUuid(targetPostId) ? supabase.from('comments').select('*, profiles(username, avatar_url, custom_logo_url, channel_name)').eq('post_id', targetPostId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] })
      ]);

      let mergedComments: any[] = [];

      // 1. Local Media Server Comments
      if (mediaServerRes.status === 'fulfilled' && mediaServerRes.value?.success && Array.isArray(mediaServerRes.value.comments)) {
        const serverCmts = mediaServerRes.value.comments.map((c: any) => {
          const fallbackSeed = c.created_at ? String(c.created_at) : `${targetPostId}_${c.user || 'anon'}_${String(c.text || c.content || '').substring(0, 20)}`;
          const stableId = c.id || `cmt_srv_${fallbackSeed.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

          const rawAv = c.avatar || c.avatar_url || c.custom_logo_url || c.logo_url;
          const uName = (c.user || c.username || 'viewer').replace('@', '');
          const cName = c.channel_name || uName || 'VOEXI Viewer';
          const avUrl = rawAv && rawAv.startsWith('http') ? rawAv : `https://ui-avatars.com/api/?name=${encodeURIComponent(cName)}&background=A855F7&color=fff&bold=true`;

          return {
            id: stableId,
            post_id: targetPostId,
            content: c.text || c.content || '',
            text: c.text || c.content || '',
            type: c.type || 'text',
            media_url: c.media_url || null,
            parent_id: c.parent_id || c.parentId || null,
            created_at: c.created_at || new Date().toISOString(),
            profiles: {
              username: uName,
              channel_name: cName,
              avatar_url: avUrl
            }
          };
        });
        mergedComments = [...mergedComments, ...serverCmts];
      }

      // 2. Supabase DB Comments
      if (supabaseRes.status === 'fulfilled' && (supabaseRes.value as any)?.data) {
        const dbCmts = (supabaseRes.value as any).data || [];
        if (Array.isArray(dbCmts) && dbCmts.length > 0) {
          mergedComments = [...mergedComments, ...dbCmts];
        }
      }

      // Fetch Server 2 Profiles Map for commenter profiles
      let server2ProfilesMap: Record<string, any> = {};
      try {
        const s2PRes = await fetch(`${localServerUrl}/profiles.json`).then(r => r.json()).catch(() => null);
        if (s2PRes && typeof s2PRes === 'object') {
          server2ProfilesMap = s2PRes;
        }
      } catch (e) {}

      const findS2Profile = (uid?: string, uploader?: string) => {
        if (!server2ProfilesMap) return null;
        if (uid && server2ProfilesMap[uid]) return server2ProfilesMap[uid];
        if (uploader) {
          const cleanUp = uploader.replace('@', '').toLowerCase().trim();
          if (server2ProfilesMap[cleanUp]) return server2ProfilesMap[cleanUp];
          const match = Object.values(server2ProfilesMap).find((p: any) =>
            (p.username && p.username.toLowerCase().trim() === cleanUp) ||
            (p.channel_name && p.channel_name.toLowerCase().trim() === cleanUp)
          );
          if (match) return match;
        }
        return null;
      };

      // Sanitize and format all commenter profiles cleanly
      const seen = new Set<string>();
      const finalComments: CommentItem[] = [];
      for (const c of mergedComments) {
        if (!c) continue;
        const key = c.id;
        if (key && !seen.has(key)) {
          seen.add(key);

          const cProf = Array.isArray(c.profiles) ? c.profiles[0] : (c.profiles || {});
          const s2Prof = findS2Profile(c.user_id, c.user || c.username);

          const realHandle = (cProf.username || s2Prof?.username || c.username || c.user || 'viewer').replace('@', '');
          const realName = cProf.channel_name || s2Prof?.channel_name || c.channel_name || realHandle;
          const realLogo = cProf.custom_logo_url || cProf.logo_url || cProf.avatar_url || s2Prof?.custom_logo_url || s2Prof?.logo_url || s2Prof?.avatar_url || c.avatar_url || c.avatar;
          const finalLogo = realLogo && typeof realLogo === 'string' && realLogo.startsWith('http')
            ? realLogo
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(realName)}&background=A855F7&color=fff&bold=true`;

          finalComments.push({
            ...c,
            user: `@${realHandle}`,
            profiles: {
              username: realHandle,
              channel_name: realName,
              avatar_url: finalLogo
            }
          });
        }
      }

      const { topLevelComments, repliesMap } = this.processCommentThreads(finalComments);

      return {
        allComments: finalComments,
        topLevelComments,
        repliesMap,
        totalCount: finalComments.length
      };

    } catch (e) {
      console.error("[COMMENT SERVICE ERROR]:", e);
      return { allComments: [], topLevelComments: [], repliesMap: {}, totalCount: 0 };
    }
  },

  /**
   * Post a new comment or nested reply for any post
   */
  async postComment(
    postItem: any,
    commentText: string,
    currentUser: { id?: string; handle?: string; avatar?: string },
    replyTo?: { id?: string; user?: string } | null,
    attachment?: { uri: string; type: 'voice' | 'image' | 'video' } | null
  ): Promise<CommentItem | null> {
    if (!postItem) return null;

    const text = commentText.trim() || (attachment?.type === 'voice' ? '🎙 Voice Signal' : (attachment?.type === 'video' ? '🎬 Video Signal' : '🖼 Visual Signal'));
    const targetFileKey = String(postItem.id || postItem.filename || '');
    const postId = String(postItem.id || postItem.filename || '');
    const activeUserId = currentUser?.id || 'guest_user';
    const userHandle = currentUser?.handle || '@app_user';
    const userAvatar = currentUser?.avatar || 'https://via.placeholder.com/50';

    const rootParentId = replyTo ? (replyTo.id || null) : null;
    const replyUserHandle = replyTo ? replyTo.user : null;

    const formattedText = replyUserHandle ? `↳ Replying to ${replyUserHandle}: ${text}` : text;

    const newCommentObj: CommentItem = {
      id: `cmt_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      post_id: postId,
      user_id: activeUserId,
      user: userHandle,
      content: formattedText,
      text: formattedText,
      type: attachment?.type || 'text',
      media_url: attachment?.uri || null,
      parent_id: rootParentId,
      created_at: new Date().toISOString(),
      profiles: {
        username: userHandle,
        channel_name: userHandle,
        avatar_url: userAvatar
      }
    };

    // 1. Sync to Local Media Server
    try {
      const localServerUrl = getLocalMediaServerUrl();
      fetch(`${localServerUrl}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: targetFileKey,
          id: newCommentObj.id,
          user: userHandle,
          avatar: userAvatar,
          text: formattedText,
          type: attachment?.type || 'text',
          media_url: attachment?.uri || null,
          parent_id: rootParentId
        })
      }).catch(() => {});
    } catch (e) {}

    // 2. Sync to Supabase DB if valid UUID
    if (isUuid(postId) && isUuid(activeUserId)) {
      try {
        const { data } = await supabase.from('comments').insert({
          post_id: postId,
          user_id: activeUserId,
          content: formattedText,
          parent_id: isUuid(rootParentId) ? rootParentId : null
        }).select('id').maybeSingle();

        if (data?.id) {
          newCommentObj.id = data.id;
        }
      } catch (e) {}
    }

    return newCommentObj;
  },

  /**
   * Delete a comment or reply from both Media Server & Supabase DB
   */
  async deleteComment(postItem: any, commentId: string): Promise<boolean> {
    if (!postItem || !commentId) return false;

    const targetFileKey = postItem.filename || postItem.title || postItem.id;
    const postId = postItem.id;

    // 1. Delete from Local Media Server
    try {
      const localServerUrl = getLocalMediaServerUrl();
      fetch(`${localServerUrl}/api/comments?file=${encodeURIComponent(targetFileKey)}&cmtId=${encodeURIComponent(commentId)}`, {
        method: 'DELETE'
      }).catch(() => {});
    } catch (e) {}

    // 2. Delete from Supabase DB (Cascade Delete Comment & Replies if target is parent comment)
    if (isUuid(postId) && isUuid(commentId)) {
      try {
        await supabase.from('comments').delete().or(`id.eq.${commentId},parent_id.eq.${commentId}`);
      } catch (e) {}
    }

    return true;
  }
};
