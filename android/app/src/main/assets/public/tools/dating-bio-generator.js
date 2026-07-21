const BIO_LIMITS = { interests: 120, personality: 160 };
const BLOCKED_TERMS = [
  'underage', 'minor', 'child', 'sex for money', 'hookup with minor', 'hate', 'kill',
  'scam', 'catfish', 'impersonate', 'bank details', 'password', 'nude', 'blackmail'
];

export function sanitizePlainText(value, maxLength = 160) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function validateBioInput(input) {
  const interests = sanitizePlainText(input.interests, BIO_LIMITS.interests);
  const personality = sanitizePlainText(input.personality, BIO_LIMITS.personality);
  const combined = `${interests} ${personality}`.toLowerCase();
  const blocked = BLOCKED_TERMS.find((term) => combined.includes(term));

  if (blocked) {
    return {
      ok: false,
      error: 'Please keep the bio respectful, truthful, adult-safe, and free of private or abusive details.'
    };
  }

  if (!interests && !personality) {
    return { ok: false, error: 'Add at least one interest or personality detail.' };
  }

  return { ok: true, value: { ...input, interests, personality } };
}

function splitInterests(interests) {
  return interests
    .split(',')
    .map((item) => sanitizePlainText(item, 32))
    .filter(Boolean)
    .slice(0, 5);
}

function intentionCopy(intention) {
  return {
    friendship: 'friendship first and a connection that can grow naturally',
    serious: 'something intentional with honest communication',
    casual: 'easygoing connection with respect and clear boundaries',
    unsure: 'good conversation while I figure out what feels right'
  }[intention] || 'honest connection';
}

function toneOpening(tone) {
  return {
    warm: 'Warm-hearted student',
    confident: 'Student with focus, good energy, and clear intentions',
    funny: 'Campus survivor with decent jokes and better intentions',
    calm: 'Calm student who values honest conversation',
    shy: 'Quiet at first, but easy to talk to once comfortable'
  }[tone] || 'Student';
}

export function generateBioSuggestions(input) {
  const validation = validateBioInput(input);
  if (!validation.ok) return { error: validation.error, suggestions: [] };

  const { tone, intention, length, interests, personality } = validation.value;
  const interestList = splitInterests(interests);
  const interestText = interestList.length > 1
    ? `${interestList.slice(0, -1).join(', ')} and ${interestList.at(-1)}`
    : (interestList[0] || 'good conversation');
  const intent = intentionCopy(intention);
  const personalityText = personality || 'I like people who communicate clearly and respect boundaries';
  const opener = toneOpening(tone);

  const short = [
    `${opener}. Into ${interestText}. Looking for ${intent}. Ask me about my current campus obsession.`,
    `${personalityText}. I enjoy ${interestText} and conversations that feel natural, not forced.`,
    `Student life, ${interestText}, and respectful vibes. Open to ${intent}.`
  ];

  const medium = [
    `${opener}. I enjoy ${interestText}, and I am looking for ${intent}. I like conversations that are honest, funny, and low-pressure.`,
    `${personalityText}. Most days I am balancing school with ${interestText}. If your communication is kind and direct, we will probably get along.`,
    `Currently building a student life that includes ${interestText}, better routines, and real conversation. Open to ${intent}, with honesty from the start.`
  ];

  const detailed = [
    `${opener}. I am into ${interestText}, and I care about clear communication, school-life balance, and respect. I am looking for ${intent}. Start with your best campus food spot or your favorite study playlist.`,
    `${personalityText}. I like people who can laugh, listen, and say what they mean. My interests include ${interestText}. I prefer connection that feels natural and truthful.`,
    `Student life keeps me busy, but I still make time for ${interestText} and good conversation. I am open to ${intent}; no pressure, no fake energy, just honest vibes and mutual respect.`
  ];

  return { error: null, suggestions: ({ short, medium, detailed }[length] || medium) };
}

function renderSuggestions(results, suggestions) {
  results.textContent = '';
  suggestions.forEach((suggestion, index) => {
    const card = document.createElement('article');
    card.className = 'tool-result-card';
    const heading = document.createElement('h3');
    heading.textContent = `Option ${index + 1}`;
    const text = document.createElement('p');
    text.textContent = suggestion;
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'copy-bio-btn';
    copy.textContent = 'Copy';
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(suggestion);
        copy.textContent = 'Copied';
        setTimeout(() => { copy.textContent = 'Copy'; }, 1600);
      } catch {
        copy.textContent = 'Select text';
      }
    });
    card.append(heading, text, copy);
    results.append(card);
  });
}

function initGenerator() {
  const form = document.getElementById('bio-generator-form');
  const error = document.getElementById('bio-generator-error');
  const status = document.getElementById('bio-generator-status');
  const results = document.getElementById('bio-generator-results');
  if (!form || !error || !status || !results) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    error.textContent = '';
    status.textContent = 'Generating editable ideas...';
    results.textContent = '';

    const data = Object.fromEntries(new FormData(form).entries());
    window.setTimeout(() => {
      const generated = generateBioSuggestions(data);
      if (generated.error) {
        status.textContent = '';
        error.textContent = generated.error;
        return;
      }
      status.textContent = 'Generated locally in your browser. Edit before using.';
      renderSuggestions(results, generated.suggestions);
    }, 180);
  });
}

if (typeof document !== 'undefined') {
  initGenerator();
}
