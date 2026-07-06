/* ============================================================
   DIGITAL GROWTHSCALE — DASHBOARD SCRIPT
   Beginner note: this file talks to the get-submissions
   function (in netlify/functions), which is the only place
   that holds the real Netlify API credentials.
   ============================================================ */

(function () {
  var lockScreen = document.getElementById('lockScreen');
  var dashboard = document.getElementById('dashboard');
  var lockForm = document.getElementById('lockForm');
  var passwordInput = document.getElementById('passwordInput');
  var lockError = document.getElementById('lockError');
  var refreshBtn = document.getElementById('refreshBtn');
  var tableArea = document.getElementById('tableArea');

  var currentPassword = null;

  lockForm.addEventListener('submit', function (e) {
    e.preventDefault();
    lockError.textContent = '';
    loadSubmissions(passwordInput.value, function (ok) {
      if (ok) {
        currentPassword = passwordInput.value;
        lockScreen.style.display = 'none';
        dashboard.style.display = 'block';
      } else {
        lockError.textContent = 'Incorrect password. Please try again.';
      }
    });
  });

  refreshBtn.addEventListener('click', function () {
    if (currentPassword) loadSubmissions(currentPassword, function () {});
  });

  function loadSubmissions(password, callback) {
    tableArea.innerHTML = '<div class="loading-state">Loading leads&hellip;</div>';

    fetch('/.netlify/functions/get-submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password })
    })
      .then(function (res) {
        if (res.status === 401) { callback(false); return null; }
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        if (!result) return;
        if (!result.ok) {
          tableArea.innerHTML = '<div class="empty-state">' + escapeHtml(result.data.error || 'Something went wrong loading leads.') + '</div>';
          callback(true);
          return;
        }
        renderSubmissions(result.data.submissions || [], result.data.note);
        callback(true);
      })
      .catch(function () {
        tableArea.innerHTML = '<div class="empty-state">Could not reach the dashboard function. Check your internet connection and try Refresh.</div>';
        callback(true);
      });
  }

  function renderSubmissions(items, note) {
    document.getElementById('statTotal').textContent = items.length;

    var now = new Date();
    var startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    var todayCount = items.filter(function (i) { return new Date(i.createdAt) >= startOfToday; }).length;
    var weekCount = items.filter(function (i) { return new Date(i.createdAt) >= sevenDaysAgo; }).length;

    document.getElementById('statToday').textContent = todayCount;
    document.getElementById('statWeek').textContent = weekCount;

    if (!items.length) {
      tableArea.innerHTML = '<div class="empty-state">' + escapeHtml(note || 'No leads yet. New inquiries from the homepage form will show up here automatically.') + '</div>';
      return;
    }

    var rows = items.map(function (item) {
      return '<tr>' +
        '<td>' + escapeHtml(formatDate(item.createdAt)) + '</td>' +
        '<td>' + escapeHtml(item.name) + '</td>' +
        '<td><a href="mailto:' + escapeHtml(item.email) + '">' + escapeHtml(item.email) + '</a></td>' +
        '<td><a href="tel:' + escapeHtml(item.phone) + '">' + escapeHtml(item.phone) + '</a></td>' +
        '<td>' + escapeHtml(item.service) + '</td>' +
        '<td>' + escapeHtml(item.budget) + '</td>' +
        '<td>' + escapeHtml(item.urgency) + '</td>' +
        '<td style="max-width:240px;">' + escapeHtml(item.message) + '</td>' +
        '<td><span class="status-badge">New Lead</span></td>' +
      '</tr>';
    }).join('');

    tableArea.innerHTML =
      '<table>' +
        '<thead><tr>' +
          '<th>Date</th><th>Name</th><th>Email</th><th>Phone</th><th>Service</th><th>Budget</th><th>Urgency</th><th>Message</th><th>Status</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>';
  }

  function formatDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
