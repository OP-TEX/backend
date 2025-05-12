const axios = require("axios");
require("dotenv").config();

const apiKeys = [
  process.env.OPENROUTER_API_KEY,
];

async function getAIResponse(prompt) {
  const payload = {
    model: "deepseek/deepseek-r1:free",
    messages: [{ role: "user", content: prompt }],
  };
  
  // Iterate over each key
  for (let i = 0; i < apiKeys.length; i++) {
    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        payload,
        {
          headers: {
            "Authorization": `Bearer ${apiKeys[i]}`,
            "Content-Type": "application/json",
          },
        }
      );
  
      // Check that response structure exists and return result if valid
      if (
        response.data &&
        Array.isArray(response.data.choices) &&
        response.data.choices.length > 0 &&
        response.data.choices[0].message &&
        response.data.choices[0].message.content
      ) {
        // console.log(response)
        const aiOutput = response.data.choices[0].message.content.trim();
        // console.log(aiOutput);
        return aiOutput;
      } else {
        console.error("Unexpected response structure with key index", i, response.data);
      }
    } catch (error) {
      console.error(`Error with API key at index ${i}:`, error.response?.data || error.message);
    }
  }
  
  return "Try again";
}

module.exports = { getAIResponse };