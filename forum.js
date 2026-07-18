(function () {
  'use strict';

  const STORAGE_KEY = 'masofishPrototypeForumV1';
  const FORUM_BUCKET = 'forum-images';
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  const categoryLabels = {
    catch: 'Catch Story',
    question: 'Question',
    tip: 'Fishing Tip',
    safety: 'Safety',
    market: 'Market',
    general: 'General'
  };

  const state = {
    mode: 'loading',
    client: null,
    user: null,
    userName: 'MASOFISH User',
    posts: [],
    comments: [],
    likes: [],
    selectedCategory: 'all',
    searchTerm: '',
    sort: 'newest',
    activePostId: null,
    schemaReady: true
  };

  const byId = id => document.getElementById(id);
  const postModal = byId('postComposerModal');
  const discussionModal = byId('discussionModal');

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[character]);
  }

  function normalizeWhitespace(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function currentUserId() {
    return state.mode === 'prototype' ? 'prototype-user' : state.user?.id;
  }

  function currentUserName() {
    return state.userName || 'MASOFISH User';
  }

  function formatRelativeTime(dateValue) {
    const date = new Date(dateValue);
    const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

    if (diffSeconds < 60) return 'Just now';
    const minutes = Math.floor(diffSeconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function categoryClass(category) {
    const classes = {
      catch: 'bg-secondary-container/50 text-on-secondary-container',
      question: 'bg-blue-100 text-blue-900',
      tip: 'bg-emerald-100 text-emerald-900',
      safety: 'bg-amber-100 text-amber-950',
      market: 'bg-violet-100 text-violet-900',
      general: 'bg-slate-100 text-slate-800'
    };
    return classes[category] || classes.general;
  }

  function authorInitial(name) {
    return normalizeWhitespace(name).charAt(0).toUpperCase() || 'U';
  }

  function openModal(modal) {
    modal.hidden = false;
    document.body.classList.add('forum-scroll-lock');
  }

  function closeModal(modal) {
    modal.hidden = true;
    if (postModal.hidden && discussionModal.hidden) {
      document.body.classList.remove('forum-scroll-lock');
    }
  }

  function showFormMessage(text, type = 'info') {
    const box = byId('postFormMessage');
    box.hidden = false;
    box.className = 'rounded-xl border p-3 text-sm';
    if (type === 'error') {
      box.classList.add('bg-red-50', 'border-red-200', 'text-red-900');
    } else if (type === 'success') {
      box.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-900');
    } else {
      box.classList.add('bg-slate-50', 'border-slate-200', 'text-slate-700');
    }
    box.textContent = text;
  }

  function clearFormMessage() {
    byId('postFormMessage').hidden = true;
    byId('postFormMessage').textContent = '';
  }

  function seedPrototypeData() {
    const now = Date.now();
    return {
      posts: [
        {
          id: 'demo-post-1',
          user_id: 'demo-user-1',
          author_name: 'Mang Nilo',
          title: 'Morning rabbitfish catch near the northern coast',
          content: 'The water was calm before sunrise and the rabbitfish were active near the reef edge. Has anyone noticed the same pattern this week?',
          category: 'catch',
          catch_name: 'Rabbitfish / Danggit',
          catch_location: 'Northern Cebu coast',
          catch_date: new Date(now - 86400000).toISOString().slice(0, 10),
          image_url: null,
          image_path: null,
          created_at: new Date(now - 2 * 3600000).toISOString(),
          updated_at: new Date(now - 2 * 3600000).toISOString()
        },
        {
          id: 'demo-post-2',
          user_id: 'demo-user-2',
          author_name: 'Lina S.',
          title: 'How do you prepare for sudden wind changes?',
          content: 'I have noticed that the wind becomes stronger around noon. What signs do you watch before deciding to return to shore?',
          category: 'question',
          catch_name: null,
          catch_location: 'Cebu',
          catch_date: null,
          image_url: null,
          image_path: null,
          created_at: new Date(now - 8 * 3600000).toISOString(),
          updated_at: new Date(now - 8 * 3600000).toISOString()
        },
        {
          id: 'demo-post-3',
          user_id: 'demo-user-3',
          author_name: 'Tatang Ben',
          title: 'Tip: Keep a separate dry pouch for phones and documents',
          content: 'A small waterproof pouch can protect your phone, identification cards, and emergency contact information. I also keep a whistle inside.',
          category: 'tip',
          catch_name: null,
          catch_location: null,
          catch_date: null,
          image_url: null,
          image_path: null,
          created_at: new Date(now - 28 * 3600000).toISOString(),
          updated_at: new Date(now - 28 * 3600000).toISOString()
        }
      ],
      comments: [
        {
          id: 'demo-comment-1',
          post_id: 'demo-post-1',
          user_id: 'demo-user-4',
          author_name: 'Jun P.',
          content: 'We had a similar catch yesterday just before the tide started falling.',
          created_at: new Date(now - 90 * 60000).toISOString()
        },
        {
          id: 'demo-comment-2',
          post_id: 'demo-post-2',
          user_id: 'demo-user-1',
          author_name: 'Mang Nilo',
          content: 'I watch the clouds, wave direction, and the weather alert before leaving.',
          created_at: new Date(now - 4 * 3600000).toISOString()
        }
      ],
      likes: [
        { post_id: 'demo-post-1', user_id: 'demo-user-2' },
        { post_id: 'demo-post-1', user_id: 'demo-user-3' },
        { post_id: 'demo-post-2', user_id: 'demo-user-1' },
        { post_id: 'demo-post-3', user_id: 'demo-user-2' }
      ]
    };
  }

  function readPrototypeStore() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (stored && Array.isArray(stored.posts) && Array.isArray(stored.comments) && Array.isArray(stored.likes)) {
        return stored;
      }
    } catch (error) {
      console.warn('Unable to read prototype forum data:', error);
    }

    const seeded = seedPrototypeData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  function writePrototypeStore() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      posts: state.posts,
      comments: state.comments,
      likes: state.likes
    }));
  }

  function postMetrics(postId) {
    const comments = state.comments.filter(comment => comment.post_id === postId);
    const likes = state.likes.filter(like => like.post_id === postId);
    return {
      commentCount: comments.length,
      likeCount: likes.length,
      likedByMe: likes.some(like => like.user_id === currentUserId())
    };
  }

  function postImageUrl(post) {
    if (post.image_url) return post.image_url;
    if (post.image_path && state.client) {
      return state.client.storage.from(FORUM_BUCKET).getPublicUrl(post.image_path).data.publicUrl;
    }
    return null;
  }

  function renderCatchDetails(post) {
    const details = [];
    if (post.catch_name) {
      details.push(`<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">set_meal</span>${escapeHtml(post.catch_name)}</span>`);
    }
    if (post.catch_location) {
      details.push(`<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">location_on</span>${escapeHtml(post.catch_location)}</span>`);
    }
    if (post.catch_date) {
      details.push(`<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[18px]">calendar_month</span>${escapeHtml(new Date(`${post.catch_date}T00:00:00`).toLocaleDateString())}</span>`);
    }
    if (!details.length) return '';
    return `<div class="flex flex-wrap gap-x-4 gap-y-2 text-sm text-on-surface-variant mt-3">${details.join('')}</div>`;
  }

  function renderPostCard(post, options = {}) {
    const metrics = postMetrics(post.id);
    const imageUrl = postImageUrl(post);
    const isOwner = post.user_id === currentUserId();
    const expanded = options.expanded === true;

    return `
      <article class="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm" data-post-id="${escapeHtml(post.id)}">
        <div class="p-4 sm:p-5">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center font-black shrink-0">
                ${escapeHtml(authorInitial(post.author_name))}
              </div>
              <div class="min-w-0">
                <p class="font-extrabold text-primary truncate">${escapeHtml(post.author_name || 'MASOFISH User')}</p>
                <p class="text-xs text-on-surface-variant">${escapeHtml(formatRelativeTime(post.created_at))}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="${categoryClass(post.category)} rounded-full px-3 py-1 text-xs font-extrabold">${escapeHtml(categoryLabels[post.category] || 'General')}</span>
              ${isOwner ? `
                <button type="button" class="delete-post-button w-9 h-9 rounded-full hover:bg-error-container text-error flex items-center justify-center" data-post-id="${escapeHtml(post.id)}" aria-label="Delete post">
                  <span class="material-symbols-outlined text-[20px]">delete</span>
                </button>` : ''}
            </div>
          </div>

          <h3 class="text-xl font-black text-primary mt-4">${escapeHtml(post.title)}</h3>
          <p class="text-sm leading-relaxed text-on-surface-variant mt-2 whitespace-pre-wrap ${expanded ? '' : 'forum-line-clamp'}">${escapeHtml(post.content)}</p>
          ${renderCatchDetails(post)}
        </div>

        ${imageUrl ? `<img class="forum-post-image w-full border-y border-outline-variant" src="${escapeHtml(imageUrl)}" alt="Catch photo shared by ${escapeHtml(post.author_name || 'a community member')}" loading="lazy"/>` : ''}

        <div class="grid grid-cols-2 border-t border-outline-variant">
          <button type="button" class="like-post-button flex items-center justify-center gap-2 p-3 font-bold ${metrics.likedByMe ? 'text-secondary bg-secondary-container/20' : 'text-on-surface-variant'}" data-post-id="${escapeHtml(post.id)}">
            <span class="material-symbols-outlined" style="${metrics.likedByMe ? "font-variation-settings:'FILL' 1;" : ''}">favorite</span>
            <span>${metrics.likeCount} ${metrics.likeCount === 1 ? 'Appreciation' : 'Appreciations'}</span>
          </button>
          <button type="button" class="open-discussion-button flex items-center justify-center gap-2 p-3 font-bold text-on-surface-variant border-l border-outline-variant" data-post-id="${escapeHtml(post.id)}">
            <span class="material-symbols-outlined">forum</span>
            <span>${metrics.commentCount} ${metrics.commentCount === 1 ? 'Comment' : 'Comments'}</span>
          </button>
        </div>
      </article>`;
  }

  function filteredPosts() {
    let posts = [...state.posts];

    if (state.selectedCategory !== 'all') {
      posts = posts.filter(post => post.category === state.selectedCategory);
    }

    if (state.searchTerm) {
      const term = state.searchTerm.toLowerCase();
      posts = posts.filter(post =>
        [post.title, post.content, post.author_name, post.catch_name, post.catch_location]
          .some(value => String(value || '').toLowerCase().includes(term))
      );
    }

    if (state.sort === 'popular') {
      posts.sort((a, b) => postMetrics(b.id).likeCount - postMetrics(a.id).likeCount);
    } else if (state.sort === 'discussed') {
      posts.sort((a, b) => postMetrics(b.id).commentCount - postMetrics(a.id).commentCount);
    } else {
      posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return posts;
  }

  function updateStatistics() {
    byId('postCount').textContent = state.posts.length;
    byId('commentCount').textContent = state.comments.length;
    byId('likeCount').textContent = state.likes.length;
    byId('yourPostCount').textContent =
      state.posts.filter(post => post.user_id === currentUserId()).length;
  }

  function bindPostActions(container) {
    container.querySelectorAll('.open-discussion-button').forEach(button => {
      button.addEventListener('click', () => openDiscussion(button.dataset.postId));
    });

    container.querySelectorAll('.like-post-button').forEach(button => {
      button.addEventListener('click', () => toggleLike(button.dataset.postId));
    });

    container.querySelectorAll('.delete-post-button').forEach(button => {
      button.addEventListener('click', () => deletePost(button.dataset.postId));
    });
  }

  function renderFeed() {
    byId('forumLoading').hidden = true;
    const posts = filteredPosts();
    const feed = byId('forumFeed');

    byId('feedStatus').textContent =
      `${posts.length} ${posts.length === 1 ? 'discussion' : 'discussions'} shown`;

    if (!posts.length) {
      feed.innerHTML = '';
      byId('forumEmpty').hidden = false;
    } else {
      byId('forumEmpty').hidden = true;
      feed.innerHTML = posts.map(post => renderPostCard(post)).join('');
      bindPostActions(feed);
    }

    updateStatistics();
  }

  function renderComments(postId) {
    const comments = state.comments
      .filter(comment => comment.post_id === postId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    byId('discussionCommentCount').textContent =
      `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}`;

    byId('discussionComments').innerHTML = comments.length
      ? comments.map(comment => `
          <article class="rounded-xl border border-outline-variant bg-white p-3">
            <div class="flex gap-3">
              <div class="w-9 h-9 rounded-full bg-surface-container-high text-primary flex items-center justify-center font-black shrink-0">
                ${escapeHtml(authorInitial(comment.author_name))}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-3">
                  <p class="font-extrabold text-primary truncate">${escapeHtml(comment.author_name || 'MASOFISH User')}</p>
                  <p class="text-xs text-on-surface-variant shrink-0">${escapeHtml(formatRelativeTime(comment.created_at))}</p>
                </div>
                <p class="text-sm text-on-surface-variant mt-1 whitespace-pre-wrap">${escapeHtml(comment.content)}</p>
              </div>
            </div>
          </article>`).join('')
      : `<div class="rounded-xl bg-surface-container-low p-5 text-center text-sm text-on-surface-variant">
           No comments yet. Be the first to join the discussion.
         </div>`;
  }

  function openDiscussion(postId) {
    const post = state.posts.find(item => item.id === postId);
    if (!post) return;

    state.activePostId = postId;
    byId('discussionModalTitle').textContent = post.title;
    byId('discussionPost').innerHTML = renderPostCard(post, { expanded: true });
    bindPostActions(byId('discussionPost'));
    renderComments(postId);
    byId('commentContent').value = '';
    openModal(discussionModal);
  }

  function refreshOpenDiscussion() {
    if (state.activePostId && !discussionModal.hidden) {
      openDiscussion(state.activePostId);
    }
  }

  function isMissingForumTable(error) {
    const text = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
    return text.includes('forum_posts') || text.includes('does not exist') || text.includes('relation');
  }

  async function loadRealForumData() {
    const [postsResult, commentsResult, likesResult] = await Promise.all([
      state.client.from('forum_posts').select('*').order('created_at', { ascending: false }).limit(100),
      state.client.from('forum_comments').select('*').order('created_at', { ascending: true }).limit(1000),
      state.client.from('forum_likes').select('post_id,user_id').limit(5000)
    ]);

    const firstError = postsResult.error || commentsResult.error || likesResult.error;
    if (firstError) throw firstError;

    state.posts = postsResult.data || [];
    state.comments = commentsResult.data || [];
    state.likes = likesResult.data || [];
    state.schemaReady = true;
  }

  async function loadForumData() {
    byId('forumLoading').hidden = false;
    byId('forumEmpty').hidden = true;
    byId('forumFeed').innerHTML = '';

    try {
      if (state.mode === 'prototype') {
        const store = readPrototypeStore();
        state.posts = store.posts;
        state.comments = store.comments;
        state.likes = store.likes;
        state.schemaReady = false;
        byId('forumSetupNotice').hidden = false;
      } else {
        await loadRealForumData();
        byId('forumSetupNotice').hidden = true;
      }
    } catch (error) {
      console.error('Forum loading failed:', error);
      if (isMissingForumTable(error)) {
        state.schemaReady = false;
        byId('forumSetupNotice').hidden = false;
        state.posts = [];
        state.comments = [];
        state.likes = [];
      } else {
        byId('feedStatus').textContent = error.message || 'The forum could not be loaded.';
      }
    } finally {
      renderFeed();
      refreshOpenDiscussion();
    }
  }

  async function resizeImageForPrototype(file) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const image = new Image();
    image.src = dataUrl;
    await image.decode();

    const maxDimension = 1200;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.78);
  }

  async function uploadForumImage(file) {
    if (!file) return { image_path: null, image_url: null };
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error('The selected image is larger than 5 MB.');
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new Error('Only JPEG, PNG, and WebP images are supported.');
    }

    if (state.mode === 'prototype') {
      return {
        image_path: null,
        image_url: await resizeImageForPrototype(file)
      };
    }

    const extension = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const safeExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? extension : 'jpg';
    const objectPath = `${state.user.id}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

    const { error } = await state.client.storage
      .from(FORUM_BUCKET)
      .upload(objectPath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false
      });

    if (error) throw error;

    const { data } = state.client.storage.from(FORUM_BUCKET).getPublicUrl(objectPath);
    return {
      image_path: objectPath,
      image_url: data.publicUrl
    };
  }

  async function createPost(event) {
    event.preventDefault();
    clearFormMessage();

    const title = normalizeWhitespace(byId('postTitle').value);
    const content = byId('postContent').value.trim();
    const category = byId('postCategory').value;
    const catchName = normalizeWhitespace(byId('postCatchName').value) || null;
    const catchLocation = normalizeWhitespace(byId('postCatchLocation').value) || null;
    const catchDate = byId('postCatchDate').value || null;
    const imageFile = byId('postImage').files?.[0] || null;
    const submit = byId('submitPostButton');

    if (title.length < 3 || title.length > 120) {
      showFormMessage('The title must contain 3 to 120 characters.', 'error');
      return;
    }
    if (!content || content.length > 5000) {
      showFormMessage('The post details are required and must not exceed 5,000 characters.', 'error');
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Publishing…';

    try {
      const image = await uploadForumImage(imageFile);
      const post = {
        user_id: currentUserId(),
        author_name: currentUserName(),
        title,
        content,
        category,
        catch_name: catchName,
        catch_location: catchLocation,
        catch_date: catchDate,
        image_path: image.image_path,
        image_url: image.image_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (state.mode === 'prototype') {
        post.id = `prototype-post-${crypto.randomUUID()}`;
        state.posts.unshift(post);
        writePrototypeStore();
      } else {
        const { error } = await state.client.from('forum_posts').insert({
          user_id: post.user_id,
          author_name: post.author_name,
          title: post.title,
          content: post.content,
          category: post.category,
          catch_name: post.catch_name,
          catch_location: post.catch_location,
          catch_date: post.catch_date,
          image_path: post.image_path,
          image_url: post.image_url
        });
        if (error) throw error;
      }

      byId('forumPostForm').reset();
      closeModal(postModal);
      await loadForumData();
    } catch (error) {
      console.error('Post creation failed:', error);
      showFormMessage(error.message || 'The post could not be published.', 'error');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Publish Post';
    }
  }

  async function toggleLike(postId) {
    const existing = state.likes.find(like =>
      like.post_id === postId && like.user_id === currentUserId()
    );

    try {
      if (state.mode === 'prototype') {
        state.likes = existing
          ? state.likes.filter(like => !(like.post_id === postId && like.user_id === currentUserId()))
          : [...state.likes, { post_id: postId, user_id: currentUserId() }];
        writePrototypeStore();
      } else if (existing) {
        const { error } = await state.client
          .from('forum_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', state.user.id);
        if (error) throw error;
      } else {
        const { error } = await state.client
          .from('forum_likes')
          .insert({ post_id: postId, user_id: state.user.id });
        if (error) throw error;
      }

      await loadForumData();
    } catch (error) {
      console.error('Like action failed:', error);
      alert(error.message || 'The appreciation could not be updated.');
    }
  }

  async function deletePost(postId) {
    const post = state.posts.find(item => item.id === postId);
    if (!post || post.user_id !== currentUserId()) return;

    const confirmed = confirm('Delete this discussion and all of its comments?');
    if (!confirmed) return;

    try {
      if (state.mode === 'prototype') {
        state.posts = state.posts.filter(item => item.id !== postId);
        state.comments = state.comments.filter(comment => comment.post_id !== postId);
        state.likes = state.likes.filter(like => like.post_id !== postId);
        writePrototypeStore();
      } else {
        const { error } = await state.client.from('forum_posts').delete().eq('id', postId);
        if (error) throw error;

        if (post.image_path) {
          const { error: storageError } = await state.client.storage
            .from(FORUM_BUCKET)
            .remove([post.image_path]);
          if (storageError) console.warn('The post was deleted, but the image could not be removed:', storageError);
        }
      }

      if (state.activePostId === postId) {
        state.activePostId = null;
        closeModal(discussionModal);
      }

      await loadForumData();
    } catch (error) {
      console.error('Delete failed:', error);
      alert(error.message || 'The post could not be deleted.');
    }
  }

  async function addComment(event) {
    event.preventDefault();
    const content = byId('commentContent').value.trim();
    const submit = byId('submitCommentButton');

    if (!state.activePostId || !content || content.length > 2000) return;

    submit.disabled = true;
    submit.textContent = 'Posting…';

    try {
      if (state.mode === 'prototype') {
        state.comments.push({
          id: `prototype-comment-${crypto.randomUUID()}`,
          post_id: state.activePostId,
          user_id: currentUserId(),
          author_name: currentUserName(),
          content,
          created_at: new Date().toISOString()
        });
        writePrototypeStore();
      } else {
        const { error } = await state.client.from('forum_comments').insert({
          post_id: state.activePostId,
          user_id: state.user.id,
          author_name: currentUserName(),
          content
        });
        if (error) throw error;
      }

      byId('commentContent').value = '';
      await loadForumData();
    } catch (error) {
      console.error('Comment failed:', error);
      alert(error.message || 'The comment could not be posted.');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Post Comment';
    }
  }

  async function initialize() {
    const ready = await window.masofishAuthReady;
    if (!ready) return;

    if (ready.mode === 'supabase') {
      state.mode = 'supabase';
      state.client = window.MASOFISH_AUTH.client;
      state.user = ready.session.user;
      state.userName =
        state.user.user_metadata?.full_name ||
        state.user.user_metadata?.name ||
        state.user.email?.split('@')[0] ||
        'MASOFISH User';
    } else {
      state.mode = 'prototype';
      state.user = {
        id: 'prototype-user',
        email: 'prototype@masofish.local',
        user_metadata: { full_name: 'Prototype User' }
      };
      state.userName = 'Prototype User';
    }

    await loadForumData();
  }

  // Modal and form events
  [byId('openPostComposerButton'), byId('heroPostButton'), byId('emptyPostButton')].forEach(button => {
    button.addEventListener('click', () => {
      clearFormMessage();
      openModal(postModal);
      setTimeout(() => byId('postTitle').focus(), 50);
    });
  });

  [byId('closePostComposerButton'), byId('cancelPostButton')].forEach(button => {
    button.addEventListener('click', () => closeModal(postModal));
  });

  byId('closeDiscussionButton').addEventListener('click', () => {
    state.activePostId = null;
    closeModal(discussionModal);
  });

  [postModal, discussionModal].forEach(modal => {
    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal(modal);
    });
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (!postModal.hidden) closeModal(postModal);
      if (!discussionModal.hidden) {
        state.activePostId = null;
        closeModal(discussionModal);
      }
    }
  });

  byId('forumPostForm').addEventListener('submit', createPost);
  byId('commentForm').addEventListener('submit', addComment);
  byId('refreshForumButton').addEventListener('click', loadForumData);

  byId('forumSearchInput').addEventListener('input', event => {
    state.searchTerm = event.target.value.trim();
    renderFeed();
  });

  byId('forumSortSelect').addEventListener('change', event => {
    state.sort = event.target.value;
    renderFeed();
  });

  byId('forumCategoryFilters').querySelectorAll('[data-category]').forEach(button => {
    button.addEventListener('click', () => {
      state.selectedCategory = button.dataset.category;
      byId('forumCategoryFilters').querySelectorAll('[data-category]').forEach(item => {
        item.setAttribute('aria-pressed', String(item === button));
      });
      renderFeed();
    });
  });

  initialize().catch(error => {
    console.error('Forum initialization failed:', error);
    byId('forumLoading').hidden = true;
    byId('feedStatus').textContent = error.message || 'The forum could not be initialized.';
  });
})();