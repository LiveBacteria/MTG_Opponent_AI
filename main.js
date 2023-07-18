const express = require("express");

const { OpenAI } = require("langchain/llms/openai");
const { ChatOpenAI } = require("langchain/chat_models/openai");
const {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  MessagesPlaceholder,
  HumanMessagePromptTemplate,
} = require("langchain/prompts");
const {
  initializeAgentExecutorWithOptions,
  VectorStoreToolkit,
  createVectorStoreAgent,
  VectorStoreInfo,
} = require("langchain/agents");
const { ChainTool, DynamicTool } = require("langchain/tools");
// const { Calculator } = require("langchain/tools/calculator");
const {
  VectorDBQAChain,
  ConversationalRetrievalQAChain,
  ChatVectorDBQAChain,
  ConversationChain,
  LLMChain,
} = require("langchain/chains");
const { HNSWLib } = require("langchain/vectorstores/hnswlib");
const { OpenAIEmbeddings } = require("langchain/embeddings/openai");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { ChatMessageHistory } = require("langchain/memory");
const { HumanChatMessage, AIChatMessage } = require("langchain/schema");
const { BufferMemory } = require("langchain/memory");
const { Cards } = require("scryfall-api");
const cliProgress = require("cli-progress");

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const envPath = path.resolve(__dirname, "./.env");
dotenv.config({ path: envPath });
const openAIKey = process.env.OPENAI_API_KEY;

const model = new OpenAI({ temperature: 0.1, api_key: openAIKey });
let chatHistory = "";

async function main() {
  const decks = [];
  const decksPath = path.join(__dirname, "/decks");
  // Get deck txts from the directories decks/player/*.txt and decks/opponent/*.txt
  // Get array of file paths for player deck txts
  const playerDir = path.join(decksPath, "/player");
  const opponentDir = path.join(decksPath, "/opponent");

  const playerFiles = fs
    .readdirSync(playerDir)
    .filter((file) => file.endsWith(".txt"))
    .map((file) => path.join(playerDir, file));

  const opponentFiles = fs
    .readdirSync(opponentDir)
    .filter((file) => file.endsWith(".txt"))
    .map((file) => path.join(opponentDir, file));

  for (let file of playerFiles) {
    decks.push(fs.readFileSync(file, "utf8"));
  }

  for (let file of opponentFiles) {
    decks.push(fs.readFileSync(file, "utf8"));
  }

  // Player Deck
  const playerDeck = decks[0];

  // Opponent Deck
  const opponentDeck = decks[1];

  const rebuiltDecks = [];
  const allCards = new Map();

  for (let deck of decks) {
    // Deck cards array
    const deckCards = [];

    // Split deck string into lines
    const lines = deck.split("\n");

    for (let line of lines) {
      // Skip empty lines
      if (!line.trim()) continue;

      // Break out if sideboard reached
      if (line.includes("SIDEBOARD")) break;

      // Split line into count and name
      const cardArr = line.split(" ");
      const count = cardArr[0];
      const cardName = cardArr.slice(1).join(" ");

      // Remove '\n' from name
      // const cardName = name.replace("\n", "");

      // Add to all cards map
      if (!allCards.has(cardName)) {
        allCards.set(cardName, 0);
      }

      // Add card to deck
      for (let i = 0; i < parseInt(count); i++) {
        deckCards.push(cardName);
      }
    }

    // Add deck cards to rebuilt decks
    rebuiltDecks.push(deckCards);
  }
  //   console.log(rebuiltDecks);

  const bar1 = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic
  );

  bar1.start(allCards.size, 0);

  let text = "";

  // Update allCards Map with card descriptions from scryfall
  for (let card of allCards.keys()) {
    const cardInfo = await Cards.byName(card);
    allCards.set(card, cardInfo.oracle_text);
    text += card + ":" + cardInfo.oracle_text + "\n";
    bar1.increment();
  }
  bar1.stop();

  allCards.forEach((value, key) => {
    console.log(key, value);
  });

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
  });

  const docs = await textSplitter.createDocuments([text]);
  const vectorStore = await HNSWLib.fromDocuments(docs, new OpenAIEmbeddings());

  const chatChain = ConversationalRetrievalQAChain.fromLLM(
    model,
    vectorStore.asRetriever()
  );

  const tools = [new ChainTool(chatChain)];

  const executor = initializeAgentExecutorWithOptions({
    tools,
    model,
    memory: new BufferMemory(),
  });

  //  const response = await chatChain.call({
  //  question: `What is the best card in the deck? \nDeck: ${rebuiltDecks[0].map(
  //  (card) => card + "\n"
  // )}`,
  // chat_history: chatHistory,
  // });

  console.log(response.text);
  // gamePhase
  const gamePhase = {
    untap: "true",
    upkeep: "false",
    draw: "false",
    precombatMain: "false",
    combat: "false",
    postcombatMain: "false",
    end: "false",
  };

  // gameInfo
  const gameInfo = {
    turn: 0,
    currentTurn: "player",
    phase: gamePhase,
    player: {
      life: 40,
      hand: [],
      library: [],
      graveyard: [],
      exile: [],
      battlefield: [],
      commander: [],
      commandZone: [],
    },
    opponent: {
      life: 40,
      hand: [],
      library: [],
      graveyard: [],
      exile: [],
      battlefield: [],
      commander: [],
      commandZone: [],
    },
  };

  gameInfo.player.library = rebuiltDecks[0];
  gameInfo.player.hand = rebuiltDecks[0].shuffle().slice(0, 7);
  gameInfo.player.commander = rebuiltDecks[0].slice(0, 1);
  gameInfo.opponent.library = rebuiltDecks[1];
  gameInfo.opponent.hand = rebuiltDecks[1].shuffle().slice(0, 7);
  gameInfo.opponent.commander = rebuiltDecks[1].slice(0, 1);
  console.log(gameInfo);
}

main();
