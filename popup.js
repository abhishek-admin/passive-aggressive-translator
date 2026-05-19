// ============================================
// POPUP.JS TEMPLATE
// Features: markdown rendering, progressive loading,
// session cache, settings panel, re-analyze
// Only modify: ACTION LOGIC between ▼▼▼ and ▲▲▲
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const actionBtn = document.getElementById('action-btn');
  const retryBtn = document.getElementById('retry-btn');
  const copyBtn = document.getElementById('copy-btn');
  const rerunBtn = document.getElementById('rerun-btn');
  const mainContent = document.getElementById('main-content');
  const loading = document.getElementById('loading');
  const result = document.getElementById('result');
  const resultContent = document.getElementById('result-content');
  const error = document.getElementById('error');
  const errorMessage = document.getElementById('error-message');

  const settingsBtn = document.getElementById('settings-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const settingsClose = document.getElementById('settings-close');
  const geminiKeyInput = document.getElementById('gemini-key-input');
  const openrouterKeyInput = document.getElementById('openrouter-key-input');
  const saveKeysBtn = document.getElementById('save-keys-btn');
  const clearKeysBtn = document.getElementById('clear-keys-btn');
  const toggleGeminiKey = document.getElementById('toggle-gemini-key');
  const toggleOpenrouterKey = document.getElementById('toggle-openrouter-key');

  const onboarding = document.getElementById('onboarding');
  const onboardGeminiInput = document.getElementById('onboard-gemini-input');
  const onboardOpenrouterInput = document.getElementById('onboard-openrouter-input');
  const onboardSaveBtn = document.getElementById('onboard-save-btn');

  // ---- Markdown → HTML ----

  function renderMarkdown(text) {
    let html = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^---$/gm, '<hr>');

    html = html.replace(/((?:^\|.+\|$\n?)+)/gm, (tableBlock) => {
      const rows = tableBlock.trim().split('\n').filter(r => r.trim());
      if (rows.length < 2 || !/^\|[\s\-:]+\|/.test(rows[1])) return tableBlock;
      const parseRow = (row) => row.split('|').slice(1, -1).map(c => c.trim());
      const headers = parseRow(rows[0]);
      let table = '<table><thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>';
      rows.slice(2).forEach(row => {
        const cells = parseRow(row);
        table += '<tr>' + cells.map(c => `<td>${c.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</td>`).join('') + '</tr>';
      });
      return table + '</tbody></table>';
    });

    html = html.replace(/((?:^- .+$\n?)+)/gm, (block) => {
      return '<ul>' + block.trim().split('\n').map(l => `<li>${l.replace(/^- /, '').trim()}</li>`).join('') + '</ul>';
    });

    html = html.replace(/((?:^\d+\. .+$\n?)+)/gm, (block) => {
      return '<ol>' + block.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '').trim()}</li>`).join('') + '</ol>';
    });

    html = html.split(/\n{2,}/).map(chunk => {
      const t = chunk.trim();
      if (!t) return '';
      if (/^<(h[2-4]|ul|ol|table|hr)/.test(t)) return t;
      return `<p>${t.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
  }

  // ---- UI State Machine ----

  function showState(state) {
    mainContent.classList.toggle('hidden', state !== 'idle');
    loading.classList.toggle('hidden', state !== 'loading');
    result.classList.toggle('hidden', state !== 'result');
    error.classList.toggle('hidden', state !== 'error');
    if (state === 'result') result.classList.add('fade-in');
  }

  function showResult(text, isProgressive = false) {
    const badge = isProgressive ? '<span class="progressive-badge">⏳ Decoding your text...</span>' : '';
    resultContent.innerHTML = badge + renderMarkdown(text);
    showState('result');
    if (!isProgressive) {
      chrome.storage.session.set({ cached_result: text, cached_at: Date.now() });
    }
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    showState('error');
  }

  // ---- First-run onboarding ----

  function showOnboarding() {
    onboarding.classList.remove('hidden');
    mainContent.classList.add('hidden');
    loading.classList.add('hidden');
    result.classList.add('hidden');
    error.classList.add('hidden');
  }

  function hideOnboarding() {
    onboarding.classList.add('hidden');
  }

  document.getElementById('onboard-toggle-gemini').addEventListener('click', () => {
    onboardGeminiInput.type = onboardGeminiInput.type === 'password' ? 'text' : 'password';
  });
  document.getElementById('onboard-toggle-openrouter').addEventListener('click', () => {
    onboardOpenrouterInput.type = onboardOpenrouterInput.type === 'password' ? 'text' : 'password';
  });

  onboardSaveBtn.addEventListener('click', () => {
    const gk = onboardGeminiInput.value.trim();
    const ok = onboardOpenrouterInput.value.trim();
    if (!gk && !ok) {
      onboardSaveBtn.textContent = '⚠️ Enter at least one key';
      setTimeout(() => { onboardSaveBtn.textContent = 'Get Started →'; }, 2000);
      return;
    }
    const updates = {};
    if (gk) updates.gemini_api_key = gk;
    if (ok) updates.openrouter_api_key = ok;
    chrome.storage.local.set(updates, () => {
      hideOnboarding();
      initApp();
    });
  });

  // ---- Restore cache on popup open ----

  function initApp() {
    chrome.storage.session.get(['cached_result', 'cached_at'], (data) => {
      if (data.cached_result && data.cached_at) {
        if (Date.now() - data.cached_at < 10 * 60 * 1000) {
          resultContent.innerHTML = renderMarkdown(data.cached_result);
          showState('result');
          return;
        }
      }
      showState('idle');
    });
  }

  chrome.storage.local.get(['gemini_api_key', 'openrouter_api_key'], (keys) => {
    if (!keys.gemini_api_key && !keys.openrouter_api_key) {
      showOnboarding();
    } else {
      initApp();
    }
  });

  // ============================================
  // ▼▼▼ ACTION LOGIC — MODIFY THIS PER PROJECT ▼▼▼
  // ============================================

  async function runAction() {
    showState('loading');
    try {
      const text = document.getElementById('custom-input')?.value.trim() || '';
      if (!text) { showError('Paste some corporate speak or passive-aggressive text to translate.'); return; }

      // Phase 1: Instant local preview — no API call
      const wordCount = text.split(/\s+/).length;
      const snippet = text.length > 80 ? text.slice(0, 80) + '...' : text;
      showResult(`## Decoding...\n\nYour text: *"${snippet}"* (${wordCount} word${wordCount === 1 ? '' : 's'})\n\n*Gemini is exposing the real meaning...*`, true);

      // Phase 2: Full translation — single API call
      const fullPrompt = `Corporate/passive-aggressive text: "${text}"

Translate this to plain, honest English:

## What They Said
"${text}"

## What They Actually Mean
[The blunt, honest translation — no corporate softening]

## Subtext
[What's really going on beneath the surface — power dynamics, avoidance, manipulation]

## How to Respond
[A direct, confident response that doesn't play their game]

Be witty but accurate. Use **bold** for key phrases.`;

      chrome.runtime.sendMessage(
        {
          action: 'callGeminiBackground',
          prompt: fullPrompt,
          options: {
            systemInstruction: 'You are a brutally honest corporate speak decoder. Expose passive-aggressive language and jargon with wit and precision. Never soften your analysis.',
            temperature: 0.7,
          },
        },
        (response) => {
          if (response?.success) showResult(response.data, false);
          else showError(response?.error || 'Translation failed. Try again.');
        }
      );
    } catch (err) {
      showError(err.message || 'Something went wrong.');
    }
  }

  // ============================================
  // ▲▲▲ END ACTION LOGIC ▲▲▲
  // ============================================

  // ---- Settings Panel ----

  function openSettings() {
    settingsPanel.classList.remove('hidden');
    settingsPanel.classList.add('fade-in');
    chrome.storage.local.get(['gemini_api_key', 'openrouter_api_key'], (data) => {
      geminiKeyInput.value = data.gemini_api_key || '';
      openrouterKeyInput.value = data.openrouter_api_key || '';
    });
  }

  function closeSettings() {
    settingsPanel.classList.add('hidden');
    settingsPanel.classList.remove('fade-in');
  }

  settingsBtn.addEventListener('click', openSettings);
  settingsClose.addEventListener('click', closeSettings);

  toggleGeminiKey.addEventListener('click', () => {
    geminiKeyInput.type = geminiKeyInput.type === 'password' ? 'text' : 'password';
  });
  toggleOpenrouterKey.addEventListener('click', () => {
    openrouterKeyInput.type = openrouterKeyInput.type === 'password' ? 'text' : 'password';
  });

  saveKeysBtn.addEventListener('click', () => {
    const updates = {};
    const gk = geminiKeyInput.value.trim();
    const ok = openrouterKeyInput.value.trim();
    if (gk) updates.gemini_api_key = gk;
    if (ok) updates.openrouter_api_key = ok;
    if (Object.keys(updates).length === 0) return;
    chrome.storage.local.set(updates, () => {
      saveKeysBtn.textContent = '✅ Saved';
      setTimeout(() => { saveKeysBtn.textContent = 'Save Keys'; }, 1500);
    });
  });

  clearKeysBtn.addEventListener('click', async () => {
    await resetApiKeys();
    geminiKeyInput.value = '';
    openrouterKeyInput.value = '';
    clearKeysBtn.textContent = '✅ Cleared';
    setTimeout(() => { clearKeysBtn.textContent = 'Clear All Keys'; }, 1500);
  });

  // ---- Event Listeners ----

  function resetToIdle() {
    const input = document.getElementById('custom-input');
    if (input) input.value = '';
    chrome.storage.session.remove(['cached_result', 'cached_at']);
    showState('idle');
  }

  actionBtn.addEventListener('click', runAction);
  retryBtn.addEventListener('click', () => showState('idle'));
  rerunBtn.addEventListener('click', resetToIdle);

  copyBtn.addEventListener('click', () => {
    const temp = document.createElement('div');
    temp.innerHTML = resultContent.innerHTML;
    const text = temp.textContent || temp.innerText;
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = '✅';
      setTimeout(() => { copyBtn.textContent = '📋'; }, 1500);
    });
  });
});