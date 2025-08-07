const express = require('express');
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DEEPSEEK_API_KEY = "sk-0ba7dbc24c204dc4931628035d2fca38";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory cache for fast repeated lookups (resets on server restart)
const wordCache = {};

// Helper: Build a shorter, direct prompt for Deepseek
function buildPrompt(word) {
  return `বাংলা শব্দের অভিধান তথ্য দাও।\nশব্দ: ${word}\nফলাফলটি JSON আকারে দাও, উদাহরণ: {\n  "correct": true/false,\n  "word": "...",\n  "suggestions": { "easy": ["..."], "medium": ["..."], "complex": ["..."] },\n  "antonyms": ["..."],\n  "synonyms": ["..."],\n  "examples": { "easy": ["..."], "medium": ["..."], "complex": ["..."] },\n  "origin": "...",\n  "poetry": ["..."]\n}\nসহজ থেকে কঠিন পর্যন্ত সাজানো শব্দের পরামর্শ (সাহিত্য), বিপরীত শব্দ, সমার্থক শব্দ, উদাহরণ (সহজ, মধ্যম, কঠিন), শব্দের উৎপত্তি, এবং কিছু কবিতার লাইন অন্তর্ভুক্ত করো।`;
}

// Helper: Fetch with timeout
async function fetchWithTimeout(resource, options = {}, timeout = 6000) {
  return Promise.race([
    fetch(resource, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('AI took too long, দয়া করে আবার চেষ্টা করুন')), timeout))
  ]);
}

// API endpoint for word lookup
app.post('/api/lookup', async (req, res) => {
  const { word } = req.body;
  if (!word) {
    return res.status(400).json({ error: 'No word provided.' });
  }
  // Check cache first
  if (wordCache[word]) {
    return res.json(wordCache[word]);
  }
  try {
    const response = await fetchWithTimeout('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: buildPrompt(word) }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    }, 6000); // 6 seconds
    if (!response.ok) {
      throw new Error('Deepseek API error');
    }
    const data = await response.json();
    // Try to parse the JSON from the model's response
    let dictResult;
    try {
      dictResult = JSON.parse(data.choices[0].message.content);
    } catch (e) {
      dictResult = {};
    }
    // Ensure all fields exist for frontend
    const result = {
      correct: dictResult.correct ?? false,
      word: dictResult.word ?? word,
      suggestions: dictResult.suggestions ?? { easy: [], medium: [], complex: [] },
      antonyms: dictResult.antonyms ?? [],
      synonyms: dictResult.synonyms ?? [],
      examples: dictResult.examples ?? { easy: [], medium: [], complex: [] },
      origin: dictResult.origin ?? '',
      poetry: dictResult.poetry ?? []
    };
    wordCache[word] = result;
    res.json(result);
  } catch (err) {
    res.status(500).json({
      correct: false,
      word,
      suggestions: { easy: [], medium: [], complex: [] },
      antonyms: [],
      synonyms: [],
      examples: { easy: [], medium: [], complex: [] },
      origin: '',
      poetry: [],
      error: err.message || 'Server error. Please try again later.'
    });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/history', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'history.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});