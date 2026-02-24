const API_KEY = 'AIzaSyCV66l-eeo__7jC5sqWPm07dPIq7O6BKq0';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

// DOM Elements
const chatContainer = document.getElementById('chat-container');
const messagesList = document.getElementById('messages-list');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');
const cursorGlow = document.getElementById('cursor-glow');
const themeButtons = document.querySelectorAll('.theme-btn');
const welcomeMsg = document.querySelector('.welcome-message');

// State
let chatHistory = [];

// Initialize
function init() {
    setupEventListeners();
    setupCursorEffect();
}

function setupEventListeners() {
    // Send message on button click
    sendBtn.addEventListener('click', handleSendMessage);

    // Send message on Enter (but allow Shift+Enter for new lines)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // Auto-resize textarea
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    });

    // Theme switching
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            document.body.setAttribute('data-theme', theme);

            // Update active state
            themeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

let mouseX = 0, mouseY = 0;
let cursorX = 0, cursorY = 0;

function setupCursorEffect() {
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animateCursor() {
        // Smooth interpolation (lerp)
        const dx = mouseX - cursorX;
        const dy = mouseY - cursorY;

        cursorX += dx * 0.1;
        cursorY += dy * 0.1;

        cursorGlow.style.left = cursorX + 'px';
        cursorGlow.style.top = cursorY + 'px';

        requestAnimationFrame(animateCursor);
    }
    animateCursor();
}

async function handleSendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Reset input
    userInput.value = '';
    userInput.style.height = 'auto';
    welcomeMsg.style.display = 'none';

    // Add user message to UI
    addMessage(text, 'user');

    // Show typing indicator
    showTyping(true);

    try {
        const response = await callGeminiAPI(text);
        showTyping(false);

        if (response) {
            addMessage(response.reply, 'bot', response.correction);
        } else {
            addMessage("I'm sorry, I couldn't process that. Please try again.", 'bot');
        }
    } catch (error) {
        console.error('Error:', error);
        showTyping(false);
        addMessage("Oops! Something went wrong. Check your connection or API key.", 'bot');
    }
}

async function callGeminiAPI(input) {
    console.log('User Input:', input);

    const systemPrompt = `You are a helpful AI chat bot and grammar assistant. 
1. Respond naturally to the user's input.
2. Check the user's input for grammar, spelling, or punctuation errors.
3. If there are errors, identify the corrected version.
4. ALWAYS respond in JSON format with these exact keys:
   {
     "reply": "Your conversational response",
     "hasCorrection": true,
     "correction": "The full corrected sentence"
   }
If there are no errors, set hasCorrection to false and correction to null.
Do not include any markdown formatting like \`\`\`json in the output. Just the raw JSON string.`;

    const body = {
        contents: [
            {
                role: "user",
                parts: [{ text: `Instruction: ${systemPrompt}\n\nUser Message: ${input}` }]
            }
        ],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
        }
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Response Error:', errorData);
            throw new Error(errorData.error?.message || 'API request failed');
        }

        const data = await response.json();
        console.log('API Response Data:', data);

        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
            const rawText = data.candidates[0].content.parts[0].text.trim();
            console.log('AI Raw Text:', rawText);

            try {
                // Attempt to parse JSON (cleaning potential markdown)
                const cleanJson = rawText.replace(/```json|```/g, '').trim();
                return JSON.parse(cleanJson);
            } catch (e) {
                console.warn('JSON parsing failed. Falling back to raw text.', e);
                return {
                    reply: rawText,
                    hasCorrection: false,
                    correction: null
                };
            }
        }

        if (data.promptFeedback?.blockReason) {
            return {
                reply: "I'm sorry, my safety filters blocked that request. Please try saying something else.",
                hasCorrection: false,
                correction: null
            };
        }

    } catch (err) {
        console.error('Gemini API Error:', err);
        return {
            reply: `Error: ${err.message}`,
            hasCorrection: false,
            correction: null
        };
    }
    return null;
}

function addMessage(text, sender, correction = null) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);

    let content = `<div class="text-content">${text}</div>`;

    if (sender === 'bot' && correction) {
        content += `
            <div class="correction-tag">
                📝 Grammar Fix:
                <span class="correction-content">${correction}</span>
            </div>
        `;
    }

    messageDiv.innerHTML = content;
    messagesList.appendChild(messageDiv);

    // Scroll to bottom
    chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
    });
}

function showTyping(show) {
    if (show) {
        typingIndicator.classList.remove('hidden');
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    } else {
        typingIndicator.classList.add('hidden');
    }
}

// Start the app
init();
