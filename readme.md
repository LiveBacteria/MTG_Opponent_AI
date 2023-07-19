# Magic: The Gathering Deck Simulator
This project implements a Magic: The Gathering deck battle simulator using LangChain and Node.js.

## Overview
The simulator allows users to:

Upload .txt decklists for two players
Initialize a game state with those decks
Simulate turns with bot agents playing cards
Enforce rules and validate actions with a judge agent
Determine a winner based on gameplay
It aims to realistically simulate an MTG battle using intelligent agents powered by language models via the LangChain framework.

## Usage
The simulator can be run with:

Copy code

node app.js
It will prompt for two .txt decklist files to import. Gameplay will automatically commence with bot players.

## Implementation
The core simulation logic is implemented via LangChain Agents and Chains.

PlayerAgent - Makes decisions on card plays and responses
JudgeAgent - Validates actions and enforces game rules
PlayTurnChain - Encapsulates logic to play a single turn
A GameState class tracks the state of the board, hands, etc using a LangChain Memory.

The implementation is documented in detail in src/.

## Next Steps
Future work could include:

More sophisticated bot decision making
User interface for human play
Multiplayer support
Animated visualization
Contributing
Contributions are welcome! Please open issues for feedback and PRs for improvements.
