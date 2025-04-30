const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadwrapper = promptForm.querySelector(".file-upload-wrapper");

//API Setup.
const API_KEY = "AIzaSyBbGaJoyKMAqMiqGm09DDmjKb489YV8DSU";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

let typingInterval, controller;
const userData = { message: "", file: {} };
const chatHistory = [];

// Function to create message elements.
const createMsgElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

// Scroll to the bottom of the container
const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

// Simulate typing effect for the bot responses.
const typingEffect = (text, textElement, botMsgDiv) => {
    textElement.textContent = "";
    const words = text.split(" ");
    let wordIndex = 0;

    // Set an interval to type each word.
    typingInterval = setInterval(() => {
        if (wordIndex < words.length) {
            textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
            scrollToBottom();
        } else{
            clearInterval(typingInterval);
            botMsgDiv.classList.remove("loading");
            document.body.classList.remove("bot-responsing");
        }
    }, 40);
}

// Make the API call and generate the bot's response
const generateResponse = async (botMsgDiv) => {
    const textElement = botMsgDiv.querySelector(".message-text");
    controller = new AbortController();

    //Add user message and file data to the chat history
    chatHistory.push({
        role: "user",
        parts: [{ text: userData.message }, ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file)}] : [])]
    });

    try {
        // Send the chat history to the API to get a response
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: chatHistory }),
            signal: controller.signal
        }); 

        const data = await response.json();
        if(!response.ok) throw new Error(data.error.message);

        //Process the response text and display with typing effect.
        const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
        typingEffect(responseText, textElement, botMsgDiv);

        chatHistory.push({role: "model",parts: [{ text: responseText }]});

        console.log(chatHistory);
    } catch (error) {
        console.log(error)
    } finally {
        userData.file = {};
    }
}

//handle the form submission.
const handleFormSubmit = (e) => {
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    if(!userMessage)return;

    promptInput.value = "";
    userData.message = userMessage;
    document.body.classList.add("bot-responsing");
    fileUploadwrapper.classList.remove("active", "img-attached", "file-attached");

    // Generate user message HTML and with optional file attachement
   const userMsgHTML = `
   <p class="message-text"></p>
   ${userData.file.data ? (userData.file.isImage ? `<img src ="data:${userData.file.mime_type};base64,${userData.file.data}"
   class="img-attachment" />` : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`) : ""}`;
     
   const userMsgDiv = createMsgElement(userMsgHTML, "user-message");

   userMsgDiv.querySelector(".message-text").textContent = userMessage;
   chatsContainer.appendChild(userMsgDiv);
   scrollToBottom();

   setTimeout(() => {
    // Generate bot message HTML and add in the chats container after 600ms
    const botMsgHTML = `<img src="gemini.svg" class="avatar"><p class="message-text">Just a sec...</p>`;
    const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
   }, 605);
}

// Handle file input change (file upload)
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if(!file) return;

    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
      fileInput.value = "";
      const base64String = e.target.result.split(",")[1];
      fileUploadwrapper.querySelector(".file-preview").src = e.target.result;
      fileUploadwrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

      // Store file data in UserData obj
      userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };
    }
});

// Cancel file upload
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
    userData.file = {};
    fileUploadwrapper.classList.remove("active", "img-attached", "file-attached");
});

// Stop ongoing bot response
document.querySelector("#stop-response-btn").addEventListener("click", () => {
    userData.file = {};
    controller?.abort();
    clearInterval(typingInterval);
    chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
    document.body.classList.remove("bot-responsing");
});

promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());