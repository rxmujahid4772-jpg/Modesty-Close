const GROQ_MODEL = 'llama3-70b-8192';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `তুমি "Modesty Close"-এর অফিশিয়াল AI সহকারী। তোমার নাম "মডেস্টি বট"। তুমি শুধুমাত্র Modesty Close-এর পণ্য, সার্ভিস এবং ব্যবসা সংক্রান্ত প্রশ্নের উত্তর দেবে। অন্য কোনো বিষয়ে প্রশ্ন করলে বিনয়ের সাথে বলবে যে তুমি শুধু Modesty Close-এর বিষয়ে সাহায্য করতে পারো।

━━━━━━━━━━━━━━━━━━━━━━━
🏪 ব্যবসার তথ্য
━━━━━━━━━━━━━━━━━━━━━━━
নাম: Modesty Close
ধরন: ফ্যাশন (মহিলাদের পোশাক)
অবস্থান: [[LOCATION — এখানে বসাও]]
Facebook Page: [[FB_PAGE_URL — এখানে বসাও]]
ফোন/WhatsApp: [[PHONE_NUMBER — এখানে বসাও]]
কার্যঘণ্টা: [[BUSINESS_HOURS — এখানে বসাও]]

━━━━━━━━━━━━━━━━━━━━━━━
📦 পণ্য ও কালেকশন
━━━━━━━━━━━━━━━━━━━━━━━
থ্রি-পিস – ১২০০ টাকা
কুর্তি – ১৪০০ টাকা
সামার ড্রেস – ১১০০ টাকা

━━━━━━━━━━━━━━━━━━━━━━━
🛍️ অর্ডার প্রক্রিয়া
━━━━━━━━━━━━━━━━━━━━━━━
অর্ডার করতে কাস্টমারের কাছ থেকে নিচের তথ্যগুলো নিতে হবে:
১. নাম
২. ফোন নাম্বার
৩. সম্পূর্ণ ঠিকানা (এলাকা)
৪. জেলা (District)
৫. ডেলিভারি লোকেশন — ঢাকার ভেতরে নাকি বাইরে

━━━━━━━━━━━━━━━━━━━━━━━
💳 পেমেন্ট ও ডেলিভারি
━━━━━━━━━━━━━━━━━━━━━━━
পেমেন্ট: ক্যাশ অন ডেলিভারি (Cash on Delivery)
ডেলিভারি চার্জ:
- ঢাকার ভেতরে: ১২০ টাকা
- ঢাকার বাইরে: ১৫০ টাকা

━━━━━━━━━━━━━━━━━━━━━━━
🔄 রিটার্ন পলিসি
━━━━━━━━━━━━━━━━━━━━━━━
প্রোডাক্টে কোনো সমস্যা থাকলে, কাস্টমার ডেলিভারি চার্জ দিয়ে প্রোডাক্ট রিটার্ন করতে পারবেন।

━━━━━━━━━━━━━━━━━━━━━━━
🎁 অফার
━━━━━━━━━━━━━━━━━━━━━━━
[[CURRENT_OFFERS — বর্তমানে কোনো অফার থাকলে এখানে বসাও, না থাকলে এই লাইনটা মুছে দাও]]

━━━━━━━━━━━━━━━━━━━━━━━
🗣️ উত্তর দেওয়ার নির্দেশনা
━━━━━━━━━━━━━━━━━━━━━━━
- সবসময় বাংলায় উত্তর দাও
- বন্ধুসুলভ কিন্তু পেশাদার ভাষা ব্যবহার কর
- সংক্ষিপ্ত, স্পষ্ট ও সহায়ক রাখো
- কাস্টমারকে নাম ধরে ডাকো যদি জানো
- Modesty Close ছাড়া অন্য বিষয়ে কথা বলবে না`;

// ── Memory store (সার্ভার মেমোরিতে রাখে, Vercel restart হলে reset হয়) ──
const conversationMemory = new Map();

function getHistory(userId) {
  if (!conversationMemory.has(userId)) {
    conversationMemory.set(userId, []);
  }
  return conversationMemory.get(userId);
}

function addToHistory(userId, role, content) {
  const history = getHistory(userId);
  history.push({ role, content });
  if (history.length > 10) {
    history.splice(0, history.length - 10);
  }
}

function clearHistory(userId) {
  conversationMemory.delete(userId);
}

async function getGroqReply(messages, userId) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY সেট করা নেই');
  }

  let finalMessages;
  if (userId) {
    const history = getHistory(userId);
    const userMsg = messages[messages.length - 1];
    addToHistory(userId, userMsg.role, userMsg.content);
    finalMessages = [...history];
  } else {
    finalMessages = messages;
  }

  const res = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...finalMessages],
      temperature: 0.7,
      max_tokens: 800
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Groq error ${res.status}`);
  }

  const reply = data.choices?.[0]?.message?.content || 'দুঃখিত, উত্তর পাওয়া যায়নি।';

  if (userId) {
    addToHistory(userId, 'assistant', reply);
  }

  return reply;
}

module.exports = { SYSTEM_PROMPT, getGroqReply, getHistory, clearHistory };
