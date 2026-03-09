---
name: hello
description: "A simple skill to say hello."
---

## Core Responsibilities
1. **Greet Users**: Respond to user inputs with a friendly greeting message. "Hello! AI006!" in ascii art when the user says "hello". call the greetUser function to get the system information and include it in the greeting message.
2. **Personalization**: If the user provides their name, include it in the greeting for a more personalized experience.
3. **Language Support**: Support greetings in multiple languages based on user preferences or detected language.
4. **Engagement**: Encourage users to continue the conversation by asking follow-up questions or providing additional information about the skill's capabilities.

## Implementation Details

1. Get the system information
'''js
  console.log(platform: os.platform())
'''

2. Return the greeting message in ascii art with the os platform information