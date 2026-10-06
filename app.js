/* global supabase */
(() => {
  "use strict";

  const cfg = window.APP_CONFIG;
  if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    document.body.innerHTML =
      '<div style="padding:24px;font-family:sans-serif;max-width:600px;margin:40px auto;border:1px solid #f4212e;border-radius:8px;">' +
      "<h2>セットアップが必要です</h2>" +
      "<p><code>config.example.js</code> を <code>config.js</code> にコピーして、" +
      "Supabase の URL と anon key を入力してください。</p>" +
      "</div>";
    return;
  }

  const sb = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  // --- DOM ---
  const $ = (id) => document.getElementById(id);
  const authView = $("auth-view");
  const feedView = $("feed-view");
  const userArea = $("user-area");

  const tabLogin = $("tab-login");
  const tabSignup = $("tab-signup");
  const authForm = $("auth-form");
  const emailInput = $("email");
  const passwordInput = $("password");
  const authSubmit = $("auth-submit");
  const authMessage = $("auth-message");

  const postForm = $("post-form");
  const postText = $("post-text");
  const postSubmit = postForm.querySelector('button[type="submit"]');
  const postMessage = $("post-message");
  const charCount = $("char-count");
  const postsEl = $("posts");

  let mode = "login"; // "login" | "signup"
  let currentUser = null;

  // --- helpers ---
  const setMessage = (el, text, ok = false) => {
    el.textContent = text || "";
    el.classList.toggle("ok", !!ok);
  };

  const escapeHtml = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );

  const formatTime = (iso) => {
    const d = new Date(iso);
    const diffSec = Math.floor((Date.now() - d) / 1000);
    if (diffSec < 60) return `${Math.max(diffSec, 0)}秒前`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分前`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}時間前`;
    return d.toLocaleString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Only the part before "@" is stored, so full email addresses are never
  // visible to other users.
  const displayNameFor = (user) => (user.email || "").split("@")[0].slice(0, 50);

  // --- view switching ---
  const showAuth = () => {
    authView.classList.remove("hidden");
    feedView.classList.add("hidden");
    userArea.innerHTML = "";
  };

  const showFeed = () => {
    authView.classList.add("hidden");
    feedView.classList.remove("hidden");
    userArea.innerHTML = "";
    const label = document.createElement("span");
    label.textContent = `@${displayNameFor(currentUser)}`;
    const logoutBtn = document.createElement("button");
    logoutBtn.className = "btn ghost";
    logoutBtn.type = "button";
    logoutBtn.textContent = "ログアウト";
    logoutBtn.addEventListener("click", () => sb.auth.signOut());
    userArea.append(label, logoutBtn);
  };

  // --- auth tabs ---
  const setMode = (next) => {
    mode = next;
    tabLogin.classList.toggle("active", mode === "login");
    tabSignup.classList.toggle("active", mode === "signup");
    authSubmit.textContent = mode === "login" ? "ログイン" : "新規登録";
    passwordInput.autocomplete = mode === "login" ? "current-password" : "new-password";
    setMessage(authMessage, "");
  };

  tabLogin.addEventListener("click", () => setMode("login"));
  tabSignup.addEventListener("click", () => setMode("signup"));

  // --- auth submit ---
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) return;

    authSubmit.disabled = true;
    setMessage(authMessage, "");

    try {
      if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setMessage(
            authMessage,
            "確認メールを送信しました。メール内のリンクから認証を完了してください。",
            true,
          );
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setMessage(authMessage, err.message || String(err));
    } finally {
      authSubmit.disabled = false;
    }
  });

  // --- posts ---
  const renderPosts = (posts) => {
    if (!posts.length) {
      postsEl.innerHTML =
        '<p class="muted" style="padding:16px;">まだつぶやきがありません。最初の一言をどうぞ!</p>';
      return;
    }
    postsEl.innerHTML = posts
      .map(
        (p) => `
          <article class="post">
            <div class="post-header">
              <span class="post-author">@${escapeHtml(p.author_name || "unknown")}</span>
              <span class="post-time">${escapeHtml(formatTime(p.created_at))}</span>
            </div>
            <div class="post-body">${escapeHtml(p.content)}</div>
          </article>`,
      )
      .join("");
  };

  const loadPosts = async () => {
    const { data, error } = await sb
      .from("posts")
      .select("id, content, created_at, author_name")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      postsEl.innerHTML = `<p class="message" style="padding:16px;">${escapeHtml(error.message)}</p>`;
      return;
    }
    renderPosts(data || []);
  };

  postText.addEventListener("input", () => {
    charCount.textContent = `${postText.value.length} / 280`;
  });

  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const content = postText.value.trim();
    if (!content || !currentUser) return;

    postSubmit.disabled = true;
    setMessage(postMessage, "");

    const { error } = await sb.from("posts").insert({
      content,
      user_id: currentUser.id,
      author_name: displayNameFor(currentUser),
    });

    postSubmit.disabled = false;
    if (error) {
      setMessage(postMessage, error.message);
      return;
    }
    postText.value = "";
    charCount.textContent = "0 / 280";
    await loadPosts();
  });

  // --- realtime updates ---
  let channel = null;
  const subscribeRealtime = () => {
    if (channel) return;
    channel = sb
      .channel("posts-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () =>
        loadPosts(),
      )
      .subscribe();
  };

  const unsubscribeRealtime = () => {
    if (!channel) return;
    sb.removeChannel(channel);
    channel = null;
  };

  // --- session bootstrap ---
  sb.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    if (currentUser) {
      showFeed();
      // Defer Supabase calls out of the auth callback to avoid deadlocks.
      setTimeout(() => {
        loadPosts();
        subscribeRealtime();
      }, 0);
    } else {
      unsubscribeRealtime();
      showAuth();
    }
  });
})();
