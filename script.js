// Wait until the entire page is loaded before doing anything
document.addEventListener('DOMContentLoaded', () => {

    // Grab all the necessary DOM elements
    const wordInput = document.getElementById('word-input');
    const addWordBtn = document.getElementById('add-word-btn');
    const mysteryWordBtn = document.getElementById('mystery-word-btn');
    const wordListContainer = document.getElementById('word-list-container');
    const emptyListMsg = document.getElementById('empty-list-msg');
    const toneSelector = document.getElementById('tone-selector');
    const lengthSelector = document.getElementById('length-selector');
    const generateStoryBtn = document.getElementById('generate-story-btn');
    const startOverBtn = document.getElementById('start-over-btn');
    const storyOutputSection = document.getElementById('story-output-section');
    const storyOutputContainer = document.getElementById('story-output-container');
    const storyTitle = document.getElementById('story-title');
    const storyOutput = document.getElementById('story-output');
    const generateBtnText = document.getElementById('generate-btn-text');
    const loader = document.getElementById('loader');
    const downloadBtn = document.getElementById('download-btn');
    const copyBtn = document.getElementById('copy-btn');

    // Where the added words will be stored
    let wordList = [];

    // Used to block multiple generate clicks while typing is in progress
    let isTyping = false;

    // Mystery words to inspire creativity – might add more later
    const mysteryWords = [
        'shadow', 'echo', 'clockwork', 'whisper', 'nebula', 'forgotten', 'crystal', 'labyrinth', 'velvet', 'sunken',
        'gilded', 'spectral', 'mechanical', 'ephemeral', 'ravenous', 'silent', 'cosmic', 'abyss', 'serpent', 'moonlight'
    ];

    // Display the current list of words, or a message if it's empty
    const renderWords = () => {
        wordListContainer.innerHTML = '';
        if (wordList.length === 0) {
            wordListContainer.appendChild(emptyListMsg);
            emptyListMsg.classList.remove('hidden');
            generateStoryBtn.disabled = true;
        } else {
            emptyListMsg.classList.add('hidden');
            wordList.forEach((word, index) => {
                const tag = document.createElement('div');
                tag.className = 'word-tag';
                tag.innerHTML = `<span>${word}</span><button data-index="${index}">&times;</button>`;
                wordListContainer.appendChild(tag);
            });
            generateStoryBtn.disabled = false;
        }
    };

    // Add a word manually or via mystery word
    const addWord = (wordToAdd) => {
        const word = (wordToAdd || wordInput.value.trim()).toLowerCase();
        if (word && !word.includes(' ')) {
            if (!wordList.includes(word)) {
                wordList.push(word);
            }
            if (!wordToAdd) {
                wordInput.value = '';
            }
            renderWords();
        }
        wordInput.focus(); // Keep the input ready for more
    };

    // Adds a random word from the mystery list that hasn't been added yet
    const addMysteryWord = () => {
        const availableWords = mysteryWords.filter(w => !wordList.includes(w));
        if (availableWords.length === 0) {
            // A little reward for exhausting all the mystery
            mysteryWordBtn.textContent = 'All mysteries revealed!';
            setTimeout(() => {
                mysteryWordBtn.textContent = 'Need inspiration? Try a Mystery Word';
            }, 2000);
            return;
        }
        const randomIndex = Math.floor(Math.random() * availableWords.length);
        addWord(availableWords[randomIndex]);
    };

    // Remove a word when the user clicks the little X
    const handleWordListClick = (e) => {
        if (e.target.tagName === 'BUTTON') {
            const index = parseInt(e.target.dataset.index, 10);
            wordList.splice(index, 1);
            renderWords();
        }
    };

    // Reset everything and start from scratch
    const startOver = () => {
        wordList = [];
        wordInput.value = '';
        storyTitle.textContent = '';
        storyOutput.innerHTML = '';
        storyOutputSection.classList.add('hidden');
        renderWords();
        wordInput.focus();
    };

    // Simulate a typewriter effect with sound
    const typewriter = (text) => {
        return new Promise(resolve => {
            isTyping = true;
            storyOutput.innerHTML = '';
            storyOutputSection.classList.remove('hidden');

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = text;
            const plainText = tempDiv.textContent || tempDiv.innerText || "";

            let i = 0;

            // Typing sound starts — gives it that old-school vibe
            typeSound.currentTime = 0;
            typeSound.play().catch(e => console.error("Audio play failed:", e));

            function type() {
                if (i < plainText.length) {
                    storyOutput.innerHTML = text.substring(0, i + 1);
                    i++;
                    setTimeout(type, 35); // Just fast enough to feel dynamic
                } else {
                    storyOutput.innerHTML = text;
                    isTyping = false;
                    typeSound.pause();
                    typeSound.currentTime = 0;
                    resolve();
                }
            }

            type();
        });
    };

    // Sends the prompt to Gemini API and handles the returned story
    const generateStory = async () => {
        if (wordList.length === 0 || isTyping) return;

        // Disable UI during generation
        generateBtnText.classList.add('hidden');
        loader.classList.remove('hidden');
        generateStoryBtn.disabled = true;
        wordInput.disabled = true;
        addWordBtn.disabled = true;
        mysteryWordBtn.disabled = true;
        storyTitle.textContent = '';
        storyOutput.innerHTML = '';
        storyOutputSection.classList.add('hidden');

        // The prompt sent to the AI — clear and structured
        const selectedTone = toneSelector.value;
        const selectedLength = lengthSelector.value;
        const prompt = `You are a master storyteller. First, write a creative title for the story on a single line, like this: "Title: The Cosmic Teapot". Then, on a new line, write a ${selectedTone} story of about ${selectedLength}. You MUST creatively and naturally weave in all of the following words. When you use one of these words, you MUST wrap it in double curly braces, like this: {{word}}. The words are: ${wordList.join(', ')}.`;

        const payload = { prompt: prompt };
        const apiUrl = `/.netlify/functions/generate-story`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`API request failed with status ${response.status}`);

            const result = await response.json();
            const fullText = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (fullText) {
                const lines = fullText.split('\n');
                let title = 'A Story';
                let storyText = '';

                // Check if the first line is a proper title
                if (lines[0].toLowerCase().startsWith('title:')) {
                    title = lines[0].substring(7).trim();
                    storyText = lines.slice(1).join('\n').trim();
                } else {
                    storyText = fullText.trim();
                }

                storyTitle.textContent = title;

                // Highlight the words that were used from the list
                wordList.forEach(word => {
                    const regex = new RegExp(`\\{\\{${word}\\}\\}`, 'gi');
                    storyText = storyText.replace(regex, `<b><i>${word}</i></b>`);
                });

                await typewriter(storyText);
            } else {
                throw new Error("No story text found in the API response.");
            }

        } catch (error) {
            console.error("Error generating story:", error);
            storyTitle.textContent = 'An Error Occurred';
            storyOutput.textContent = `Sorry, something went wrong. Please try again. \n\nError: ${error.message}`;
            storyOutputSection.classList.remove('hidden');
        } finally {
            // Re-enable UI
            generateBtnText.classList.remove('hidden');
            loader.classList.add('hidden');
            generateStoryBtn.disabled = false;
            wordInput.disabled = false;
            addWordBtn.disabled = false;
            mysteryWordBtn.disabled = false;
        }
    };

    // Convert the story output into an image — great for sharing
    const downloadStoryAsImage = () => {
        html2canvas(storyOutputContainer, {
            backgroundColor: '#000000',
            scale: 2
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'ai-story.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    };

    // Copies the story text to clipboard
    const copyStoryToClipboard = () => {
        const title = storyTitle.innerText;
        const storyText = storyOutput.innerText;
        const fullStory = `${title}\n\n${storyText}`;
        navigator.clipboard.writeText(fullStory).then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = 'Copy Text';
            }, 2000);
        });
    };

    // Setup for typing sound
    let typeSound = new Audio('type.wav');
    typeSound.volume = 0.3;

    // Set up all button and input interactions
    addWordBtn.addEventListener('click', () => addWord());
    mysteryWordBtn.addEventListener('click', addMysteryWord);
    wordInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') addWord(); });
    wordListContainer.addEventListener('click', handleWordListClick);
    startOverBtn.addEventListener('click', startOver);
    generateStoryBtn.addEventListener('click', generateStory);
    downloadBtn.addEventListener('click', downloadStoryAsImage);
    copyBtn.addEventListener('click', copyStoryToClipboard);

    // Initial setup when the page loads
    renderWords();
    wordInput.focus();
});