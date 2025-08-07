let db;
const request = indexedDB.open('BanglaDictionaryDB', 1);
request.onupgradeneeded = function(event) {
  db = event.target.result;
  db.createObjectStore('words', { keyPath: 'word' });
};
request.onsuccess = function(event) {
  db = event.target.result;
  loadHistory();
};
request.onerror = function() {
  displayHistoryError('ইনডেক্সডডিবি লোড করা যায়নি।');
};

function loadHistory() {
  try {
    const tx = db.transaction('words', 'readonly');
    const store = tx.objectStore('words');
    const req = store.openCursor();
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    let found = false;
    req.onsuccess = function(event) {
      const cursor = event.target.result;
      if (cursor) {
        found = true;
        const entry = cursor.value;
        const li = document.createElement('li');
        li.innerHTML = `
          <div class="bg-white rounded-2xl shadow p-4 border border-indigo-100 flex flex-col gap-1">
            <span class="text-xs font-semibold text-indigo-500 bg-indigo-50 rounded px-2 py-1 w-fit">শব্দ</span>
            <span class="text-base md:text-lg font-bold text-gray-800">${entry.word}</span>
          </div>
        `;
        list.appendChild(li);
        cursor.continue();
      } else if (!found) {
        list.innerHTML = '<li><div class="bg-white rounded-2xl shadow p-4 border border-gray-100 text-xs text-gray-400">কোনো অনুসন্ধান ইতিহাস নেই।</div></li>';
      }
    };
    req.onerror = function() {
      displayHistoryError('ইতিহাস লোড করা যায়নি।');
    };
  } catch (err) {
    displayHistoryError('ইতিহাস লোড করা যায়নি।');
  }
}

function displayHistoryError(msg) {
  const list = document.getElementById('historyList');
  list.innerHTML = `<li><div class='text-red-700 bg-red-50 rounded p-3 text-xs'>${msg}</div></li>`;
}