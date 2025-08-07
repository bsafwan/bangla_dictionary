// IndexedDB setup
let db;
const request = indexedDB.open('BanglaDictionaryDB', 1);
request.onupgradeneeded = function(event) {
  db = event.target.result;
  db.createObjectStore('words', { keyPath: 'word' });
};
request.onsuccess = function(event) {
  db = event.target.result;
};

function saveWord(word, data) {
  const tx = db.transaction('words', 'readwrite');
  const store = tx.objectStore('words');
  store.put({ word, data });
}

function getWord(word, callback) {
  const tx = db.transaction('words', 'readonly');
  const store = tx.objectStore('words');
  const req = store.get(word);
  req.onsuccess = () => callback(req.result ? req.result.data : null);
}

// Fetch word data from backend API
async function fetchWordFromAPI(word) {
  try {
    const response = await fetch('/api/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'API error');
    }
    return await response.json();
  } catch (err) {
    return {
      correct: false,
      word,
      suggestions: { easy: [], medium: [], complex: [] },
      antonyms: [],
      synonyms: [],
      examples: { easy: [], medium: [], complex: [] },
      origin: '',
      poetry: [],
      error: err.message || 'সার্ভার থেকে তথ্য পাওয়া যায়নি।'
    };
  }
}

// Handle form submission
const form = document.getElementById('searchForm');
const searchBtn = document.getElementById('searchBtn');
const searchBtnText = document.getElementById('searchBtnText');
const searchBtnLoader = document.getElementById('searchBtnLoader');
if (form) {
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const word = document.getElementById('wordInput').value.trim();
    if (!word) return;
    setLoading(true);
    getWord(word, async function(data) {
      if (data) {
        displayResult(data);
        setLoading(false);
      } else {
        // Fetch from API and save
        const aiData = await fetchWordFromAPI(word);
        saveWord(word, aiData);
        displayResult(aiData);
        setLoading(false);
      }
    });
  });
}

function setLoading(isLoading) {
  if (!searchBtn || !searchBtnText || !searchBtnLoader) return;
  if (isLoading) {
    searchBtn.disabled = true;
    searchBtn.classList.add('opacity-60', 'cursor-not-allowed');
    searchBtnLoader.classList.remove('hidden');
    searchBtnText.classList.add('opacity-0');
  } else {
    searchBtn.disabled = false;
    searchBtn.classList.remove('opacity-60', 'cursor-not-allowed');
    searchBtnLoader.classList.add('hidden');
    searchBtnText.classList.remove('opacity-0');
  }
}

function displayResult(data) {
  const resultDiv = document.getElementById('result');
  if (data.error) {
    resultDiv.innerHTML = `<div class='bg-red-100 text-red-700 rounded-lg shadow p-4 text-xs md:text-sm'>ত্রুটি: ${data.error}</div>`;
    return;
  }
  // Preview: show a few suggestions/examples, and expandable advanced section
  const previewSuggestions = [
    ...(data.suggestions.easy || []),
    ...(data.suggestions.medium || []),
    ...(data.suggestions.complex || [])
  ].slice(0, 3);
  const previewExamples = [
    ...(data.examples.easy || []),
    ...(data.examples.medium || []),
    ...(data.examples.complex || [])
  ].slice(0, 2);
  const hasAdvanced = (
    (data.suggestions.medium && data.suggestions.medium.length > 0) ||
    (data.suggestions.complex && data.suggestions.complex.length > 0) ||
    (data.antonyms && data.antonyms.length > 0) ||
    (data.origin && data.origin.length > 0) ||
    (data.poetry && data.poetry.length > 0) ||
    (data.examples.medium && data.examples.medium.length > 0) ||
    (data.examples.complex && data.examples.complex.length > 0)
  );
  resultDiv.innerHTML = `
    <div class="bg-white rounded-2xl shadow-lg p-5 border border-indigo-100 mb-4">
      <div class="mb-2 flex items-center gap-2">
        <span class="text-xs font-semibold text-indigo-500 bg-indigo-50 rounded px-2 py-1">শব্দ</span>
        <span class="text-base md:text-lg font-bold text-gray-800">${data.word}</span>
        <span class="ml-auto text-xs font-medium ${data.correct ? 'text-green-600' : 'text-red-600'}">${data.correct ? 'সঠিক' : 'ভুল'}</span>
      </div>
      <div class="mb-2">
        <span class="block text-xs font-semibold text-blue-500 mb-1">পরামর্শ (সহজ থেকে কঠিন)</span>
        <span class="text-xs md:text-sm text-gray-700">${previewSuggestions.length ? previewSuggestions.join(', ') : 'কোনো পরামর্শ নেই'}</span>
      </div>
      <div class="mb-2">
        <span class="block text-xs font-semibold text-purple-500 mb-1">সমার্থক শব্দ</span>
        <span class="text-xs md:text-sm text-gray-700">${data.synonyms.length ? data.synonyms.join(', ') : 'কোনো সমার্থক শব্দ নেই'}</span>
      </div>
      <div class="mb-2">
        <span class="block text-xs font-semibold text-pink-500 mb-1">উদাহরণ</span>
        <ul class="list-disc pl-5 space-y-1">
          ${previewExamples.length ? previewExamples.map(e => `<li class="text-xs md:text-sm text-gray-700">${e}</li>`).join('') : '<li class="text-xs text-gray-400">কোনো উদাহরণ নেই</li>'}
        </ul>
      </div>
      ${hasAdvanced ? `<button id="expandBtn" class="mt-2 text-xs text-indigo-600 hover:underline focus:outline-none">আরো বিস্তারিত দেখুন</button>` : ''}
      <div id="advancedSection" class="hidden mt-4">
        <div class="mb-2">
          <span class="block text-xs font-semibold text-blue-700 mb-1">বিস্তারিত পরামর্শ</span>
          <div class="flex flex-col gap-1">
            <span class="text-xs text-gray-700"><b>সহজ:</b> ${(data.suggestions.easy || []).join(', ') || '—'}</span>
            <span class="text-xs text-gray-700"><b>মধ্যম:</b> ${(data.suggestions.medium || []).join(', ') || '—'}</span>
            <span class="text-xs text-gray-700"><b>কঠিন:</b> ${(data.suggestions.complex || []).join(', ') || '—'}</span>
          </div>
        </div>
        <div class="mb-2">
          <span class="block text-xs font-semibold text-red-500 mb-1">বিপরীত শব্দ</span>
          <span class="text-xs md:text-sm text-gray-700">${data.antonyms.length ? data.antonyms.join(', ') : 'কোনো বিপরীত শব্দ নেই'}</span>
        </div>
        <div class="mb-2">
          <span class="block text-xs font-semibold text-pink-700 mb-1">বিস্তারিত উদাহরণ</span>
          <div class="flex flex-col gap-1">
            <span class="text-xs text-gray-700"><b>সহজ:</b> ${(data.examples.easy || []).join(' | ') || '—'}</span>
            <span class="text-xs text-gray-700"><b>মধ্যম:</b> ${(data.examples.medium || []).join(' | ') || '—'}</span>
            <span class="text-xs text-gray-700"><b>কঠিন:</b> ${(data.examples.complex || []).join(' | ') || '—'}</span>
          </div>
        </div>
        <div class="mb-2">
          <span class="block text-xs font-semibold text-yellow-600 mb-1">শব্দের উৎপত্তি</span>
          <span class="text-xs md:text-sm text-gray-700">${data.origin || '—'}</span>
        </div>
        <div>
          <span class="block text-xs font-semibold text-green-700 mb-1">কবিতার লাইন</span>
          <ul class="list-disc pl-5 space-y-1">
            ${data.poetry.length ? data.poetry.map(e => `<li class="text-xs md:text-sm text-gray-700">${e}</li>`).join('') : '<li class="text-xs text-gray-400">কোনো কবিতার লাইন নেই</li>'}
          </ul>
        </div>
      </div>
    </div>
  `;
  // Expansion logic
  const expandBtn = document.getElementById('expandBtn');
  const advancedSection = document.getElementById('advancedSection');
  if (expandBtn && advancedSection) {
    expandBtn.addEventListener('click', () => {
      advancedSection.classList.toggle('hidden');
      expandBtn.textContent = advancedSection.classList.contains('hidden') ? 'আরো বিস্তারিত দেখুন' : 'সংক্ষিপ্ত করুন';
    });
  }
}